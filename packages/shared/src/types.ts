// API payload shapes shared between backend responses and frontend consumers
import type { CommentKind, LeaveStatus, LeaveType, Role } from "./constants.js";

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiFailure {
  success: false;
  message: string;
  errors?: { field: string; message: string }[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface Department {
  id: string;
  name: string;
}

export interface ManagementUser extends UserSummary {
  managerId: string | null;
  reportsCount: number;
}

export interface ManagementOverview {
  managers: ManagementUser[];
  unassignedEmployees: ManagementUser[];
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthUser extends UserSummary {
  department: Department;
  manager: UserSummary | null;
}

export interface LeaveDocument {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface LeaveComment {
  id: string;
  kind: CommentKind;
  message: string;
  createdAt: string;
  author: UserSummary;
}

export interface Leave {
  id: string;
  employeeName: string;
  type: LeaveType;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  requiresHodApproval: boolean;
  managerComment: string | null;
  managerActionAt: string | null;
  hodComment: string | null;
  hodActionAt: string | null;
  createdAt: string;
  updatedAt: string;
  employee: UserSummary & { department: Department };
  manager: UserSummary | null;
  hod: UserSummary | null;
  _count?: { documents: number };
}

export interface LeavePermissions {
  canReview: boolean;
  canEdit: boolean;
  canCancel: boolean;
  canRespond: boolean;
}

export interface LeaveDetail extends Leave {
  documents: LeaveDocument[];
  comments: LeaveComment[];
  permissions: LeavePermissions;
}

export interface LeaveBalanceItem {
  type: LeaveType;
  label: string;
  yearlyQuota: number | null;
  monthlyQuota: number | null;
  takenYear: number;
  takenMonth: number;
  pending: number;
  remainingYear: number | null;
  remainingMonth: number | null;
}

export interface LeaveBalance {
  year: number;
  month: string;
  items: LeaveBalanceItem[];
  totals: { quota: number; taken: number; pending: number; remaining: number; takenMonth: number };
}

export interface ReviewerStats {
  awaitingMe: number;
  awaitingEmployee: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  onLeaveToday: number;
  teamSize: number;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  actor: UserSummary | null;
  subject: UserSummary | null;
}
