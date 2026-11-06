import { Outlet } from "react-router-dom";
import { CalendarCheck2, FileCheck2, ShieldCheck } from "lucide-react";

const HIGHLIGHTS = [
  { icon: CalendarCheck2, title: "Apply in seconds", text: "Track sick, casual & earned leave balances live" },
  { icon: FileCheck2, title: "Two-step approvals", text: "Long leaves go through manager and HOD" },
  { icon: ShieldCheck, title: "Fully audited", text: "Every decision is logged with comments" },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/logo.svg" alt="" className="size-9" />
      <span className="font-display text-lg font-semibold tracking-[-0.03em] text-ink">Leavely</span>
    </div>
  );
}

// Both columns share one centred, width-capped container so they stay together on wide screens
export function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas bg-aurora">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-8 lg:py-10">
        <header>
          <Brand />
        </header>

        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-16">
          <section className="hidden lg:block">
            <h1 className="max-w-lg text-5xl leading-[1.05] font-semibold">
              Time off,{" "}
              <span className="bg-gradient-to-r from-violet-500 via-sky-500 to-orange-400 bg-clip-text text-transparent">
                without the paperwork.
              </span>
            </h1>
            <p className="mt-4 max-w-md text-slate-500">
              The Employee Leave Management System for teams that want clear balances and fast approvals.
            </p>
            <ul className="mt-10 grid max-w-md gap-3">
              {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex items-start gap-3 rounded-2xl bg-white/70 p-4 ring-1 ring-white backdrop-blur">
                  <span className="grid size-9 place-items-center rounded-xl bg-white text-violet-500 shadow-sm">
                    <Icon className="size-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{title}</p>
                    <p className="text-[13px] text-slate-500">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <main className="mx-auto w-full max-w-md lg:max-w-none">
            <div className="rounded-3xl bg-white/90 p-6 shadow-[0_20px_60px_-20px_rgb(76_29_149/0.25)] ring-1 ring-white backdrop-blur sm:p-8">
              <Outlet />
            </div>
          </main>
        </div>

        <footer className="text-xs text-slate-400">© {new Date().getFullYear()} Leavely · ELMS</footer>
      </div>
    </div>
  );
}
