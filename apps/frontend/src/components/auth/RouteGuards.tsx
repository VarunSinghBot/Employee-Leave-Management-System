import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { Role } from "@elms/shared";
import { useAuth } from "../../store";
import { FullPageLoader } from "../ui/Feedback";

// Only signed-in users (optionally restricted to roles) can see the nested routes
export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "checking") return <FullPageLoader />;
  if (!user) return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

// Login / signup pages redirect away when already signed in
export function GuestRoute() {
  const { user, status } = useAuth();
  if (status === "checking") return <FullPageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
