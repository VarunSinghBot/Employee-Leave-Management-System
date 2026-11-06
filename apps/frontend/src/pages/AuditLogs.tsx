import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AuditLogEntry, Paginated } from "@elms/shared";
import { auditService } from "../services/leave.service";
import { useAuth } from "../store";
import { AUDIT_ACTION_META, PAGE_SIZE } from "../constants/ui.constants";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Field";
import { EmptyState, Spinner } from "../components/ui/Feedback";
import { Pagination } from "../components/ui/Pagination";
import { cn, formatDateTime } from "../utils/format.util";
import { notify } from "../UI/Toast";

const describe = (log: AuditLogEntry) => {
  const d = log.details ?? {};
  if (typeof d.comment === "string" && d.comment) return `“${d.comment}”`;
  if (d.fromDate && d.toDate) return `${d.type ?? ""} ${d.fromDate} → ${d.toDate}`.trim();
  if (typeof d.fileName === "string") return d.fileName;
  if (typeof d.previousStatus === "string") return `${d.previousStatus}${d.newStatus ? ` → ${d.newStatus}` : ""}`;
  return "";
};

export default function AuditLogs() {
  const { isReviewer } = useAuth();
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AuditLogEntry> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    auditService
      .list({ action, page, limit: PAGE_SIZE * 2 })
      .then((res) => setData(res.data))
      .catch((error) => notify.apiError(error, "Could not load audit logs"))
      .finally(() => setLoading(false));
  }, [action, page]);

  return (
    <>
      <PageHeader
        title="Audit logs"
        subtitle={isReviewer ? "Every important action taken on your team's leave requests." : "A trail of everything that happened on your account."}
        actions={
          <Select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="w-52"
            aria-label="Filter by action"
          >
            <option value="">All actions</option>
            {Object.entries(AUDIT_ACTION_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </Select>
        }
      />
      <Card>
        {loading ? (
          <Spinner />
        ) : !data?.items.length ? (
          <EmptyState title="No activity yet" message="Actions such as applying, approving or viewing documents will show up here." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.items.map((log) => {
              const meta = AUDIT_ACTION_META[log.action] ?? { label: log.action, tone: "bg-slate-100 text-slate-700" };
              const leaveId = log.entity === "LeaveRequest" ? log.entityId : (log.details?.leaveId as string | undefined);
              return (
                <li key={log.id} className="flex flex-col gap-1.5 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                  <span className={cn("w-fit shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium sm:w-36 sm:text-center", meta.tone)}>{meta.label}</span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="text-slate-700">
                      <b className="font-semibold">{log.actor?.name ?? "System"}</b>
                      {log.subject && log.subject.id !== log.actor?.id && <span className="text-slate-500"> on {log.subject.name}'s record</span>}
                      {leaveId && (
                        <Link to={`/leaves/${leaveId}`} className="ml-2 text-xs font-medium text-violet-600 hover:underline">
                          open request
                        </Link>
                      )}
                    </p>
                    {describe(log) && <p className="truncate text-[13px] text-slate-500">{describe(log)}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {formatDateTime(log.createdAt)}
                    {log.ipAddress && <span className="ml-2 hidden md:inline">· {log.ipAddress}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />}
      </Card>
    </>
  );
}
