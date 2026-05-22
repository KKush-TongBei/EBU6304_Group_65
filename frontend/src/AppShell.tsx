import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { api } from "./api";
import { useAuth } from "./AuthContext";
import { useLocale } from "./locale";
import type { UserRole } from "./types";
import { useTheme } from "./theme";
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
  const { theme, toggle } = useTheme();
  const { locale, toggleLocale, t } = useLocale();
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadN, setUnreadN] = useState(0);

  useEffect(() => {
    if (!user) return;
    api.notifications
      .summary()
      .then((s) => setUnreadN(s.unread_count))
      .catch(() => setUnreadN(0));
  }, [user]);

  type Tab = { to: string; label: string; badge?: number };
  const tabs: Tab[] = useMemo(() => {
    if (role === "ta") {
      return [
        { to: "/ta", label: t("shell.navOverview") },
        { to: "/ta/notifications", label: t("shell.navNotifications"), badge: unreadN },
        { to: "/ta/profile", label: t("shell.navProfile") },
        { to: "/ta/jobs", label: t("shell.navBrowseJobs") },
        { to: "/ta/applications", label: t("shell.navMyApplications") },
      ];
    }
    if (role === "mo") {
      return [
        { to: "/mo", label: t("shell.navOverview") },
        { to: "/mo/notifications", label: t("shell.navNotifications"), badge: unreadN },
        { to: "/mo/jobs", label: t("shell.navMyJobs") },
        { to: "/mo/post", label: t("shell.navPostJob") },
        { to: "/mo/account", label: t("shell.navAccount") },
      ];
    }
    return [
      { to: "/admin", label: t("shell.navOverview") },
      { to: "/admin/notifications", label: t("shell.navNotifications"), badge: unreadN },
      { to: "/admin/users", label: t("shell.navUsers") },
      { to: "/admin/settings", label: t("shell.navSettings") },
      { to: "/admin/logs", label: t("shell.navLogs") },
    ];
  }, [role, unreadN, t]);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2.5 rounded-lg text-sm font-medium md:py-1.5 ${
      isActive
        ? "bg-sky-50 dark:bg-sky-950/50 text-accent font-semibold"
        : "text-ink-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950">
      <header className="border-b border-slate-200/80 dark:border-slate-700 bg-white/90 dark:bg-slate-900/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 md:py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 -ml-2"
              aria-expanded={menuOpen}
              aria-controls="mobile-drawer"
              aria-label={menuOpen ? t("shell.closeMenu") : t("shell.openMenu")}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <svg className="w-6 h-6 text-ink-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <div className="min-w-0">
              <Link
                to="/"
                className="font-display text-lg font-bold text-ink-950 dark:text-white truncate block"
              >
                {t("shell.brand")}
              </Link>
              <p className="text-xs text-ink-500 dark:text-slate-400 truncate">{title}</p>
            </div>
          </div>

          <nav className="hidden md:flex flex-wrap gap-1 items-center" aria-label={t("shell.navMain")}>
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === "/ta" || tab.to === "/mo" || tab.to === "/admin"}
                className={navClass}
              >
                <span className="inline-flex items-center gap-1.5">
                  {tab.label}
                  {tab.badge != null && tab.badge > 0 ? (
                    <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </span>
                  ) : null}
                </span>
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleLocale}
              className="p-2 rounded-lg text-sm text-ink-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              title={locale === "zh" ? t("shell.localeToEn") : t("shell.localeToZh")}
              aria-label={locale === "zh" ? t("shell.localeToEn") : t("shell.localeToZh")}
            >
              {locale === "zh" ? t("shell.localeBtnEn") : t("shell.localeBtnZh")}
            </button>
            <button
              type="button"
              onClick={toggle}
              className="p-2 rounded-lg text-sm text-ink-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              title={theme === "dark" ? t("shell.themeToLight") : t("shell.themeToDark")}
              aria-label={theme === "dark" ? t("shell.themeAriaLight") : t("shell.themeAriaDark")}
            >
              {theme === "dark" ? t("shell.themeLight") : t("shell.themeDark")}
            </button>
            <span className="text-sm text-ink-600 dark:text-slate-300 hidden lg:inline max-w-[200px] truncate">
              {user?.display_name}
            </span>
            <Button
              variant="secondary"
              className="!py-2 !px-3"
              onClick={() => {
                void logout();
                nav("/login");
              }}
            >
              {t("shell.logout")}
            </Button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <button
            type="button"
            className="md:hidden fixed inset-0 z-[60] bg-black/40 dark:bg-black/60"
            aria-label={t("shell.closeMenu")}
            onClick={() => setMenuOpen(false)}
          />
          <nav
            id="mobile-drawer"
            className="md:hidden fixed left-0 top-0 bottom-0 z-[70] w-[min(280px,88vw)] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 shadow-xl pt-16 px-3 pb-6 flex flex-col gap-1 overflow-y-auto"
            aria-label={t("shell.navMobile")}
          >
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === "/ta" || tab.to === "/mo" || tab.to === "/admin"}
                className={navClass}
                onClick={() => setMenuOpen(false)}
              >
                <span className="inline-flex items-center gap-1.5">
                  {tab.label}
                  {tab.badge != null && tab.badge > 0 ? (
                    <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </span>
                  ) : null}
                </span>
              </NavLink>
            ))}
          </nav>
        </>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {subtitle && (
          <p className="text-ink-500 dark:text-slate-400 text-sm mb-6">{subtitle}</p>
        )}
        {children}
      </main>
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-ink-500 dark:text-slate-500">
        {t("shell.footer")}
      </footer>
    </div>
  );
}
