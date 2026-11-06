import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import {
  AUDIT_ACTIONS,
  COMMENT_KINDS,
  LEAVE_STATUS,
  REVIEW_ACTIONS,
  ROLES,
  leaveQuerySchema,
  parseDateOnly,
  reviewSchema,
  todayKey,
  type AuditAction,
  type CommentKind,
} from "@elms/shared";
import prisma from "../db/prisma.db.js";
import { LEAVE_LIST_INCLUDE } from "../constants.js";
import { currentUser } from "../middlewares/auth.middleware.js";
import { ApiError } from "../utils/ApiError.util.js";
import { sendResponse } from "../utils/ApiResponse.util.js";
import { recordAudit } from "../utils/audit.util.js";
import {
  actionableWhere,
  buildLeaveFilters,
  canReviewLeave,
  findAccessibleLeave,
  getLeavePermissions,
  reviewScopeWhere,
  serializeLeave,
} from "../utils/leave.util.js";
import { paginate, toPaginated } from "../utils/pagination.util.js";

const listLeaves = async (req: Request, res: Response, scope: Prisma.LeaveRequestWhereInput, message: string) => {
  const query = leaveQuerySchema.parse(req.query);
  const where: Prisma.LeaveRequestWhereInput = { AND: [scope, buildLeaveFilters(query)] };
  const [items, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: LEAVE_LIST_INCLUDE,
      orderBy: [{ fromDate: "asc" }, { createdAt: "asc" }],
      ...paginate(query.page, query.limit),
    }),
    prisma.leaveRequest.count({ where }),
  ]);
  sendResponse(res, 200, message, toPaginated(items.map(serializeLeave), total, query.page, query.limit));
};

// Requests currently waiting on this reviewer
export const getPendingApprovals = async (req: Request, res: Response) => {
  await listLeaves(req, res, actionableWhere(currentUser(req)), "Pending approvals fetched");
};

// Every request from the reviewer's team (any status)
export const getTeamHistory = async (req: Request, res: Response) => {
  await listLeaves(req, res, reviewScopeWhere(currentUser(req)), "Team leave history fetched");
};

export const getReviewerStats = async (req: Request, res: Response) => {
  const user = currentUser(req);
  const scope = reviewScopeWhere(user);
  const today = parseDateOnly(todayKey());
  const monthStart = parseDateOnly(`${todayKey().slice(0, 7)}-01`);

  const count = (where: Prisma.LeaveRequestWhereInput) => prisma.leaveRequest.count({ where: { AND: [scope, where] } });

  const [awaitingMe, awaitingEmployee, approvedThisMonth, rejectedThisMonth, onLeaveToday, teamSize] = await Promise.all([
    prisma.leaveRequest.count({ where: actionableWhere(user) }),
    count({ status: LEAVE_STATUS.INFO_REQUESTED }),
    count({ status: LEAVE_STATUS.APPROVED, updatedAt: { gte: monthStart } }),
    count({ status: LEAVE_STATUS.REJECTED, updatedAt: { gte: monthStart } }),
    count({ status: LEAVE_STATUS.APPROVED, fromDate: { lte: today }, toDate: { gte: today } }),
    prisma.user.count({
      where: user.role === ROLES.HOD ? { departmentId: user.departmentId, id: { not: user.id } } : { managerId: user.id },
    }),
  ]);

  sendResponse(res, 200, "Stats fetched", {
    awaitingMe,
    awaitingEmployee,
    approvedThisMonth,
    rejectedThisMonth,
    onLeaveToday,
    teamSize,
  });
};

// Approve / reject / ask for more info. Leaves > 3 days go manager -> HOD.
export const reviewLeave = async (req: Request, res: Response) => {
  const user = currentUser(req);
  const leave = await findAccessibleLeave(user, String(req.params.id));
  if (!canReviewLeave(user, leave)) {
    throw ApiError.forbidden("This request is not awaiting your review anymore");
  }

  const { action, comment } = reviewSchema.parse(req.body);
  const now = new Date();
  const isManagerStage = leave.status === LEAVE_STATUS.PENDING;
  const stageFields = isManagerStage
    ? { managerId: user.id, managerComment: comment || null, managerActionAt: now }
    : { hodId: user.id, hodComment: comment || null, hodActionAt: now };

  let data: Prisma.LeaveRequestUncheckedUpdateInput;
  let auditAction: AuditAction;
  let commentKind: CommentKind;
  let message: string;

  if (action === REVIEW_ACTIONS.APPROVE) {
    // An HOD who is also the direct manager covers both approvals at once
    const needsHod = isManagerStage && leave.requiresHodApproval && user.role !== ROLES.HOD;
    data = { ...stageFields, status: needsHod ? LEAVE_STATUS.PENDING_HOD : LEAVE_STATUS.APPROVED };
    if (isManagerStage && leave.requiresHodApproval && !needsHod) {
      Object.assign(data, { hodId: user.id, hodComment: comment || null, hodActionAt: now });
    }
    auditAction = needsHod ? AUDIT_ACTIONS.LEAVE_MANAGER_APPROVED : AUDIT_ACTIONS.LEAVE_APPROVED;
    commentKind = COMMENT_KINDS.APPROVAL;
    message = needsHod ? "Approved and forwarded to the HOD for final approval" : "Leave request approved";
  } else if (action === REVIEW_ACTIONS.REJECT) {
    data = { ...stageFields, status: LEAVE_STATUS.REJECTED };
    auditAction = AUDIT_ACTIONS.LEAVE_REJECTED;
    commentKind = COMMENT_KINDS.REJECTION;
    message = "Leave request rejected";
  } else {
    data = { status: LEAVE_STATUS.INFO_REQUESTED };
    auditAction = AUDIT_ACTIONS.LEAVE_INFO_REQUESTED;
    commentKind = COMMENT_KINDS.INFO_REQUEST;
    message = "More information requested from the employee";
  }

  const defaultNote = action === REVIEW_ACTIONS.APPROVE ? "Approved." : "";
  await prisma.$transaction([
    prisma.leaveRequest.update({ where: { id: leave.id }, data }),
    prisma.leaveComment.create({
      data: { leaveId: leave.id, authorId: user.id, kind: commentKind, message: comment || defaultNote },
    }),
  ]);

  await recordAudit({
    req,
    action: auditAction,
    entity: "LeaveRequest",
    entityId: leave.id,
    subjectId: leave.employeeId,
    details: { stage: isManagerStage ? "MANAGER" : "HOD", previousStatus: leave.status, newStatus: data.status as string, comment },
  });

  const updated = await findAccessibleLeave(user, leave.id);
  sendResponse(res, 200, message, { ...serializeLeave(updated), permissions: getLeavePermissions(user, updated) });
};
