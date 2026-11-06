import { ClipboardCheck } from "lucide-react";
import { ROLES } from "@elms/shared";
import { approvalService } from "../../services/leave.service";
import { useAppSelector, useAuth } from "../../store";
import { useLeaveList } from "../../hooks/useLeaveList";
import { LeaveFilters } from "../../components/leave/LeaveFilters";
import { LeaveTable } from "../../components/leave/LeaveTable";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Pagination } from "../../components/ui/Pagination";

export default function Approvals() {
  const { user } = useAuth();
  const stats = useAppSelector((s) => s.leave.reviewerStats);
  const { filters, updateFilters, resetFilters, data, loading } = useLeaveList(approvalService.pending);

  return (
    <>
      <PageHeader
        title="Pending approvals"
        subtitle={
          user?.role === ROLES.HOD
            ? "Requests from your direct reports plus long leaves already approved by managers in your department."
            : "Requests from your direct reports waiting for your decision."
        }
        actions={
          stats && (
            <span className="inline-flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-[13px] font-medium text-violet-700">
              <ClipboardCheck className="size-4" /> {stats.awaitingMe} awaiting you · {stats.awaitingEmployee} waiting on employees
            </span>
          )
        }
      />
      <Card>
        <LeaveFilters values={filters} onChange={updateFilters} onReset={resetFilters} showSearch showStatus={false} />
        <LeaveTable
          leaves={data?.items ?? []}
          loading={loading}
          showEmployee
          emptyTitle="You're all caught up 🎉"
          emptyMessage="No requests are waiting for your review right now."
        />
        {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={(page) => updateFilters({ page })} />}
      </Card>
    </>
  );
}
