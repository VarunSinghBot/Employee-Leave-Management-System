import { Slide, ToastContainer, toast, type ToastOptions } from "react-toastify";
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import "react-toastify/dist/ReactToastify.css";
import { getErrorMessage } from "../utils/format.util";

type Tone = "success" | "error" | "info" | "warning";

const TONES: Record<Tone, { icon: LucideIcon; ring: string; iconColor: string }> = {
  success: { icon: CheckCircle2, ring: "bg-emerald-50", iconColor: "text-emerald-600" },
  error: { icon: XCircle, ring: "bg-rose-50", iconColor: "text-rose-600" },
  info: { icon: Info, ring: "bg-sky-50", iconColor: "text-sky-600" },
  warning: { icon: AlertTriangle, ring: "bg-amber-50", iconColor: "text-amber-600" },
};

// Reusable toast body: coloured icon + title + optional description
function ToastContent({ tone, title, message }: { tone: Tone; title: string; message?: string }) {
  const { icon: Icon, ring, iconColor } = TONES[tone];
  return (
    <div className="flex items-start gap-3">
      <span className={`grid size-8 shrink-0 place-items-center rounded-full ${ring}`}>
        <Icon className={`size-4.5 ${iconColor}`} />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-semibold tracking-[-0.02em] text-slate-900">{title}</p>
        {message && <p className="mt-0.5 text-[13px] leading-snug text-slate-500">{message}</p>}
      </div>
    </div>
  );
}

const show = (tone: Tone) => (title: string, message?: string, options?: ToastOptions) =>
  toast(<ToastContent tone={tone} title={title} message={message} />, { icon: false, ...options });

export const notify = {
  success: show("success"),
  error: show("error"),
  info: show("info"),
  warning: show("warning"),
  // Shorthand for API failures: shows the server's friendly message
  apiError: (error: unknown, title = "Something went wrong") => show("error")(title, getErrorMessage(error)),
};

export function AppToaster() {
  return (
    <ToastContainer
      position="top-right"
      autoClose={3500}
      newestOnTop
      closeOnClick
      pauseOnHover
      hideProgressBar
      transition={Slide}
      theme="light"
    />
  );
}
