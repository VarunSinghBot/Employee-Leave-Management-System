import {
  CalendarPlus,
  ClipboardCheck,
  FileClock,
  History,
  LayoutDashboard,
  ScrollText,
  type LucideIcon,
  Thermometer,
  Coffee,
  Plane,
  Wallet,
} from "lucide-react";
import { REVIEWER_ROLES, ROLES, type LeaveStatus, type LeaveType, type Role } from "@elms/shared";

// Colour coding: every status / leave type has a fixed palette used across the app
export const STATUS_META: Record<LeaveStatus, { label: string; badge: string; dot: string }> = {
  PENDING: { label: "Pending manager", badge: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  PENDING_HOD: { label: "Pending HOD", badge: "bg-violet-50 text-violet-700 ring-violet-200", dot: "bg-violet-500" },
  INFO_REQUESTED: { label: "Info requested", badge: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" },
  APPROVED: { label: "Approved", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  REJECTED: { label: "Rejected", badge: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  CANCELLED: { label: "Cancelled", badge: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
};

export const TYPE_META: Record<LeaveType, { badge: string; glow: string; accent: string; bar: string; icon: LucideIcon }> = {
  SICK: { badge: "bg-rose-50 text-rose-700", glow: "glow-rose", accent: "text-rose-500", bar: "bg-rose-400", icon: Thermometer },
  CASUAL: { badge: "bg-sky-50 text-sky-700", glow: "glow-sky", accent: "text-sky-500", bar: "bg-sky-400", icon: Coffee },
  EARNED: { badge: "bg-violet-50 text-violet-700", glow: "glow-violet", accent: "text-violet-500", bar: "bg-violet-400", icon: Plane },
  UNPAID: { badge: "bg-orange-50 text-orange-700", glow: "glow-amber", accent: "text-orange-500", bar: "bg-orange-400", icon: Wallet },
};

export const ROLE_LABEL: Record<Role, string> = {
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  HOD: "Head of Department",
};

export const AUDIT_ACTION_META: Record<string, { label: string; tone: string }> = {
  USER_REGISTERED: { label: "Registered", tone: "bg-slate-100 text-slate-700" },
  USER_LOGIN: { label: "Signed in", tone: "bg-slate-100 text-slate-700" },
  USER_LOGOUT: { label: "Signed out", tone: "bg-slate-100 text-slate-700" },
  LEAVE_CREATED: { label: "Leave applied", tone: "bg-sky-50 text-sky-700" },
  LEAVE_UPDATED: { label: "Leave edited", tone: "bg-sky-50 text-sky-700" },
  LEAVE_CANCELLED: { label: "Leave cancelled", tone: "bg-slate-100 text-slate-600" },
  LEAVE_MANAGER_APPROVED: { label: "Manager approved", tone: "bg-violet-50 text-violet-700" },
  LEAVE_APPROVED: { label: "Leave approved", tone: "bg-emerald-50 text-emerald-700" },
  LEAVE_REJECTED: { label: "Leave rejected", tone: "bg-rose-50 text-rose-700" },
  LEAVE_INFO_REQUESTED: { label: "Info requested", tone: "bg-amber-50 text-amber-700" },
  LEAVE_INFO_PROVIDED: { label: "Info provided", tone: "bg-amber-50 text-amber-700" },
  DOCUMENT_VIEWED: { label: "Document viewed", tone: "bg-indigo-50 text-indigo-700" },
};

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  roles?: Role[];
}

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "My leaves",
    items: [
      { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
      { label: "Apply Leave", to: "/leaves/apply", icon: CalendarPlus },
      { label: "Leave History", to: "/leaves", icon: History },
    ],
  },
  {
    title: "Team",
    items: [
      { label: "Approvals", to: "/approvals", icon: ClipboardCheck, roles: REVIEWER_ROLES },
      { label: "Team History", to: "/approvals/history", icon: FileClock, roles: REVIEWER_ROLES },
    ],
  },
  {
    title: "Others",
    items: [{ label: "Audit Logs", to: "/audit", icon: ScrollText, roles: [ROLES.EMPLOYEE, ...REVIEWER_ROLES] }],
  },
];

export const PAGE_SIZE = 10;
