import type { Prisma } from "@prisma/client";
import {
  ACTIVE_STATUSES,
  LEAVE_POLICY,
  LEAVE_STATUS,
  LEAVE_TYPES,
  OPEN_STATUSES,
  ROLES,
  daysByMonth,
  daysInYear,
  todayKey,
  toDateKey,
  parseDateOnly,
  type LeaveBalance,
  type LeavePermissions,
  type LeaveQuery,
  type LeaveStatus,
  type LeaveType,
} from "@elms/shared";
import prisma from "../db/prisma.db.js";
import { LEAVE_DETAIL_INCLUDE } from "../constants.js";
import { ApiError } from "./ApiError.util.js";
import type { RequestUser } from "../middlewares/auth.middleware.js";

// ------------------------------------------------------------------ Filters

export const buildLeaveFilters = (query: Partial<LeaveQuery>): Prisma.LeaveRequestWhereInput => {
  const where: Prisma.LeaveRequestWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.type) where.type = query.type;

  // Date range: any leave that overlaps the requested window
  const and: Prisma.LeaveRequestWhereInput[] = [];
  if (query.from) and.push({ toDate: { gte: parseDateOnly(query.from) } });
  if (query.to) and.push({ fromDate: { lte: parseDateOnly(query.to) } });
  if (query.year) {
    and.push({ fromDate: { lte: parseDateOnly(`${query.year}-12-31`) } });
    and.push({ toDate: { gte: parseDateOnly(`${query.year}-01-01`) } });
  }
  if (query.search) {
    and.push({
      OR: [
        { reason: { contains: query.search, mode: "insensitive" } },
        { employee: { name: { contains: query.search, mode: "insensitive" } } },
      ],
    });
  }
  if (and.length) where.AND = and;
  return where;
};

// Which employees' leaves a reviewer can see
export const reviewScopeWhere = (user: RequestUser): Prisma.LeaveRequestWhereInput => {
  if (user.role === ROLES.HOD) {
    return { employee: { departmentId: user.departmentId }, employeeId: { not: user.id } };
  }
  if (user.role === ROLES.MANAGER) return { employee: { managerId: user.id } };
  return { id: "__none__" };
};

// Leaves that are waiting on this reviewer right now
export const actionableWhere = (user: RequestUser): Prisma.LeaveRequestWhereInput => {
  const asManager: Prisma.LeaveRequestWhereInput = {
    status: LEAVE_STATUS.PENDING,
    employee: { managerId: user.id },
  };
  if (user.role === ROLES.HOD) {
    return {
      OR: [
        asManager,
        { status: LEAVE_STATUS.PENDING_HOD, employee: { departmentId: user.departmentId }, employeeId: { not: user.id } },
      ],
    };
  }
  return asManager;
};

// ------------------------------------------------------------------ Permissions

interface LeaveForPermission {
  employeeId: string;
  status: LeaveStatus;
  fromDate: Date;
  managerActionAt: Date | null;
  employee: { managerId: string | null; departmentId: string };
}

export const canReviewLeave = (user: RequestUser, leave: LeaveForPermission) => {
  if (leave.employeeId === user.id) return false;
  if (leave.status === LEAVE_STATUS.PENDING) return leave.employee.managerId === user.id;
  if (leave.status === LEAVE_STATUS.PENDING_HOD) {
    return user.role === ROLES.HOD && leave.employee.departmentId === user.departmentId;
  }
  return false;
};

export const canViewLeave = (user: RequestUser, leave: LeaveForPermission) => {
  if (leave.employeeId === user.id) return true;
  if (user.role === ROLES.HOD) return leave.employee.departmentId === user.departmentId;
  if (user.role === ROLES.MANAGER) return leave.employee.managerId === user.id;
  return false;
};

export const getLeavePermissions = (user: RequestUser, leave: LeaveForPermission): LeavePermissions => {
  const isOwner = leave.employeeId === user.id;
  const isFutureApproved = leave.status === LEAVE_STATUS.APPROVED && toDateKey(leave.fromDate) > todayKey();
  return {
    canReview: canReviewLeave(user, leave),
    canEdit: isOwner && leave.status === LEAVE_STATUS.PENDING && !leave.managerActionAt,
    canCancel: isOwner && (OPEN_STATUSES.includes(leave.status) || isFutureApproved),
    canRespond: isOwner && leave.status === LEAVE_STATUS.INFO_REQUESTED,
  };
};

// Loads a leave with everything needed for permission checks, or throws 404/403
export const findAccessibleLeave = async (user: RequestUser, id: string) => {
  const leave = await prisma.leaveRequest.findUnique({ where: { id }, include: LEAVE_DETAIL_INCLUDE });
  if (!leave) throw ApiError.notFound("This leave request does not exist or was removed");
  if (!canViewLeave(user, leave)) throw ApiError.forbidden("You are not allowed to view this leave request");
  return leave;
};

// ------------------------------------------------------------------ Approvers

// Department's manager, falling back to its HOD (never the user themself)
export const findDepartmentApprover = async (departmentId: string, excludeUserId?: string) => {
  const where = (role: typeof ROLES.MANAGER | typeof ROLES.HOD) => ({
    departmentId,
    role,
    id: excludeUserId ? { not: excludeUserId } : undefined,
  });
  return (
    (await prisma.user.findFirst({ where: where(ROLES.MANAGER), select: { id: true } })) ??
    (await prisma.user.findFirst({ where: where(ROLES.HOD), select: { id: true } }))
  );
};

