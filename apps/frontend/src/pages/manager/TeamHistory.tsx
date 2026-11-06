import { approvalService } from "../../services/leave.service";
import { useLeaveList } from "../../hooks/useLeaveList";
import { LeaveFilters } from "../../components/leave/LeaveFilters";
import { LeaveTable } from "../../components/leave/LeaveTable";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Pagination } from "../../components/ui/Pagination";

export default function TeamHistory() {
  const { filters, updateFilters, resetFilters, data, loading } = useLeaveList(approvalService.history);

  return (
    <>
      <PageHeader title="Team leave history" subtitle="All requests from your team — filter by status, type, employee or dates." />
      <Card>
        <LeaveFilters values={filters} onChange={updateFilters} onReset={resetFilters} showSearch />
        <LeaveTable leaves={data?.items ?? []} loading={loading} showEmployee />
        {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={(page) => updateFilters({ page })} />}
      </Card>
    </>
  );
}
