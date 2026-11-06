import type { ReactNode } from "react";
import { Inbox, Loader2 } from "lucide-react";

export function Spinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <Loader2 className="size-5 animate-spin text-violet-500" />
      {label}
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas bg-aurora">
      <Spinner label="Preparing your workspace..." />
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 glow-violet">
        <Inbox className="size-5.5 text-slate-500" />
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-800">{title}</p>
      {message && <p className="mt-1 max-w-sm text-[13px] text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
