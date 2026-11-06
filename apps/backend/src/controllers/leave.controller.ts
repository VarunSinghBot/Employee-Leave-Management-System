import type { Request, Response } from "express";
import { z } from "zod";
import {
  AUDIT_ACTIONS,
  COMMENT_KINDS,
  LEAVE_STATUS,
  REVIEWER_ROLES,
  ROLES,
  countLeaveDays,
  infoResponseSchema,
  leaveQuerySchema,
  leaveRequestSchema,
  parseDateOnly,
  requiresHodApproval,
  type LeaveRequestInput,
} from "@elms/shared";
import prisma from "../db/prisma.db.js";
import { LEAVE_LIST_INCLUDE } from "../constants.js";
import { currentUser, type RequestUser } from "../middlewares/auth.middleware.js";
import { ApiError } from "../utils/ApiError.util.js";
import { sendResponse } from "../utils/ApiResponse.util.js";
import { recordAudit } from "../utils/audit.util.js";
import { getUploadedFiles, resolveStoredFile, toDocumentRows } from "../utils/file.util.js";
import {
  assertBalanceAvailable,
  assertNoOverlap,
  buildLeaveFilters,
  findAccessibleLeave,
  getLeaveBalance,
  getLeavePermissions,
  serializeLeave,
} from "../utils/leave.util.js";
import { paginate, toPaginated } from "../utils/pagination.util.js";

const balanceQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).default(new Date().getFullYear()),
  userId: z.string().optional(),
});

const documentRequiredError = () =>
  new ApiError(422, "Leaves longer than 3 consecutive days need a supporting document", [
    { field: "documents", message: "Please attach at least one supporting document" },
  ]);

// Shared validation for create & update: dates, overlap, balance, documents
const validateLeaveInput = async (
  user: RequestUser,
  input: LeaveRequestInput,
  documentCount: number,
  excludeId?: string,
) => {
  const from = parseDateOnly(input.fromDate);
  const to = parseDateOnly(input.toDate);
  const needsHod = requiresHodApproval(input.fromDate, input.toDate);
  if (needsHod && documentCount === 0) throw documentRequiredError();

  await assertNoOverlap(user.id, from, to, excludeId);
  await assertBalanceAvailable(user.id, input.type, from, to, excludeId);

  return { from, to, days: countLeaveDays(from, to), needsHod };
};

const sendLeaveDetail = async (req: Request, res: Response, id: string, statusCode: number, message: string) => {
  const user = currentUser(req);
  const leave = await findAccessibleLeave(user, id);
  sendResponse(res, statusCode, message, { ...serializeLeave(leave), permissions: getLeavePermissions(user, leave) });
};

// ------------------------------------------------------------------ Handlers

export const getMyLeaves = async (req: Request, res: Response) => {
  const user = currentUser(req);
  const query = leaveQuerySchema.parse(req.query);
  const where = { ...buildLeaveFilters(query), employeeId: user.id };

  const [items, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: LEAVE_LIST_INCLUDE,
      orderBy: { createdAt: "desc" },
      ...paginate(query.page, query.limit),
    }),
    prisma.leaveRequest.count({ where }),
  ]);
  sendResponse(res, 200, "Leaves fetched", toPaginated(items.map(serializeLeave), total, query.page, query.limit));
};

export const getBalance = async (req: Request, res: Response) => {
  const user = currentUser(req);
  const { year, userId } = balanceQuerySchema.parse(req.query);
  const targetId = userId ?? user.id;

  // Reviewers may look at the balance of someone in their team
  if (targetId !== user.id) {
    if (!REVIEWER_ROLES.includes(user.role)) throw ApiError.forbidden();
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { managerId: true, departmentId: true } });
    const inScope =
      target &&
      (user.role === ROLES.HOD ? target.departmentId === user.departmentId : target.managerId === user.id);
    if (!inScope) throw ApiError.forbidden("This employee is not part of your team");
  }

  sendResponse(res, 200, "Leave balance fetched", await getLeaveBalance(targetId, year));
};

export const applyLeave = async (req: Request, res: Response) => {
  const user = currentUser(req);
  const files = getUploadedFiles(req);
  const input = leaveRequestSchema.parse(req.body);

  if (!user.managerId) {
    throw ApiError.badRequest("No approver is assigned to your account yet. Please contact HR");
  }

  const { from, to, days, needsHod } = await validateLeaveInput(user, input, files.length);

  const leave = await prisma.leaveRequest.create({
    data: {
      employeeId: user.id,
      type: input.type,
      fromDate: from,
      toDate: to,
      days,
      reason: input.reason,
      requiresHodApproval: needsHod,
      documents: { create: toDocumentRows(files, user.id) },
      comments: {
        create: {
          authorId: user.id,
          kind: COMMENT_KINDS.SYSTEM,
          message: needsHod
            ? `Request submitted for ${days} days. Requires manager and HOD approval.`
            : `Request submitted for ${days} day(s).`,
        },
      },
    },
    select: { id: true },
  });

  await recordAudit({
    req,
    action: AUDIT_ACTIONS.LEAVE_CREATED,
    entity: "LeaveRequest",
    entityId: leave.id,
    details: { type: input.type, fromDate: input.fromDate, toDate: input.toDate, days, documents: files.length },
  });

  await sendLeaveDetail(req, res, leave.id, 201, "Leave request submitted successfully");
};

