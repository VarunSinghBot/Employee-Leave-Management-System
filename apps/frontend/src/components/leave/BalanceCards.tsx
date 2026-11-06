import type { CSSProperties, ReactNode } from "react";
import { CalendarCheck2, CalendarClock, CalendarRange, Hourglass } from "lucide-react";
import type { LeaveBalance, LeaveBalanceItem } from "@elms/shared";
import { TYPE_META } from "../../constants/ui.constants";
import { Card, StatCard } from "../ui/Card";
import { CountUp } from "../ui/CountUp";
import { cn } from "../../utils/format.util";

const STAGGER_MS = 60;

// Fades children up with a staggered delay (re-runs whenever the parent remounts)
function Reveal({ index, children, className }: { index: number; children: ReactNode; className?: string }) {
  const style: CSSProperties = { animationDelay: `${index * STAGGER_MS}ms` };
  return (
    <div className={cn("animate-fade-up", className)} style={style}>
      {children}
    </div>
  );
}

function Meter({ used, pending, total, bar, delay }: { used: number; pending: number; total: number; bar: string; delay: number }) {
  const usedPct = Math.min(100, (used / total) * 100);
  const pendingPct = Math.min(100 - usedPct, (pending / total) * 100);
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
      <div className="flex h-full origin-left animate-grow-x" style={{ animationDelay: `${delay}ms` }}>
        <div className={bar} style={{ width: `${usedPct}%` }} />
        <div className={cn(bar, "opacity-35")} style={{ width: `${pendingPct}%` }} />
      </div>
    </div>
  );
}

function BalanceTile({ item, index }: { item: LeaveBalanceItem; index: number }) {
  const meta = TYPE_META[item.type];
  const Icon = meta.icon;
  const unlimited = item.yearlyQuota === null;

  return (
    <Reveal index={index}>
      <Card className={cn("relative h-full overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-md", meta.glow)}>
        <div className="flex items-start justify-between">
          <span className={cn("grid size-9 place-items-center rounded-xl bg-white/80 ring-1 ring-slate-200/70", meta.accent)}>
            <Icon className="size-4.5" />
          </span>
          <span className="rounded-lg bg-white/85 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200/70">
            {unlimited ? "No limit" : `${item.yearlyQuota} / year`}
          </span>
        </div>

        <h3 className={cn("mt-4 text-[17px] font-semibold", meta.accent)}>{item.label}</h3>
        <p className="mt-1 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
          <CountUp value={unlimited ? item.takenYear : (item.remainingYear ?? 0)} />
          <span className="ml-1.5 font-sans text-sm font-medium tracking-[-0.01em] text-slate-500">
            {unlimited ? "days taken" : "days left"}
          </span>
        </p>

        {!unlimited && (
          <div className="mt-3">
            <Meter
              used={item.takenYear}
              pending={item.pending}
              total={item.yearlyQuota!}
              bar={meta.bar}
              delay={index * STAGGER_MS + 200}
            />
          </div>
        )}

        <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div>
            <dt className="text-slate-400">Taken</dt>
            <dd className="font-semibold text-slate-700">
              <CountUp value={item.takenYear} suffix="d" />
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Pending</dt>
            <dd className="font-semibold text-slate-700">
              <CountUp value={item.pending} suffix="d" />
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">This month</dt>
            <dd className="font-semibold text-slate-700">
              <CountUp value={item.takenMonth} />
              {item.monthlyQuota !== null && <span className="font-normal text-slate-400">/{item.monthlyQuota}</span>}d
            </dd>
          </div>
        </dl>
      </Card>
    </Reveal>
  );
}

export function BalanceSummary({ balance }: { balance: LeaveBalance }) {
  const { totals } = balance;
  const stats = [
    { label: "Total allowance", value: totals.quota, hint: `Paid leave for ${balance.year}`, glow: "glow-violet", icon: <CalendarRange className="size-4 text-violet-500" /> },
    { label: "Leaves taken", value: totals.taken, hint: `${totals.takenMonth}d this month`, glow: "glow-emerald", icon: <CalendarCheck2 className="size-4 text-emerald-500" /> },
    { label: "Awaiting approval", value: totals.pending, hint: "Pending & info requested", glow: "glow-amber", icon: <Hourglass className="size-4 text-orange-500" /> },
    { label: "Remaining", value: totals.remaining, hint: "Across paid leave types", glow: "glow-sky", icon: <CalendarClock className="size-4 text-sky-500" /> },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s, i) => (
        <Reveal key={s.label} index={i}>
          <StatCard label={s.label} value={<CountUp value={s.value} suffix="d" />} hint={s.hint} glow={s.glow} icon={s.icon} />
        </Reveal>
      ))}
    </div>
  );
}

export function BalanceCards({ balance }: { balance: LeaveBalance }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {balance.items.map((item, i) => (
        // Start after the summary row so the two rows cascade
        <BalanceTile key={item.type} item={item} index={i + 4} />
      ))}
    </div>
  );
}
