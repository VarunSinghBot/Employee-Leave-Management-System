import { LEAVE_POLICY, type LeaveStatus, type LeaveType } from "@elms/shared";
import { STATUS_META, TYPE_META } from "../../constants/ui.constants";
import { cn } from "../../utils/format.util";

export function StatusBadge({ status, className }: { status: LeaveStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap", meta.badge, className)}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export function TypeBadge({ type }: { type: LeaveType }) {
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-xs font-medium whitespace-nowrap", meta.badge)}>
      <Icon className="size-3.5" />
      {LEAVE_POLICY[type].label}
    </span>
  );
}
