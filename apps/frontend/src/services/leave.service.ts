import type {
  AuditLogEntry,
  Leave,
  LeaveBalance,
  LeaveDetail,
  LeaveRequestInput,
  Paginated,
  ReviewInput,
  ReviewerStats,
} from "@elms/shared";
import { cleanParams, request } from "./api.service";

export interface LeaveFilterValues {
  status: string;
  type: string;
  from: string;
  to: string;
  search: string;
  year: string;
  page: number;
  limit: number;
}

// Leave forms are multipart because documents can be attached
const toFormData = (fields: Record<string, string>, files: File[]) => {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));
  files.forEach((file) => form.append("documents", file));
  return form;
};

export const leaveService = {
  mine: (filters: Partial<LeaveFilterValues>) => request.get<Paginated<Leave>>("/leaves", cleanParams(filters)),
  balance: (year: number, userId?: string) => request.get<LeaveBalance>("/leaves/balance", cleanParams({ year, userId })),
  get: (id: string) => request.get<LeaveDetail>(`/leaves/${id}`),
  apply: (input: LeaveRequestInput, files: File[]) => request.post<LeaveDetail>("/leaves", toFormData({ ...input }, files)),
  update: (id: string, input: LeaveRequestInput, files: File[]) =>
    request.patch<LeaveDetail>(`/leaves/${id}`, toFormData({ ...input }, files)),
  cancel: (id: string) => request.post<LeaveDetail>(`/leaves/${id}/cancel`),
  respond: (id: string, message: string, files: File[]) =>
    request.post<LeaveDetail>(`/leaves/${id}/respond`, toFormData({ message }, files)),
  document: (leaveId: string, documentId: string) => request.blob(`/leaves/${leaveId}/documents/${documentId}`),
};

export const approvalService = {
  pending: (filters: Partial<LeaveFilterValues>) =>
    request.get<Paginated<Leave>>("/approvals/pending", cleanParams(filters)),
  history: (filters: Partial<LeaveFilterValues>) =>
    request.get<Paginated<Leave>>("/approvals/history", cleanParams(filters)),
  stats: () => request.get<ReviewerStats>("/approvals/stats"),
  review: (id: string, body: ReviewInput) => request.post<LeaveDetail>(`/approvals/${id}/review`, body),
};

export const auditService = {
  list: (params: { action?: string; page: number; limit: number }) =>
    request.get<Paginated<AuditLogEntry>>("/audit", cleanParams(params)),
};
