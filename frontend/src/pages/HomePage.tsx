import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useTheme } from "../theme";
import { Button, Card } from "../ui";

export default function HomePage() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  if (user) {
    const to = user.role === "ta" ? "/ta" : user.role === "mo" ? "/mo" : "/admin";
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100 dark:bg-slate-950">
        <Card className="p-8 max-w-md text-center w-full">
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={toggle}
              className="text-xs text-ink-500 dark:text-slate-400 hover:underline"
              aria-label={theme === "dark" ? "切换浅色模式" : "切换深色模式"}
            >
              {theme === "dark" ? "浅色模式" : "深色模式"}
            </button>
          </div>
          <p className="text-ink-700 dark:text-slate-200 mb-4">已登录为 {user.display_name}</p>
          <Link to={to}>
            <Button>进入工作台</Button>
          </Link>
          <button
            type="button"
            className="block w-full mt-4 text-sm text-ink-500 dark:text-slate-400 hover:text-ink-800 dark:hover:text-white"
            onClick={() => void logout()}
          >
            退出登录
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={toggle}
          className="text-sm text-ink-600 dark:text-slate-300 hover:underline"
          aria-label={theme === "dark" ? "切换浅色模式" : "切换深色模式"}
        >
          {theme === "dark" ? "浅色" : "深色"}
        </button>
      </div>
      <h1 className="font-display text-4xl md:text-5xl font-bold text-ink-950 dark:text-white text-center">
        助教招聘系统
      </h1>
      <p className="mt-4 text-ink-600 dark:text-slate-300 text-center max-w-lg">
        面向北邮国际学院的助教岗位发布、申请、审核与工作量管理。支持 TA / MO / 管理员三角色。
      </p>
      <div className="flex gap-4 mt-10">
        <Link to="/login">
          <Button>登录</Button>
        </Link>
        <Link to="/register">
          <Button variant="secondary">注册</Button>
        </Link>
      </div>
    </div>
  );
}
