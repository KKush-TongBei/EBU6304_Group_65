import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { Button, Card, Input } from "../ui";

export default function LoginPage() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) {
    if (user.role === "ta") nav("/ta", { replace: true });
    else if (user.role === "mo") nav("/mo", { replace: true });
    else nav("/admin", { replace: true });
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const u = await login(email, password);
      if (u.role === "ta") nav("/ta");
      else if (u.role === "mo") nav("/mo");
      else nav("/admin");
    } catch (e2: unknown) {
      setErr(e2 instanceof Error ? e2.message : "登录失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-100 via-white to-sky-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-ink-950 tracking-tight">
            助教招聘系统
          </h1>
          <p className="text-ink-500 mt-2 text-sm">Teaching Assistant Recruitment · BUPT International</p>
        </div>
        <Card className="p-8">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">邮箱</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">密码</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "登录中…" : "登录"}
            </Button>
          </form>
          <p className="text-center text-sm text-ink-500 mt-6">
            没有账号？{" "}
            <Link to="/register" className="text-accent font-semibold hover:underline">
              注册
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
