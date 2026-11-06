import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { REVIEWER_ROLES } from "@elms/shared";
import { AppLayout } from "./layouts/AppLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { GuestRoute, ProtectedRoute } from "./components/auth/RouteGuards";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Dashboard from "./pages/employee/Dashboard";
import MyLeaves from "./pages/employee/MyLeaves";
import ApplyLeave from "./pages/employee/ApplyLeave";
import LeaveDetailPage from "./pages/LeaveDetail";
import Approvals from "./pages/manager/Approvals";
import TeamHistory from "./pages/manager/TeamHistory";
import AuditLogs from "./pages/AuditLogs";
import ErrPage from "./ErrPage";
import Management from "./pages/manager/Management";

function App() {
  // Available to every signed-in user (managers & HODs apply for leave too)
  const routes = [
    { path: "dashboard", element: <Dashboard /> },
    { path: "leaves", element: <MyLeaves /> },
    { path: "leaves/apply", element: <ApplyLeave /> },
    { path: "leaves/:id", element: <LeaveDetailPage /> },
    { path: "leaves/:id/edit", element: <ApplyLeave /> },
    { path: "audit", element: <AuditLogs /> },
  ];

  // RBAC: only managers and HODs
  const reviewerRoutes = [
    { path: "approvals", element: <Approvals /> },
    { path: "approvals/history", element: <TeamHistory /> },
  ];

  const managementRoutes = [{ path: "management", element: <Management /> }];

  return (
    <Router>
      <Routes>
        {/* Redirect root to the dashboard (guards send guests to /auth/login) */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Main app layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {routes.map((r) => (
              <Route key={r.path} path={r.path} element={r.element} />
            ))}
            <Route element={<ProtectedRoute roles={REVIEWER_ROLES} />}>
              {reviewerRoutes.map((r) => (
                <Route key={r.path} path={r.path} element={r.element} />
              ))}
            </Route>
            <Route element={<ProtectedRoute roles={[ "HOD" ]} />}>
              {managementRoutes.map((r) => (
                <Route key={r.path} path={r.path} element={r.element} />
              ))}
            </Route>
          </Route>
        </Route>

        {/* Auth routes wrapped in AuthLayout */}
        <Route element={<GuestRoute />}>
          <Route path="/auth" element={<AuthLayout />}>
            <Route index element={<Navigate to="login" replace />} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
          </Route>
        </Route>

        <Route path="*" element={<ErrPage />} />
      </Routes>
    </Router>
  );
}

export default App;
