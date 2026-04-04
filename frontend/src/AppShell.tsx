import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { UserRole } from "./types";
import { Button } from "./ui";

export default function AppShell({
  title,
  subtitle,
  role,
  children,
}: {
  title: string;
  subtitle?: string;
  role: UserRole;
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const tabs =
    role === "ta"
      ? [
          { to: "/ta", label: "总览" },
          { to: "/ta/profile", label: "个人资料" },
          { to: "/ta/jobs", label: "浏览岗位" },
          { to: "/ta/applications", label: "我的申请" },
        ]
      : role === "mo"
        ? [
            { to: "/mo", label: "总览" },
            { to: "/mo/jobs", label: "我的岗位" },
            { to: "/mo/post", label: "发布岗位" },
          ]
        : [
            { to: "/admin", label: "工作量" },
            { to: "/admin/logs", label: "活动日志" },
          ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/" className="font-display text-lg font-bold text-ink-950">
              TA 招聘
            </Link>
            <p className="text-xs text-ink-500">{title}</p>
          </div>
          <nav className="flex flex-wrap gap-1">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.to === "/ta" || t.to === "/mo" || t.to === "/admin"}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-100 ${
                    isActive ? "bg-sky-50 text-accent font-semibold" : "text-ink-700"
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-600 hidden sm:inline">
              {user?.display_name} · {user?.email}
            </span>
            <Button variant="secondary" onClick={() => { logout(); nav("/login"); }}>
              退出
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {subtitle && <p className="text-ink-500 text-sm mb-6">{subtitle}</p>}
        {children}
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-ink-500">
        EBU6304 Group 65 · 非 AI 功能完整版 · 智能匹配功能即将推出
      </footer>
    </div>
  );
}
