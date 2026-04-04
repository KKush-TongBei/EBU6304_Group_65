import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl bg-white border border-slate-200/80 shadow-soft ${className}`}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50";
  const styles = {
    primary: "bg-accent text-white hover:bg-accent-dim",
    secondary: "bg-slate-100 text-ink-900 hover:bg-slate-200",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "bg-transparent text-ink-700 hover:bg-slate-100",
  };
  return (
    <button type="button" className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink-900 placeholder:text-slate-400 focus:border-accent focus:ring-1 focus:ring-accent"
      {...props}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-ink-900 placeholder:text-slate-400 focus:border-accent focus:ring-1 focus:ring-accent min-h-[100px]"
      {...props}
    />
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "bad" | "info";
}) {
  const map = {
    neutral: "bg-slate-100 text-slate-700",
    ok: "bg-emerald-100 text-emerald-800",
    warn: "bg-amber-100 text-amber-900",
    bad: "bg-red-100 text-red-800",
    info: "bg-sky-100 text-sky-900",
  };
  return (
    <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-semibold ${map[tone]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "pending") return <Badge tone="warn">待处理</Badge>;
  if (s === "accepted") return <Badge tone="ok">已录用</Badge>;
  if (s === "rejected") return <Badge tone="bad">已拒绝</Badge>;
  if (s === "withdrawn") return <Badge tone="neutral">已撤回</Badge>;
  return <Badge>{status}</Badge>;
}
