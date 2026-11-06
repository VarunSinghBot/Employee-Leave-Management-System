import { Check, X } from "lucide-react";
import { LEAVE_STATUS, type Leave } from "@elms/shared";
import { cn, formatDateTime } from "../../utils/format.util";

type StepState = "done" | "current" | "rejected" | "upcoming";

interface Step {
  label: string;
  caption: string;
  state: StepState;
}

const DOT: Record<StepState, string> = {
  done: "bg-emerald-500 text-white",
  current: "bg-violet-500 text-white ring-4 ring-violet-100",
  rejected: "bg-rose-500 text-white",
  upcoming: "bg-slate-200 text-slate-500",
};

// Visual approval chain: Submitted -> Manager -> (HOD) -> Final
const buildSteps = (leave: Leave): Step[] => {
  const { status } = leave;
  const rejected = status === LEAVE_STATUS.REJECTED;
  const managerDone = !!leave.managerActionAt && !(rejected && !leave.hodActionAt);
  const steps: Step[] = [{ label: "Submitted", caption: formatDateTime(leave.createdAt), state: "done" }];

  steps.push({
    label: "Manager",
    caption: leave.manager ? `${leave.manager.name}${leave.managerActionAt ? " · " + formatDateTime(leave.managerActionAt) : ""}` : "Awaiting review",
    state: managerDone ? "done" : rejected && !leave.hodActionAt ? "rejected" : status === LEAVE_STATUS.CANCELLED ? "upcoming" : "current",
  });

  if (leave.requiresHodApproval) {
    steps.push({
      label: "Head of Department",
      caption: leave.hod ? `${leave.hod.name}${leave.hodActionAt ? " · " + formatDateTime(leave.hodActionAt) : ""}` : "Required for > 3 days",
      state: leave.hodActionAt ? (rejected ? "rejected" : "done") : managerDone && status !== LEAVE_STATUS.CANCELLED ? "current" : "upcoming",
    });
  }

  steps.push({
    label: rejected ? "Rejected" : status === LEAVE_STATUS.CANCELLED ? "Cancelled" : "Approved",
    caption: status === LEAVE_STATUS.APPROVED ? "Enjoy your time off!" : rejected ? "See comments below" : "",
    state: status === LEAVE_STATUS.APPROVED ? "done" : rejected ? "rejected" : "upcoming",
  });

  return steps;
};

export function ApprovalProgress({ leave }: { leave: Leave }) {
  const steps = buildSteps(leave);
  return (
    <ol className="grid gap-4 sm:grid-flow-col sm:auto-cols-fr">
      {steps.map((step, i) => (
        <li key={step.label} className="relative flex gap-3 sm:flex-col sm:gap-2">
          {i < steps.length - 1 && <span className="absolute top-3.5 left-8 hidden h-px w-[calc(100%-2rem)] bg-slate-200 sm:block" />}
          <span className={cn("relative z-10 grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold", DOT[step.state])}>
            {step.state === "done" ? <Check className="size-3.5" /> : step.state === "rejected" ? <X className="size-3.5" /> : i + 1}
          </span>
          <div>
            <p className="text-[13px] font-semibold text-slate-800">{step.label}</p>
            {step.caption && <p className="text-xs text-slate-500">{step.caption}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
