/** 带错误边界与网络状态横幅的路由包装（可选入口，与 App.tsx 路由表一致）。 */
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import { FeedbackProvider } from "./feedback";
import { ThemeProvider } from "./theme";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NetworkStatus } from "./components/NetworkStatus";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RequireRole from "./pages/RequireRole";
import AdminHome from "./pages/admin/AdminHome";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminUsers from "./pages/admin/AdminUsers";
import MOHome from "./pages/mo/MOHome";
import MOJobDetail from "./pages/mo/MOJobDetail";
import MOJobs from "./pages/mo/MOJobs";
import MOPost from "./pages/mo/MOPost";
import NotificationsPage from "./pages/NotificationsPage";
import TAApplications from "./pages/ta/TAApplications";
import TAHome from "./pages/ta/TAHome";
import TAJobs from "./pages/ta/TAJobs";
import TAProfile from "./pages/ta/TAProfile";

export default function AppWithOptimizations() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <FeedbackProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                <Route
                  path="/ta"
                  element={
                    <RequireRole role="ta">
                      <TAHome />
                    </RequireRole>
                  }
                />
                <Route
                  path="/ta/profile"
                  element={
                    <RequireRole role="ta">
                      <TAProfile />
                    </RequireRole>
                  }
                />
                <Route
                  path="/ta/jobs"
                  element={
                    <RequireRole role="ta">
                      <TAJobs />
                    </RequireRole>
                  }
                />
                <Route
                  path="/ta/applications"
                  element={
                    <RequireRole role="ta">
                      <TAApplications />
                    </RequireRole>
                  }
                />
                <Route
                  path="/ta/notifications"
                  element={
                    <RequireRole role="ta">
                      <NotificationsPage role="ta" />
                    </RequireRole>
                  }
                />

                <Route
                  path="/mo"
                  element={
                    <RequireRole role="mo">
                      <MOHome />
                    </RequireRole>
                  }
                />
                <Route
                  path="/mo/jobs"
                  element={
                    <RequireRole role="mo">
                      <MOJobs />
                    </RequireRole>
                  }
                />
                <Route
                  path="/mo/post"
                  element={
                    <RequireRole role="mo">
                      <MOPost />
                    </RequireRole>
                  }
                />
                <Route
                  path="/mo/jobs/:id"
                  element={
                    <RequireRole role="mo">
                      <MOJobDetail />
                    </RequireRole>
                  }
                />
                <Route
                  path="/mo/notifications"
                  element={
                    <RequireRole role="mo">
                      <NotificationsPage role="mo" />
                    </RequireRole>
                  }
                />

                <Route
                  path="/admin"
                  element={
                    <RequireRole role="admin">
                      <AdminHome />
                    </RequireRole>
                  }
                />
                <Route
                  path="/admin/logs"
                  element={
                    <RequireRole role="admin">
                      <AdminLogs />
                    </RequireRole>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <RequireRole role="admin">
                      <AdminUsers />
                    </RequireRole>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <RequireRole role="admin">
                      <AdminSettings />
                    </RequireRole>
                  }
                />
                <Route
                  path="/admin/notifications"
                  element={
                    <RequireRole role="admin">
                      <NotificationsPage role="admin" />
                    </RequireRole>
                  }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <NetworkStatus onRetry={() => window.location.reload()} />
            </BrowserRouter>
          </AuthProvider>
        </FeedbackProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}