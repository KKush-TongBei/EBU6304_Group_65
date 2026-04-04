import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import { FeedbackProvider } from "./feedback";
import { ThemeProvider } from "./theme";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RequireRole from "./pages/RequireRole";
import AdminHome from "./pages/admin/AdminHome";
import AdminLogs from "./pages/admin/AdminLogs";
import MOHome from "./pages/mo/MOHome";
import MOJobDetail from "./pages/mo/MOJobDetail";
import MOJobs from "./pages/mo/MOJobs";
import MOPost from "./pages/mo/MOPost";
import TAApplications from "./pages/ta/TAApplications";
import TAHome from "./pages/ta/TAHome";
import TAJobs from "./pages/ta/TAJobs";
import TAProfile from "./pages/ta/TAProfile";

export default function App() {
  return (
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

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </FeedbackProvider>
    </ThemeProvider>
  );
}
