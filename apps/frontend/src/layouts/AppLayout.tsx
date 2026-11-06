import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Building2, ChevronRight, Home, LogOut, Menu, X } from "lucide-react";
import { NAV_SECTIONS, ROLE_LABEL } from "../constants/ui.constants";
import { useAppDispatch, useAppSelector, useAuth } from "../store";
import { logout } from "../store/auth.slice";
import { fetchBalance, fetchReviewerStats } from "../store/leave.slice";
import { cn, initials } from "../utils/format.util";
import { notify } from "../UI/Toast";

const CRUMBS: Record<string, string> = {
  dashboard: "Dashboard",
  leaves: "Leave History",
  apply: "Apply Leave",
  edit: "Edit",
  approvals: "Approvals",
  history: "Team History",
  audit: "Audit Logs",
};

function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  return (
    <nav className="flex min-w-0 items-center gap-1.5 text-[13px] text-slate-500" aria-label="Breadcrumb">
      <Link to="/dashboard" className="rounded-md p-1 hover:bg-slate-100" aria-label="Home">
        <Home className="size-4" />
      </Link>
      {parts.map((part, i) => {
        const last = i === parts.length - 1;
        const label = CRUMBS[part] ?? "Details";
        return (
          <span key={i} className="flex min-w-0 items-center gap-1.5">
            <ChevronRight className="size-3.5 shrink-0 text-slate-300" />
            {last ? (
              <span className="truncate rounded-lg bg-slate-100 px-2 py-0.5 font-medium text-slate-800">{label}</span>
            ) : (
              <Link to={`/${parts.slice(0, i + 1).join("/")}`} className="truncate hover:text-slate-800">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isReviewer } = useAuth();
  const pending = useAppSelector((s) => s.leave.reviewerStats?.awaitingMe ?? 0);
  if (!user) return null;

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5 rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-200/70">
        <img src="/logo.svg" alt="" className="size-8" />
        <div className="min-w-0">
          <p className="font-display text-[15px] font-semibold tracking-[-0.03em] text-ink">Leavely</p>
          <p className="flex items-center gap-1 truncate text-xs text-slate-500">
            <Building2 className="size-3" /> {user.department.name}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => !item.roles || item.roles.includes(user.role));
          if (!items.length) return null;
          return (
            <div key={section.title}>
              <p className="mb-1.5 px-3 text-[11px] font-medium tracking-wide text-slate-400 uppercase">{section.title}</p>
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] transition",
                          isActive ? "bg-white font-semibold text-ink shadow-sm ring-1 ring-slate-200/70" : "text-slate-600 hover:bg-white/70",
                        )
                      }
                    >
                      <item.icon className="size-4" />
                      <span className="flex-1">{item.label}</span>
                      {item.to === "/approvals" && isReviewer && pending > 0 && (
                        <span className="rounded-md bg-violet-500 px-1.5 text-[11px] font-semibold text-white">{pending}</span>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200/70">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-violet-300 to-sky-300 text-xs font-semibold text-white">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{ROLE_LABEL[user.role]}</p>
          </div>
        </div>
        {user.manager && (
          <p className="mt-2 truncate border-t border-slate-100 pt-2 text-xs text-slate-500">
            Reports to <b className="font-medium text-slate-700">{user.manager.name}</b>
          </p>
        )}
      </div>
    </div>
  );
}

export function AppLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isReviewer } = useAuth();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Shared data for sidebar badges, dashboard and leave form
  useEffect(() => {
    dispatch(fetchBalance(new Date().getFullYear()));
    if (isReviewer) dispatch(fetchReviewerStats());
  }, [dispatch, isReviewer, pathname]);

  const handleLogout = async () => {
    await dispatch(logout());
    notify.info("Signed out", "See you soon!");
    navigate("/auth/login");
  };

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh bg-[#f1f1f5] lg:block">
        <Sidebar />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-[#f1f1f5] shadow-xl">
            <button onClick={() => setDrawerOpen(false)} className="absolute top-5 right-3 rounded-lg p-1 text-slate-500" aria-label="Close menu">
              <X className="size-5" />
            </button>
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="min-w-0 lg:py-3 lg:pr-3">
        <div className="min-h-dvh bg-white lg:min-h-[calc(100dvh-1.5rem)] lg:rounded-3xl lg:ring-1 lg:ring-slate-200/70">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-100 bg-white/85 px-4 backdrop-blur sm:px-6 lg:rounded-t-3xl">
            <button onClick={() => setDrawerOpen(true)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </button>
            <div className="min-w-0 flex-1">
              <Breadcrumbs />
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              <LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
