import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import type { UserRole } from "../types";
import { Button, Card, Input, Select } from "../ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const { register, user } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("ta");
  const [displayName, setDisplayName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const studentRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  if (user) {
    if (user.role === "ta") nav("/ta", { replace: true });
    else if (user.role === "mo") nav("/mo", { replace: true });
    else nav("/admin", { replace: true });
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (role === "ta" && !studentId.trim()) {
      setErr("助教账号需要填写学号");
      studentRef.current?.focus();
      return;
    }
    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
      setErr("请输入有效邮箱");
      emailRef.current?.focus();
      return;
    }
    if (password.length < 6) {
      setErr("密码至少 6 位");
      passwordRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const u = await register({
        email: email.trim(),
        password,
        role,
        display_name: displayName || undefined,
        student_id: role === "ta" ? studentId : undefined,
      });
      if (u.role === "ta") nav("/ta");
      else if (u.role === "mo") nav("/mo");
      else nav("/admin");
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
          <p className="text-ink-500 dark:text-slate-400 mt-2 text-sm">选择角色以进入对应工作台</p>
        </div>
        <Card className="p-8">
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="reg-role" className="block text-xs font-semibold text-ink-700 dark:text-slate-300 mb-1">
                角色
              </label>
              <Select
                id="reg-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                aria-label="选择账号角色"
              >
                <option value="ta">助教 (TA)</option>
                <option value="mo">课程负责人 (MO)</option>
                <option value="admin">管理员 (Admin)</option>
              </Select>
            </div>
            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold text-ink-700 dark:text-slate-300 mb-1">
                显示名称
              </label>
              <Input id="reg-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            {role === "ta" && (
              <div>
                <label htmlFor="reg-student" className="block text-xs font-semibold text-ink-700 dark:text-slate-300 mb-1">
                  学号
                </label>
                <Input
                  id="reg-student"
                  ref={studentRef}
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                />
              </div>
            )}
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
                密码（至少 6 位）
              </label>
              <Input
                id="reg-password"
                ref={passwordRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
              />
            </div>
            {err && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {err}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "提交中…" : "注册"}
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