export const getLeaveById = async (req: Request, res: Response) => {
  await sendLeaveDetail(req, res, String(req.params.id), 200, "Leave request fetched");
};

export const updateLeave = async (req: Request, res: Response) => {
  const user = currentUser(req);
  const files = getUploadedFiles(req);
  const leave = await findAccessibleLeave(user, String(req.params.id));
  if (!getLeavePermissions(user, leave).canEdit) {
    throw ApiError.forbidden("Only pending requests that haven't been reviewed yet can be edited");
  }

  const input = leaveRequestSchema.parse(req.body);
  const { from, to, days, needsHod } = await validateLeaveInput(
    user,
    input,
    leave.documents.length + files.length,
    leave.id,
  );

  await prisma.$transaction([
    prisma.leaveRequest.update({
      where: { id: leave.id },
      data: {
        type: input.type,
        fromDate: from,
        toDate: to,
        days,
        reason: input.reason,
        requiresHodApproval: needsHod,
        documents: { create: toDocumentRows(files, user.id) },
      },
    }),
    prisma.leaveComment.create({
      data: { leaveId: leave.id, authorId: user.id, kind: COMMENT_KINDS.SYSTEM, message: "Request details were updated." },
    }),
  ]);

  await recordAudit({
    req,
    action: AUDIT_ACTIONS.LEAVE_UPDATED,
    entity: "LeaveRequest",
    entityId: leave.id,
    details: { type: input.type, fromDate: input.fromDate, toDate: input.toDate, days, newDocuments: files.length },
  });

  await sendLeaveDetail(req, res, leave.id, 200, "Leave request updated");
};

export const cancelLeave = async (req: Request, res: Response) => {
  const user = currentUser(req);
  const leave = await findAccessibleLeave(user, String(req.params.id));
  if (!getLeavePermissions(user, leave).canCancel) {
    throw ApiError.forbidden("This request can no longer be cancelled");
  }

  await prisma.$transaction([
    prisma.leaveRequest.update({ where: { id: leave.id }, data: { status: LEAVE_STATUS.CANCELLED } }),
    prisma.leaveComment.create({
      data: { leaveId: leave.id, authorId: user.id, kind: COMMENT_KINDS.SYSTEM, message: "Request was cancelled by the employee." },
    }),
  ]);

  await recordAudit({
    req,
    action: AUDIT_ACTIONS.LEAVE_CANCELLED,
    entity: "LeaveRequest",
    entityId: leave.id,
    details: { previousStatus: leave.status },
  });

  await sendLeaveDetail(req, res, leave.id, 200, "Leave request cancelled");
};

// Employee answers an "ask for more information" request, optionally with new documents
export const respondToInfoRequest = async (req: Request, res: Response) => {
  const user = currentUser(req);
  const files = getUploadedFiles(req);
  const leave = await findAccessibleLeave(user, String(req.params.id));
  if (!getLeavePermissions(user, leave).canRespond) {
    throw ApiError.forbidden("No information has been requested for this leave");
  }

  const { message } = infoResponseSchema.parse(req.body);
  // Return the request to whichever stage asked for information
  const nextStatus = leave.managerActionAt ? LEAVE_STATUS.PENDING_HOD : LEAVE_STATUS.PENDING;

  await prisma.$transaction([
    prisma.leaveRequest.update({
      where: { id: leave.id },
      data: { status: nextStatus, documents: { create: toDocumentRows(files, user.id) } },
    }),
    prisma.leaveComment.create({
      data: { leaveId: leave.id, authorId: user.id, kind: COMMENT_KINDS.INFO_RESPONSE, message },
    }),
  ]);

  await recordAudit({
    req,
    action: AUDIT_ACTIONS.LEAVE_INFO_PROVIDED,
    entity: "LeaveRequest",
    entityId: leave.id,
    details: { newDocuments: files.length },
  });

  await sendLeaveDetail(req, res, leave.id, 200, "Information sent to your approver");
};

export const viewDocument = async (req: Request, res: Response) => {
  const user = currentUser(req);
  const leave = await findAccessibleLeave(user, String(req.params.id));
  const document = await prisma.leaveDocument.findFirst({
    where: { id: String(req.params.documentId), leaveId: leave.id },
  });
  if (!document) throw ApiError.notFound("This document does not exist");

  await recordAudit({
    req,
    action: AUDIT_ACTIONS.DOCUMENT_VIEWED,
    entity: "LeaveDocument",
    entityId: document.id,
    subjectId: leave.employeeId,
    details: { leaveId: leave.id, fileName: document.originalName },
  });

  res.setHeader("Content-Type", document.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(document.originalName)}"`);
  res.sendFile(resolveStoredFile(document.storedName), (err) => {
    if (err && !res.headersSent) res.status(404).json({ success: false, message: "The file could not be found on the server" });
  });
};
