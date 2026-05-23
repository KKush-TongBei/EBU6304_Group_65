/** 营销/落地首页：未登录入口，已登录用户按角色跳转工作台。 */
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useLocale } from "../locale";
import { useTheme } from "../theme";
import { Button, Card } from "../ui";

export default function HomePage() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { locale, toggleLocale, t } = useLocale();

  if (user) {
    const to = user.role === "ta" ? "/ta" : user.role === "mo" ? "/mo" : "/admin";
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100 dark:bg-slate-950">
        <Card className="p-8 max-w-md text-center w-full">
          <div className="flex justify-end gap-2 mb-2">
            <button
              type="button"
              onClick={toggleLocale}
              className="text-xs text-ink-500 dark:text-slate-400 hover:underline"
              aria-label={locale === "zh" ? t("shell.localeToEn") : t("shell.localeToZh")}
            >
              {locale === "zh" ? t("shell.localeBtnEn") : t("shell.localeBtnZh")}
            </button>
            <button
              type="button"
              onClick={toggle}
              className="text-xs text-ink-500 dark:text-slate-400 hover:underline"
              aria-label={theme === "dark" ? t("shell.themeAriaLight") : t("shell.themeAriaDark")}
            >
              {theme === "dark" ? t("home.themeLightMode") : t("home.themeDarkMode")}
            </button>
          </div>
          <p className="text-ink-700 dark:text-slate-200 mb-4">
            {t("common.loggedInAs", { name: user.display_name })}
          </p>
          <Link to={to}>
            <Button>{t("common.enterWorkbench")}</Button>
          </Link>
          <button
            type="button"
            className="block w-full mt-4 text-sm text-ink-500 dark:text-slate-400 hover:text-ink-800 dark:hover:text-white"
            onClick={() => void logout()}
          >
            {t("common.logoutLogin")}
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="absolute top-4 right-4 flex gap-3">
        <button
          type="button"
          onClick={toggleLocale}
          className="text-sm text-ink-600 dark:text-slate-300 hover:underline"
          aria-label={locale === "zh" ? t("shell.localeToEn") : t("shell.localeToZh")}
        >
          {locale === "zh" ? t("shell.localeBtnEn") : t("shell.localeBtnZh")}
        </button>
        <button
          type="button"
          onClick={toggle}
          className="text-sm text-ink-600 dark:text-slate-300 hover:underline"
          aria-label={theme === "dark" ? t("shell.themeAriaLight") : t("shell.themeAriaDark")}
        >
          {theme === "dark" ? t("shell.themeLight") : t("shell.themeDark")}
        </button>
      </div>
      <h1 className="font-display text-4xl md:text-5xl font-bold text-ink-950 dark:text-white text-center">
        {t("home.title")}
      </h1>
      <p className="mt-4 text-ink-600 dark:text-slate-300 text-center max-w-lg">{t("home.subtitle")}</p>
      <div className="flex gap-4 mt-10">
        <Link to="/login">
          <Button>{t("home.login")}</Button>
        </Link>
        <Link to="/register">
          <Button variant="secondary">{t("home.register")}</Button>
        </Link>
      </div>
    </div>
  );
}
