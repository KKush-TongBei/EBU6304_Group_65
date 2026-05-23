/** 登录页：校验邮箱格式，成功后由 AuthContext 保存 JWT 并按角色跳转。 */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useLocale } from "../locale";
import { Button, Card, Input } from "../ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { login, user } = useAuth();
  const { t, te } = useLocale();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionHint, setSessionHint] = useState("");

  useEffect(() => {
    const reason = params.get("reason");
    if (reason === "session" || sessionStorage.getItem("ta_session_expired")) {
      setSessionHint(t("auth.sessionExpired"));
      sessionStorage.removeItem("ta_session_expired");
    }
  }, [params, t]);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  if (user) {
    if (user.role === "ta") nav("/ta", { replace: true });
    else if (user.role === "mo") nav("/mo", { replace: true });
    else nav("/admin", { replace: true });
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!email.trim()) {
      setErr(t("auth.emailRequired"));
      emailRef.current?.focus();
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setErr(t("auth.emailInvalid"));
      emailRef.current?.focus();
      return;
    }
    if (!password) {
      setErr(t("auth.passwordRequired"));
      passwordRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      if (u.role === "ta") nav("/ta");
      else if (u.role === "mo") nav("/mo");
      else nav("/admin");
    } catch (e2: unknown) {
      setErr(e2 instanceof Error ? te(e2.message) : t("auth.loginFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-100 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-ink-950 dark:text-white tracking-tight">
            {t("auth.systemTitle")}
          </h1>
          <p className="text-ink-500 dark:text-slate-400 mt-2 text-sm">{t("auth.systemSubtitle")}</p>
        </div>
        <Card className="p-8">
          {sessionHint ? (
            <p className="mb-4 text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
              {sessionHint}
            </p>
          ) : null}
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-ink-700 dark:text-slate-300 mb-1">
                {t("common.email")}
              </label>
              <Input
                id="login-email"
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                placeholder="you@example.com"
                aria-invalid={!!err && !email.trim()}
                aria-describedby={err ? "login-err" : undefined}
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-ink-700 dark:text-slate-300 mb-1">
                {t("common.password")}
              </label>
              <div className="relative">
                <Input
                  id="login-password"
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder={t("auth.passwordPlaceholder")}
                  aria-invalid={!!err && !password}
                  className="pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("common.hidePassword") : t("common.showPassword")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-600 dark:text-slate-300 hover:text-accent"
                >
                  {showPassword ? t("common.hidePassword") : t("common.showPassword")}
                </button>
              </div>
            </div>
            {err && (
              <p id="login-err" className="text-sm text-red-600 dark:text-red-400" role="alert">
                {err}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? t("auth.loggingIn") : t("auth.login")}
            </Button>
          </form>
          <p className="text-center text-sm text-ink-500 dark:text-slate-400 mt-6">
            {t("auth.noAccount")}{" "}
            <Link to="/register" className="text-accent font-semibold hover:underline">
              {t("auth.registerLink")}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
