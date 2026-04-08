import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import type { UserRole } from "../types";
import { Spinner } from "../ui";

export default function RequireRole({
  role,
  children,
}: {
  role: UserRole | UserRole[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-100 dark:bg-slate-950 text-ink-500 dark:text-slate-400"
        role="status"
        aria-live="polite"
        aria-label="正在加载"
      >
        <Spinner />
        <span className="text-sm">加载中…</span>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  const ok = Array.isArray(role) ? role.includes(user.role) : user.role === role;
  if (!ok) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
