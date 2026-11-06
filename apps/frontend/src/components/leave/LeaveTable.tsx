import { useNavigate } from "react-router-dom";
import { ChevronRight, Paperclip } from "lucide-react";
import type { Leave } from "@elms/shared";
import { StatusBadge, TypeBadge } from "../ui/Badge";
import { EmptyState, Spinner } from "../ui/Feedback";
import { formatDate, formatRange, initials } from "../../utils/format.util";

interface LeaveTableProps {
  leaves: Leave[];
  loading?: boolean;
  showEmployee?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-200 to-sky-200 text-[11px] font-semibold text-violet-800">
      {initials(name)}
    </span>
  );
}

// Table on desktop, stacked cards on mobile
export function LeaveTable({ leaves, loading, showEmployee, emptyTitle = "No leave requests found", emptyMessage }: LeaveTableProps) {
  const navigate = useNavigate();
  const open = (id: string) => navigate(`/leaves/${id}`);

  if (loading) return <Spinner />;
  if (!leaves.length) return <EmptyState title={emptyTitle} message={emptyMessage ?? "Try changing the filters."} />;

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/70 text-xs font-medium text-slate-500">
            <tr>
              {showEmployee && <th className="px-5 py-3">Employee</th>}
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Dates</th>
              <th className="px-5 py-3">Days</th>
              <th className="px-5 py-3">Reason</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Applied</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leaves.map((leave) => (
              <tr key={leave.id} onClick={() => open(leave.id)} className="cursor-pointer transition hover:bg-violet-50/40">
                {showEmployee && (
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={leave.employeeName} />
                      <div>
                        <p className="font-medium text-slate-800">{leave.employeeName}</p>
                        <p className="text-xs text-slate-400">{leave.employee.department.name}</p>
                      </div>
                    </div>
                  </td>
                )}
                <td className="px-5 py-3"><TypeBadge type={leave.type} /></td>
                <td className="px-5 py-3 whitespace-nowrap text-slate-700">{formatRange(leave.fromDate, leave.toDate)}</td>
                <td className="px-5 py-3 font-medium text-slate-700">{leave.days}</td>
                <td className="max-w-56 px-5 py-3">
                  <p className="truncate text-slate-600">{leave.reason}</p>
                  {!!leave._count?.documents && (
                    <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-400">
                      <Paperclip className="size-3" /> {leave._count.documents} file(s)
                    </span>
                  )}
                </td>
                <td className="px-5 py-3"><StatusBadge status={leave.status} /></td>
                <td className="px-5 py-3 whitespace-nowrap text-slate-500">{formatDate(leave.createdAt)}</td>
                <td className="pr-4"><ChevronRight className="size-4 text-slate-300" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 md:hidden">
        {leaves.map((leave) => (
          <li key={leave.id}>
            <button onClick={() => open(leave.id)} className="w-full px-4 py-3.5 text-left active:bg-slate-50">
              <div className="flex items-center justify-between gap-2">
                <TypeBadge type={leave.type} />
                <StatusBadge status={leave.status} />
              </div>
              {showEmployee && <p className="mt-2 text-sm font-semibold text-slate-800">{leave.employeeName}</p>}
              <p className="mt-1.5 text-sm text-slate-700">
                {formatRange(leave.fromDate, leave.toDate)} · <b>{leave.days}d</b>
              </p>
              <p className="mt-0.5 truncate text-[13px] text-slate-500">{leave.reason}</p>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
