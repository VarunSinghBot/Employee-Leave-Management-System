import { CheckCircle2, CircleDot, HelpCircle, MessageSquareReply, Settings2, XCircle, type LucideIcon } from "lucide-react";
import type { CommentKind, LeaveComment } from "@elms/shared";
import { ROLE_LABEL } from "../../constants/ui.constants";
import { cn, formatDateTime } from "../../utils/format.util";

const KIND_META: Record<CommentKind, { icon: LucideIcon; tone: string; label: string }> = {
  NOTE: { icon: CircleDot, tone: "bg-slate-100 text-slate-500", label: "Note" },
  SYSTEM: { icon: Settings2, tone: "bg-slate-100 text-slate-500", label: "Update" },
  INFO_REQUEST: { icon: HelpCircle, tone: "bg-sky-100 text-sky-600", label: "Asked for more information" },
  INFO_RESPONSE: { icon: MessageSquareReply, tone: "bg-amber-100 text-amber-600", label: "Provided information" },
  APPROVAL: { icon: CheckCircle2, tone: "bg-emerald-100 text-emerald-600", label: "Approved" },
  REJECTION: { icon: XCircle, tone: "bg-rose-100 text-rose-600", label: "Rejected" },
};

export function LeaveTimeline({ comments }: { comments: LeaveComment[] }) {
  return (
    <ol className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-slate-200">
      {comments.map((c) => {
        const meta = KIND_META[c.kind];
        const Icon = meta.icon;
        return (
          <li key={c.id} className="relative flex gap-3">
            <span className={cn("relative z-10 grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-white", meta.tone)}>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] text-slate-500">
                <b className="font-semibold text-slate-800">{c.author.name}</b>{" "}
                <span className="text-xs text-slate-400">({ROLE_LABEL[c.author.role]})</span> · {meta.label}
              </p>
              {c.message && <p className="mt-1 rounded-xl bg-slate-50 px-3 py-2 text-sm whitespace-pre-line text-slate-700">{c.message}</p>}
              <p className="mt-1 text-xs text-slate-400">{formatDateTime(c.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
