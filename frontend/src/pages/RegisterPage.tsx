import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { Button, Card, Input } from "../ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type RegisterRole = "TA" | "MO";

function strongPassword(p: string): string | null {
  if (p.length < 8) return "密码至少 8 位";
  if (!/[A-Za-z]/.test(p)) return "密码需包含至少一个字母";
  if (!/\d/.test(p)) return "密码需包含至少一个数字";
  return null;
}

export default function RegisterPage() {
  const { register, user } = useAuth();
  const nav = useNavigate();
  const [role, setRole] = useState<RegisterRole>("TA");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const studentRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  if (user) {
    if (user.role === "ta") nav("/ta", { replace: true });
    else if (user.role === "mo") nav("/mo", { replace: true });
    else nav("/admin", { replace: true });
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!identifier.trim()) {
      setErr(role === "TA" ? "助教账号需要填写学号" : "MO 账号需要填写职工号");
      studentRef.current?.focus();
      return;
    }
    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      setErr("请输入有效邮箱");
      emailRef.current?.focus();
      return;
    }
    const pwErr = strongPassword(password);
    if (pwErr) {
      setErr(pwErr);
      passwordRef.current?.focus();
      return;
    }
    if (password !== confirmPassword) {
      setErr("两次密码输入不一样");
      confirmPasswordRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      await register({
        email: email.trim(),
        password,
        display_name: displayName || undefined,
        student_id: identifier.trim(),
        role,
      });
      nav(role === "TA" ? "/ta" : "/mo");
    } catch (e2: unknown) {
      setErr(e2 instanceof Error ? e2.message : "注册失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-100 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-ink-950 dark:text-white">创建账号</h1>
          <p className="text-ink-500 dark:text-slate-400 mt-2 text-sm">
            公开注册支持 <strong>TA / MO</strong>。Admin 账号由管理员在后台创建。
          </p>
        </div>
        <Card className="p-8">
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div role="tablist" aria-label="选择注册角色" className="grid grid-cols-2 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              <button
                type="button"
                role="tab"
                aria-selected={role === "TA"}
                onClick={() => setRole("TA")}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  role === "TA"
                    ? "bg-white dark:bg-slate-700 text-ink-900 dark:text-white shadow"
                    : "text-ink-600 dark:text-slate-300"
                }`}
              >
                TA
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={role === "MO"}
                onClick={() => setRole("MO")}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  role === "MO"
                    ? "bg-white dark:bg-slate-700 text-ink-900 dark:text-white shadow"
                    : "text-ink-600 dark:text-slate-300"
                }`}
              >
                MO
              </button>
            </div>
            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold text-ink-700 dark:text-slate-300 mb-1">
                姓名
              </label>
              <Input id="reg-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="reg-student" className="block text-xs font-semibold text-ink-700 dark:text-slate-300 mb-1">
                {role === "TA" ? "学号" : "职工号"}
              </label>
              <Input
                id="reg-student"
                ref={studentRef}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold text-ink-700 dark:text-slate-300 mb-1">
                邮箱
              </label>
              <Input
                id="reg-email"
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="reg-password" className="block text-xs font-semibold text-ink-700 dark:text-slate-300 mb-1">
                密码（≥8 位，含字母与数字）
              </label>
              <div className="relative">
                <Input
                  id="reg-password"
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-600 dark:text-slate-300 hover:text-accent"
                >
                  {showPassword ? "隐藏" : "显示"}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="reg-confirm-password" className="block text-xs font-semibold text-ink-700 dark:text-slate-300 mb-1">
                确认密码
              </label>
              <div className="relative">
                <Input
                  id="reg-confirm-password"
                  ref={confirmPasswordRef}
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? "隐藏确认密码" : "显示确认密码"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-600 dark:text-slate-300 hover:text-accent"
                >
                  {showConfirmPassword ? "隐藏" : "显示"}
                </button>
              </div>
            </div>
            {err && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {err}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "提交中…" : role === "TA" ? "注册为 TA" : "注册为 MO"}
            </Button>
          </form>
          <p className="text-center text-sm text-ink-500 dark:text-slate-400 mt-6">
            已有账号？{" "}
            <Link to="/login" className="text-accent font-semibold hover:underline">
              登录
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
