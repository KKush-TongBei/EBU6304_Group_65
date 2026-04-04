import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import type { UserRole } from "../types";

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
      <div className="min-h-screen flex items-center justify-center text-ink-500">
        加载中…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  const ok = Array.isArray(role) ? role.includes(user.role) : user.role === role;
  if (!ok) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
