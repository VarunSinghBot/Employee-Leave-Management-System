import type { Request } from "express";
import type { Prisma } from "@prisma/client";
import type { AuditAction } from "@elms/shared";
import prisma from "../db/prisma.db.js";

interface AuditInput {
  req: Request;
  action: AuditAction;
  entity: "User" | "LeaveRequest" | "LeaveDocument";
  entityId?: string;
  actorId?: string;
  subjectId?: string;
  details?: Prisma.InputJsonValue;
}

// Audit logging must never break the main request, so failures are only logged
export const recordAudit = async ({ req, action, entity, entityId, actorId, subjectId, details }: AuditInput) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        details,
        actorId: actorId ?? req.user?.id,
        subjectId: subjectId ?? actorId ?? req.user?.id,
        ipAddress: req.ip,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
};
