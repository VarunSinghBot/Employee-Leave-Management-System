import { useState } from "react";
import { Check, HelpCircle, X } from "lucide-react";
import { LEAVE_STATUS, REVIEW_ACTIONS, reviewSchema, type LeaveDetail, type ReviewAction } from "@elms/shared";
import { approvalService } from "../../services/leave.service";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Field";
import { Card, CardHeader } from "../ui/Card";
import { getFieldErrors, validateWith } from "../../utils/format.util";
import { notify } from "../../UI/Toast";

// Manager / HOD actions: approve, reject or ask for more information (with comment)
export function ReviewPanel({ leave, onReviewed }: { leave: LeaveDetail; onReviewed: (leave: LeaveDetail) => void }) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<ReviewAction | null>(null);
  const isHodStage = leave.status === LEAVE_STATUS.PENDING_HOD;

  const submit = async (action: ReviewAction) => {
    const { data, errors } = validateWith(reviewSchema, { action, comment });
    if (!data) {
      setError(errors.comment ?? errors.form);
      return;
    }
    setBusy(action);
    try {
      const res = await approvalService.review(leave.id, data);
      notify.success(res.message, `${leave.employeeName}'s ${leave.days}-day request`);
      setComment("");
      onReviewed(res.data);
    } catch (err) {
      setError(getFieldErrors(err).comment ?? "");
      notify.apiError(err, "Review failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="glow-violet">
      <CardHeader
        title={isHodStage ? "Final approval (HOD)" : "Your review"}
        subtitle={
          leave.requiresHodApproval && !isHodStage
            ? "Long leave: after you approve it goes to the HOD"
            : "Comments are visible to the employee"
        }
      />
      <div className="space-y-3 p-5">
        <Textarea
          label="Comment"
          placeholder="Required when rejecting or asking for more information"
          value={comment}
          maxLength={500}
          onChange={(e) => {
            setComment(e.target.value);
            setError("");
          }}
          error={error}
        />
        <div className="grid gap-2">
          <Button variant="success" loading={busy === REVIEW_ACTIONS.APPROVE} disabled={!!busy} onClick={() => submit(REVIEW_ACTIONS.APPROVE)} icon={<Check className="size-4" />}>
            {leave.requiresHodApproval && !isHodStage ? "Approve & forward to HOD" : "Approve"}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="danger" loading={busy === REVIEW_ACTIONS.REJECT} disabled={!!busy} onClick={() => submit(REVIEW_ACTIONS.REJECT)} icon={<X className="size-4" />}>
              Reject
            </Button>
            <Button variant="secondary" loading={busy === REVIEW_ACTIONS.REQUEST_INFO} disabled={!!busy} onClick={() => submit(REVIEW_ACTIONS.REQUEST_INFO)} icon={<HelpCircle className="size-4 text-sky-600" />}>
              Ask info
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
