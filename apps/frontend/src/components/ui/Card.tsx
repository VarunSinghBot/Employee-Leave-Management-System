import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/format.util";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04)]", className)} {...props} />;
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// Stat tile with a soft gradient glow in the corner
export function StatCard({
  label,
  value,
  hint,
  icon,
  glow = "glow-violet",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  glow?: string;
}) {
  return (
    <Card className={cn("relative overflow-hidden p-4", glow)}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        {icon}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}
