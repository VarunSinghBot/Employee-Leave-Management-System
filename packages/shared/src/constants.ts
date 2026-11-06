// Single source of truth for enums & business rules used by both backend and frontend.
// The enum values mirror the Prisma enums in apps/backend/prisma/schema.prisma.

export const ROLES = {
  EMPLOYEE: "EMPLOYEE",
  MANAGER: "MANAGER",
  HOD: "HOD",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

// Roles that can review (approve / reject) leave requests
export const REVIEWER_ROLES: Role[] = [ROLES.MANAGER, ROLES.HOD];

export const LEAVE_TYPES = {
  SICK: "SICK",
  CASUAL: "CASUAL",
  EARNED: "EARNED",
  UNPAID: "UNPAID",
} as const;
export type LeaveType = (typeof LEAVE_TYPES)[keyof typeof LEAVE_TYPES];

export const LEAVE_STATUS = {
  PENDING: "PENDING", // waiting for the manager
  PENDING_HOD: "PENDING_HOD", // manager approved, waiting for the HOD (> 3 days)
  INFO_REQUESTED: "INFO_REQUESTED", // reviewer asked the employee for more info
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;
export type LeaveStatus = (typeof LEAVE_STATUS)[keyof typeof LEAVE_STATUS];

// Statuses that still "hold" days against the balance
export const ACTIVE_STATUSES: LeaveStatus[] = [
  LEAVE_STATUS.PENDING,
  LEAVE_STATUS.PENDING_HOD,
  LEAVE_STATUS.INFO_REQUESTED,
  LEAVE_STATUS.APPROVED,
];
export const OPEN_STATUSES: LeaveStatus[] = [
  LEAVE_STATUS.PENDING,
  LEAVE_STATUS.PENDING_HOD,
  LEAVE_STATUS.INFO_REQUESTED,
];

export const COMMENT_KINDS = {
  NOTE: "NOTE",
  INFO_REQUEST: "INFO_REQUEST",
  INFO_RESPONSE: "INFO_RESPONSE",
  APPROVAL: "APPROVAL",
  REJECTION: "REJECTION",
  SYSTEM: "SYSTEM",
} as const;
export type CommentKind = (typeof COMMENT_KINDS)[keyof typeof COMMENT_KINDS];

export const REVIEW_ACTIONS = {
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  REQUEST_INFO: "REQUEST_INFO",
} as const;
export type ReviewAction = (typeof REVIEW_ACTIONS)[keyof typeof REVIEW_ACTIONS];

// Leave policy: null quota = unlimited (still tracked)
export interface LeavePolicy {
  label: string;
  description: string;
  yearly: number | null;
  monthly: number | null;
}

export const LEAVE_POLICY: Record<LeaveType, LeavePolicy> = {
  SICK: { label: "Sick Leave", description: "Illness or medical appointments", yearly: 12, monthly: 3 },
  CASUAL: { label: "Casual Leave", description: "Personal errands & short breaks", yearly: 12, monthly: 2 },
  EARNED: { label: "Earned Leave", description: "Paid vacation / planned time off", yearly: 18, monthly: null },
  UNPAID: { label: "Unpaid Leave", description: "Leave without pay", yearly: null, monthly: null },
};

// More than this many consecutive days -> document + manager AND HOD approval
export const CONSECUTIVE_DAYS_LIMIT = 3;
export const MAX_LEAVE_SPAN_DAYS = 30;

export const DOCUMENT_RULES = {
  maxFiles: 5,
  maxFileSizeMB: 5,
  allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg", "image/webp"],
  allowedExtensions: ".pdf,.png,.jpg,.jpeg,.webp",
} as const;

export const AUDIT_ACTIONS = {
  USER_REGISTERED: "USER_REGISTERED",
  USER_LOGIN: "USER_LOGIN",
  USER_LOGOUT: "USER_LOGOUT",
  LEAVE_CREATED: "LEAVE_CREATED",
  LEAVE_UPDATED: "LEAVE_UPDATED",
  LEAVE_CANCELLED: "LEAVE_CANCELLED",
  LEAVE_MANAGER_APPROVED: "LEAVE_MANAGER_APPROVED",
  LEAVE_APPROVED: "LEAVE_APPROVED",
  LEAVE_REJECTED: "LEAVE_REJECTED",
  LEAVE_INFO_REQUESTED: "LEAVE_INFO_REQUESTED",
  LEAVE_INFO_PROVIDED: "LEAVE_INFO_PROVIDED",
  DOCUMENT_VIEWED: "DOCUMENT_VIEWED",
  MANAGEMENT_ACCOUNT_CREATED: "MANAGEMENT_ACCOUNT_CREATED",
  EMPLOYEE_ASSIGNED: "EMPLOYEE_ASSIGNED",
} as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