// Accounts created before their department had a manager get one assigned on their next request
export const ensureApprover = async (user: RequestUser) => {
  if (user.managerId) return user.managerId;

  if (user.role === ROLES.HOD) {
    throw ApiError.badRequest("Heads of department are at the top of the approval chain, so there is no one to approve your leave");
  }
  // A manager's leave goes to the HOD; an employee's to the manager (or HOD)
  const approver =
    user.role === ROLES.MANAGER
      ? await prisma.user.findFirst({ where: { departmentId: user.departmentId, role: ROLES.HOD }, select: { id: true } })
      : await findDepartmentApprover(user.departmentId, user.id);
  if (!approver) {
    throw ApiError.badRequest("Your department has no manager or HOD yet, so there is no one to approve your leave. Please contact HR");
  }

  await prisma.user.update({ where: { id: user.id }, data: { managerId: approver.id } });
  user.managerId = approver.id;
  return approver.id;
};

// ------------------------------------------------------------------ Validation rules

export const assertNoOverlap = async (employeeId: string, from: Date, to: Date, excludeId?: string) => {
  const clash = await prisma.leaveRequest.findFirst({
    where: {
      employeeId,
      id: excludeId ? { not: excludeId } : undefined,
      status: { in: ACTIVE_STATUSES },
      fromDate: { lte: to },
      toDate: { gte: from },
    },
    select: { fromDate: true, toDate: true, status: true },
  });
  if (clash) {
    throw ApiError.conflict(
      `These dates overlap with another request (${toDateKey(clash.fromDate)} to ${toDateKey(clash.toDate)}, ${clash.status.replace("_", " ").toLowerCase()})`,
    );
  }
};

// Ensures the request fits within yearly and monthly quotas (pending requests count as used)
export const assertBalanceAvailable = async (
  employeeId: string,
  type: LeaveType,
  from: Date,
  to: Date,
  excludeId?: string,
) => {
  const policy = LEAVE_POLICY[type];
  if (policy.yearly === null && policy.monthly === null) return;

  const existing = await prisma.leaveRequest.findMany({
    where: { employeeId, type, status: { in: ACTIVE_STATUSES }, id: excludeId ? { not: excludeId } : undefined },
    select: { fromDate: true, toDate: true },
  });

  const used: Record<string, number> = {};
  for (const leave of existing) {
    for (const [month, days] of Object.entries(daysByMonth(leave.fromDate, leave.toDate))) {
      used[month] = (used[month] ?? 0) + days;
    }
  }

  const requested = daysByMonth(from, to);
  const years = new Set(Object.keys(requested).map((m) => m.slice(0, 4)));

  for (const year of years) {
    if (policy.yearly === null) break;
    const usedYear = Object.entries(used).filter(([m]) => m.startsWith(year)).reduce((s, [, d]) => s + d, 0);
    const wantYear = Object.entries(requested).filter(([m]) => m.startsWith(year)).reduce((s, [, d]) => s + d, 0);
    if (usedYear + wantYear > policy.yearly) {
      const left = Math.max(0, policy.yearly - usedYear);
      throw ApiError.badRequest(
        `Not enough ${policy.label.toLowerCase()} balance for ${year}: you have ${left} day(s) left but requested ${wantYear}`,
      );
    }
  }

  if (policy.monthly !== null) {
    for (const [month, want] of Object.entries(requested)) {
      const usedMonth = used[month] ?? 0;
      if (usedMonth + want > policy.monthly) {
        const left = Math.max(0, policy.monthly - usedMonth);
        throw ApiError.badRequest(
          `${policy.label} is limited to ${policy.monthly} day(s) per month. For ${month} you have ${left} day(s) left`,
        );
      }
    }
  }
};

// ------------------------------------------------------------------ Balance

export const getLeaveBalance = async (employeeId: string, year: number): Promise<LeaveBalance> => {
  const month = todayKey().slice(0, 7);
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: { in: ACTIVE_STATUSES },
      fromDate: { lte: parseDateOnly(`${year}-12-31`) },
      toDate: { gte: parseDateOnly(`${year}-01-01`) },
    },
    select: { type: true, status: true, fromDate: true, toDate: true },
  });

  const items = Object.values(LEAVE_TYPES).map((type) => {
    const policy = LEAVE_POLICY[type];
    let takenYear = 0;
    let takenMonth = 0;
    let pending = 0;
    for (const leave of leaves.filter((l) => l.type === type)) {
      const days = daysInYear(leave.fromDate, leave.toDate, year);
      if (leave.status === LEAVE_STATUS.APPROVED) {
        takenYear += days;
        takenMonth += daysByMonth(leave.fromDate, leave.toDate)[month] ?? 0;
      } else {
        pending += days;
      }
    }
    return {
      type,
      label: policy.label,
      yearlyQuota: policy.yearly,
      monthlyQuota: policy.monthly,
      takenYear,
      takenMonth,
      pending,
      remainingYear: policy.yearly === null ? null : Math.max(0, policy.yearly - takenYear - pending),
      remainingMonth: policy.monthly === null ? null : Math.max(0, policy.monthly - takenMonth),
    };
  });

  const quotaItems = items.filter((i) => i.yearlyQuota !== null);
  return {
    year,
    month,
    items,
    totals: {
      quota: quotaItems.reduce((s, i) => s + (i.yearlyQuota ?? 0), 0),
      taken: items.reduce((s, i) => s + i.takenYear, 0),
      pending: items.reduce((s, i) => s + i.pending, 0),
      remaining: quotaItems.reduce((s, i) => s + (i.remainingYear ?? 0), 0),
      takenMonth: items.reduce((s, i) => s + i.takenMonth, 0),
    },
  };
};

// Adds the "employeeName" field from the assignment's leave JSON shape
export const serializeLeave = <T extends { employee: { name: string } }>(leave: T) => ({
  ...leave,
  employeeName: leave.employee.name,
});
