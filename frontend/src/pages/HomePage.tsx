import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { Button, Card } from "../ui";

export default function HomePage() {
  const { user, logout } = useAuth();

  if (user) {
    const to = user.role === "ta" ? "/ta" : user.role === "mo" ? "/mo" : "/admin";
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-8 max-w-md text-center">
          <p className="text-ink-700 mb-4">已登录为 {user.display_name}</p>
          <Link to={to}>
            <Button>进入工作台</Button>
          </Link>
          <button
            type="button"
            className="block w-full mt-4 text-sm text-ink-500 hover:text-ink-700"
            onClick={logout}
          >
            退出登录
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-sky-50 to-white">
      <h1 className="font-display text-4xl md:text-5xl font-bold text-ink-950 text-center">
        助教招聘系统
      </h1>
      <p className="mt-4 text-ink-600 text-center max-w-lg">
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
