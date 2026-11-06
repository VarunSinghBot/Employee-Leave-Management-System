import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CONSECUTIVE_DAYS_LIMIT, LEAVE_POLICY, toDateKey, type LeaveDetail, type LeaveRequestInput } from "@elms/shared";
import { leaveService } from "../../services/leave.service";
import { useAppDispatch } from "../../store";
import { fetchBalance } from "../../store/leave.slice";
import { LeaveForm } from "../../components/leave/LeaveForm";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card, CardHeader } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Feedback";
import { notify } from "../../UI/Toast";

// Used for both "apply" and "edit" (when an :id is in the URL)
export default function ApplyLeave() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [existing, setExisting] = useState<LeaveDetail | null>(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) return;
    leaveService
      .get(id)
      .then((res) => {
        if (!res.data.permissions.canEdit) {
          notify.warning("Editing not allowed", "Only pending requests that haven't been reviewed can be edited");
          navigate(`/leaves/${id}`, { replace: true });
          return;
        }
        setExisting(res.data);
      })
      .catch((error) => {
        notify.apiError(error, "Could not load this request");
        navigate("/leaves", { replace: true });
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleSubmit = async (input: LeaveRequestInput, files: File[]) => {
    const res = id ? await leaveService.update(id, input, files) : await leaveService.apply(input, files);
    notify.success(res.message, res.data.requiresHodApproval ? "It needs manager and HOD approval" : "Your manager has been notified");
    dispatch(fetchBalance(new Date().getFullYear()));
    navigate(`/leaves/${res.data.id}`);
  };

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader
        title={id ? "Edit leave request" : "Apply for leave"}
        subtitle={id ? "Update the details of your pending request." : "Fill in the details below to submit a new request."}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-5 sm:p-6">
          <LeaveForm
            submitLabel={id ? "Save changes" : "Submit request"}
            existingDocuments={existing?.documents.length ?? 0}
            initial={
              existing
                ? { type: existing.type, fromDate: toDateKey(existing.fromDate), toDate: toDateKey(existing.toDate), reason: existing.reason }
                : undefined
            }
            onSubmit={handleSubmit}
          />
        </Card>
        <Card className="h-fit glow-sky">
          <CardHeader title="Leave policy" subtitle="Quotas reset every calendar year" />
          <ul className="space-y-3 p-5 text-[13px]">
            {Object.entries(LEAVE_POLICY).map(([type, p]) => (
              <li key={type} className="flex justify-between gap-3">
                <span className="text-slate-600">{p.label}</span>
                <span className="text-right font-medium text-slate-800">
                  {p.yearly === null ? "Unlimited" : `${p.yearly}/yr`}
                  {p.monthly !== null && <span className="block text-xs font-normal text-slate-400">max {p.monthly}/month</span>}
                </span>
              </li>
            ))}
            <li className="border-t border-slate-100 pt-3 text-slate-500">
              Requests longer than <b>{CONSECUTIVE_DAYS_LIMIT} days</b> need a document and approval from both your manager and HOD.
            </li>
          </ul>
        </Card>
      </div>
    </>
  );
}
