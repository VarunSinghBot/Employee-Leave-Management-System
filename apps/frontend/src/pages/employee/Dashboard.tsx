import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarPlus, ClipboardCheck, HelpCircle, Plane, Users } from "lucide-react";
import type { Leave } from "@elms/shared";
import { useAppDispatch, useAppSelector, useAuth } from "../../store";
import { fetchBalance } from "../../store/leave.slice";
import { leaveService } from "../../services/leave.service";
import { BalanceCards, BalanceSummary } from "../../components/leave/BalanceCards";
import { LeaveTable } from "../../components/leave/LeaveTable";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, StatCard } from "../../components/ui/Card";
import { Select } from "../../components/ui/Field";
import { Spinner } from "../../components/ui/Feedback";
import { notify } from "../../UI/Toast";
import { cn } from "../../utils/format.util";

const currentYear = new Date().getFullYear();

function ReviewerStrip() {
  const stats = useAppSelector((s) => s.leave.reviewerStats);
  if (!stats) return null;
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Team overview</h2>
        <Link to="/approvals">
          <Button size="sm" variant="secondary">
            Open approvals <ArrowRight className="size-3.5" />
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Awaiting your review" value={stats.awaitingMe} glow="glow-violet" icon={<ClipboardCheck className="size-4 text-violet-500" />} />
        <StatCard label="Waiting on employee" value={stats.awaitingEmployee} glow="glow-sky" icon={<HelpCircle className="size-4 text-sky-500" />} />
        <StatCard label="On leave today" value={stats.onLeaveToday} glow="glow-emerald" icon={<Plane className="size-4 text-emerald-500" />} />
        <StatCard label="Team members" value={stats.teamSize} hint={`${stats.approvedThisMonth} approved · ${stats.rejectedThisMonth} rejected this month`} glow="glow-amber" icon={<Users className="size-4 text-orange-500" />} />
      </div>
    </section>
  );
}

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const { user, isReviewer } = useAuth();
  const { balance, balanceYear, balanceLoading } = useAppSelector((s) => s.leave);
  const [recent, setRecent] = useState<Leave[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const loadRecent = useCallback(async () => {
    try {
      setRecent((await leaveService.mine({ page: 1, limit: 5 })).data.items);
    } catch (error) {
      notify.apiError(error, "Could not load recent requests");
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  return (
    <>
      <PageHeader
        title={`Hi, ${user?.name.split(" ")[0]} 👋`}
        subtitle="Here's how your leave looks this year."
        actions={
          <>
            <Select
              value={balanceYear}
              onChange={(e) => dispatch(fetchBalance(Number(e.target.value)))}
              aria-label="Balance year"
              className="w-28"
            >
              {[currentYear + 1, currentYear, currentYear - 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
            <Link to="/leaves/apply">
              <Button icon={<CalendarPlus className="size-4" />}>Apply leave</Button>
            </Link>
          </>
        }
      />

      {isReviewer && <ReviewerStrip />}

      {balanceLoading && !balance ? (
        <Spinner />
      ) : (
        balance && (
          // Keyed by year: switching years remounts the cards and replays the entrance animation
          <div key={balance.year} className={cn("space-y-4 transition-opacity duration-300", balanceLoading && "opacity-50")}>
            <BalanceSummary balance={balance} />
            <BalanceCards balance={balance} />
          </div>
        )
      )}

      <Card className="mt-8">
        <CardHeader
          title="Recent requests"
          subtitle="Your latest five leave requests"
          action={
            <Link to="/leaves" className="text-[13px] font-medium text-violet-600 hover:underline">
              View all
            </Link>
          }
        />
        <LeaveTable
          leaves={recent}
          loading={recentLoading}
          emptyTitle="You haven't applied for leave yet"
          emptyMessage="When you do, your requests and their status will appear here."
        />
      </Card>
    </>
  );
}
