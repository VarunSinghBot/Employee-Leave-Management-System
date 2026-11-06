import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Ban, CalendarDays, Pencil, ShieldAlert } from "lucide-react";
import { LEAVE_STATUS, type LeaveBalance, type LeaveDetail } from "@elms/shared";
import { leaveService } from "../services/leave.service";
import { useAppDispatch, useAuth } from "../store";
import { fetchBalance, fetchReviewerStats } from "../store/leave.slice";
import { ApprovalProgress } from "../components/leave/ApprovalProgress";
import { DocumentList } from "../components/leave/DocumentList";
import { InfoResponseForm } from "../components/leave/InfoResponseForm";
import { LeaveTimeline } from "../components/leave/LeaveTimeline";
import { ReviewPanel } from "../components/leave/ReviewPanel";
import { StatusBadge, TypeBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardHeader } from "../components/ui/Card";
import { Spinner } from "../components/ui/Feedback";
import { Modal } from "../components/ui/Modal";
import { TYPE_META } from "../constants/ui.constants";
import { cn, formatDateTime, formatRange } from "../utils/format.util";
import { notify } from "../UI/Toast";

// Compact balance so reviewers can decide with context
function EmployeeBalance({ balance }: { balance: LeaveBalance }) {
  return (
    <Card>
      <CardHeader title="Employee balance" subtitle={`${balance.year} · approved / yearly quota`} />
      <ul className="space-y-3 p-5">
        {balance.items.map((item) => (
          <li key={item.type} className="text-[13px]">
            <div className="flex justify-between">
              <span className="text-slate-600">{item.label}</span>
              <span className="font-medium text-slate-800">
                {item.takenYear}
                {item.yearlyQuota !== null && <span className="text-slate-400"> / {item.yearlyQuota}</span>}d
                {item.pending > 0 && <span className="ml-1 text-xs text-amber-600">(+{item.pending} pending)</span>}
              </span>
            </div>
            {item.yearlyQuota !== null && (
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={TYPE_META[item.type].bar + " h-full"} style={{ width: `${Math.min(100, (item.takenYear / item.yearlyQuota) * 100)}%` }} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function LeaveDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [leave, setLeave] = useState<LeaveDetail | null>(null);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const isOwner = leave?.employee.id === user?.id;

  const load = useCallback(async () => {
    try {
      const res = await leaveService.get(id);
      setLeave(res.data);
      if (res.data.employee.id !== user?.id) {
        const year = new Date(res.data.fromDate).getUTCFullYear();
        setBalance((await leaveService.balance(year, res.data.employee.id)).data);
      }
    } catch (error) {
      notify.apiError(error, "Could not open this request");
      navigate(-1);
    }
  }, [id, navigate, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdated = (updated: LeaveDetail) => {
    setLeave(updated);
    dispatch(fetchReviewerStats());
    dispatch(fetchBalance(new Date().getFullYear()));
  };

  const cancel = async () => {
    setCancelling(true);
    try {
      const res = await leaveService.cancel(id);
      notify.success(res.message);
      handleUpdated(res.data);
      setConfirmCancel(false);
    } catch (error) {
      notify.apiError(error, "Could not cancel the request");
    } finally {
      setCancelling(false);
    }
  };

  if (!leave) return <Spinner />;

  const { permissions } = leave;
  const meta = TYPE_META[leave.type];
  const showSidebar = permissions.canReview || permissions.canRespond || balance;

  return (
    <>
      <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-4" /> Back
      </button>

      <Card className={cn("relative mb-6 overflow-hidden p-5 sm:p-6", meta.glow)}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={leave.type} />
              <StatusBadge status={leave.status} />
              {leave.requiresHodApproval && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200 ring-inset">
                  <ShieldAlert className="size-3" /> Multi-level approval
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{isOwner ? "Your leave request" : `${leave.employeeName}'s leave request`}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" /> {formatRange(leave.fromDate, leave.toDate)}
              </span>
              <b className="font-display font-semibold text-ink">{leave.days} day{leave.days > 1 ? "s" : ""}</b>
              <span className="text-slate-400">· {leave.employee.department.name} · applied {formatDateTime(leave.createdAt)}</span>
            </p>
          </div>
          <div className="flex gap-2">
            {permissions.canEdit && (
              <Link to={`/leaves/${leave.id}/edit`}>
                <Button variant="secondary" icon={<Pencil className="size-4" />}>Edit</Button>
              </Link>
            )}
            {permissions.canCancel && (
              <Button variant="secondary" onClick={() => setConfirmCancel(true)} icon={<Ban className="size-4 text-rose-500" />}>
                Cancel request
              </Button>
            )}
          </div>
        </div>
        <div className="mt-6 rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200/70">
          <ApprovalProgress leave={leave} />
        </div>
      </Card>

      <div className={cn("grid gap-6", showSidebar && "lg:grid-cols-[1fr_340px]")}>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Reason" />
            <p className="p-5 text-sm whitespace-pre-line text-slate-700">{leave.reason}</p>
          </Card>
          <Card>
            <CardHeader title="Documents" subtitle={leave.requiresHodApproval ? "Required for leaves longer than 3 days" : undefined} />
            <div className="p-5">
              <DocumentList leaveId={leave.id} documents={leave.documents} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Activity & comments" subtitle="Full history visible to the employee and reviewers" />
            <div className="p-5">
              <LeaveTimeline comments={leave.comments} />
            </div>
          </Card>
        </div>

        {showSidebar && (
          <div className="space-y-6">
            {permissions.canReview && <ReviewPanel leave={leave} onReviewed={handleUpdated} />}
            {permissions.canRespond && <InfoResponseForm leave={leave} onSent={handleUpdated} />}
            {!permissions.canReview && !isOwner && leave.status !== LEAVE_STATUS.PENDING && leave.status !== LEAVE_STATUS.PENDING_HOD && (
              <Card className="p-5 text-[13px] text-slate-500">This request is not awaiting your review.</Card>
            )}
            {balance && <EmployeeBalance balance={balance} />}
          </div>
        )}
      </div>

      <Modal
        open={confirmCancel}
        title="Cancel this leave request?"
        onClose={() => setConfirmCancel(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmCancel(false)}>Keep it</Button>
            <Button variant="danger" loading={cancelling} onClick={cancel}>Yes, cancel</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          The {leave.days}-day request ({formatRange(leave.fromDate, leave.toDate)}) will be withdrawn and the days returned to your balance.
        </p>
      </Modal>
    </>
  );
}
