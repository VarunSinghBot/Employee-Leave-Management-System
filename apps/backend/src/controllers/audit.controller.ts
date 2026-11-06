import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { ROLES } from "@elms/shared";
import prisma from "../db/prisma.db.js";
import { USER_SUMMARY_SELECT } from "../constants.js";
import { currentUser, type RequestUser } from "../middlewares/auth.middleware.js";
import { sendResponse } from "../utils/ApiResponse.util.js";
import { paginate, toPaginated } from "../utils/pagination.util.js";

const auditQuerySchema = z.object({
  action: z.string().trim().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Employees see their own trail, managers their reports', HODs the whole department
const auditScope = (user: RequestUser): Prisma.AuditLogWhereInput => {
  if (user.role === ROLES.HOD) return { subject: { departmentId: user.departmentId } };
  if (user.role === ROLES.MANAGER) return { subject: { OR: [{ id: user.id }, { managerId: user.id }] } };
  return { subjectId: user.id };
};

export const getAuditLogs = async (req: Request, res: Response) => {
  const user = currentUser(req);
  const query = auditQuerySchema.parse(req.query);
  const where: Prisma.AuditLogWhereInput = { ...auditScope(user), ...(query.action ? { action: query.action } : {}) };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: USER_SUMMARY_SELECT }, subject: { select: USER_SUMMARY_SELECT } },
      orderBy: { createdAt: "desc" },
      ...paginate(query.page, query.limit),
    }),
    prisma.auditLog.count({ where }),
  ]);

  sendResponse(res, 200, "Audit logs fetched", toPaginated(items, total, query.page, query.limit));
};
