import { Link } from "react-router-dom";
import { CalendarPlus } from "lucide-react";
import { leaveService } from "../../services/leave.service";
import { useLeaveList } from "../../hooks/useLeaveList";
import { LeaveFilters } from "../../components/leave/LeaveFilters";
import { LeaveTable } from "../../components/leave/LeaveTable";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Pagination } from "../../components/ui/Pagination";

export default function MyLeaves() {
  const { filters, updateFilters, resetFilters, data, loading } = useLeaveList(leaveService.mine);

  return (
    <>
      <PageHeader
        title="Leave History"
        subtitle="Every request you've submitted, with its current status."
        actions={
          <Link to="/leaves/apply">
            <Button icon={<CalendarPlus className="size-4" />}>Apply leave</Button>
          </Link>
        }
      />
      <Card>
        <LeaveFilters values={filters} onChange={updateFilters} onReset={resetFilters} />
        <LeaveTable leaves={data?.items ?? []} loading={loading} />
        {data && <Pagination page={data.page} pages={data.pages} total={data.total} onChange={(page) => updateFilters({ page })} />}
      </Card>
    </>
  );
}
