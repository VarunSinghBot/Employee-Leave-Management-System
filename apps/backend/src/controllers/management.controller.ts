import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { AUDIT_ACTIONS, ROLES, assignmentSchema, managementAccountSchema } from "@elms/shared";
import prisma from "../db/prisma.db.js";
import { BCRYPT_SALT_ROUNDS } from "../constants.js";
import { currentUser } from "../middlewares/auth.middleware.js";
import { ApiError } from "../utils/ApiError.util.js";
import { sendResponse } from "../utils/ApiResponse.util.js";
import { recordAudit } from "../utils/audit.util.js";

const managementUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  managerId: true,
  _count: { select: { reports: true } },
} as const;

const departmentScope = (departmentId: string) => ({ departmentId });

export const getManagementOverview = async (req: Request, res: Response) => {
  const user = currentUser(req);
  const [managers, unassignedEmployees] = await Promise.all([
    prisma.user.findMany({
      where: { ...departmentScope(user.departmentId), role: ROLES.MANAGER },
      select: managementUserSelect,
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { ...departmentScope(user.departmentId), role: ROLES.EMPLOYEE, managerId: null },
      select: managementUserSelect,
      orderBy: { name: "asc" },
    }),
  ]);

  sendResponse(res, 200, "Department management data fetched", {
    managers: managers.map(({ _count, ...employee }) => ({ ...employee, reportsCount: _count.reports })),
    unassignedEmployees: unassignedEmployees.map(({ _count, ...employee }) => ({ ...employee, reportsCount: _count.reports })),
  });
};

export const createManagementAccount = async (req: Request, res: Response) => {
  const user = currentUser(req);
  const input = managementAccountSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw ApiError.conflict("An account with this email already exists");

  const created = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS),
      role: input.role,
      departmentId: user.departmentId,
      managerId: input.role === ROLES.MANAGER ? user.id : null,
    },
    select: managementUserSelect,
  });

  await recordAudit({
    req,
    action: AUDIT_ACTIONS.MANAGEMENT_ACCOUNT_CREATED,
    entity: "User",
    entityId: created.id,
    actorId: user.id,
    subjectId: created.id,
    details: { role: input.role, departmentId: user.departmentId },
  });

  const { _count, ...account } = created;
  sendResponse(res, 201, `${input.role === ROLES.HOD ? "HOD" : "Manager"} account created`, {
    ...account,
    reportsCount: _count.reports,
  });
};

export const assignEmployee = async (req: Request, res: Response) => {
  const user = currentUser(req);
  const input = assignmentSchema.parse(req.body);
  const [employee, manager] = await Promise.all([
    prisma.user.findFirst({
      where: { id: input.employeeId, ...departmentScope(user.departmentId), role: ROLES.EMPLOYEE },
      select: { id: true, name: true, managerId: true },
    }),
    prisma.user.findFirst({
      where: { id: input.managerId, ...departmentScope(user.departmentId), role: ROLES.MANAGER },
      select: { id: true, name: true },
    }),
  ]);
  if (!employee) throw ApiError.notFound("This employee is not in your department");
  if (!manager) throw ApiError.badRequest("Choose a manager from your department");

  const updated = await prisma.user.update({
    where: { id: employee.id },
    data: { managerId: manager.id },
    select: managementUserSelect,
  });

  await recordAudit({
    req,
    action: AUDIT_ACTIONS.EMPLOYEE_ASSIGNED,
    entity: "User",
    entityId: employee.id,
    actorId: user.id,
    subjectId: employee.id,
    details: { managerId: manager.id, previousManagerId: employee.managerId },
  });

  const { _count, ...account } = updated;
  sendResponse(res, 200, `${employee.name} is now assigned to ${manager.name}`, {
    ...account,
    reportsCount: _count.reports,
  });
};
