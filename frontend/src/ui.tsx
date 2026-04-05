import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

const cardBase =
  "rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 shadow-soft dark:shadow-none";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`${cardBase} ${className}`}>{children}</div>;
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
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:opacity-50";
  const styles = {
    primary: "bg-accent text-white hover:bg-accent-dim",
    secondary:
      "bg-slate-100 dark:bg-slate-800 text-ink-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "bg-transparent text-ink-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-ink-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-accent focus:ring-1 focus:ring-accent";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input(props, ref) {
    return <input ref={ref} className={inputCls} {...props} />;
  }
);

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`${inputCls} min-h-[100px]`}
      {...props}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputCls} {...props} />;
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "bad" | "info";
}) {
  const map = {
    neutral: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200",
    ok: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200",
    warn: "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100",
    bad: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200",
    info: "bg-sky-100 dark:bg-sky-900/40 text-sky-900 dark:text-sky-100",
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
  if (s === "open") return <Badge tone="ok">开放</Badge>;
  if (s === "draft") return <Badge tone="neutral">草稿</Badge>;
  if (s === "screening") return <Badge tone="warn">筛选中</Badge>;
  if (s === "interview") return <Badge tone="warn">候选中</Badge>;
  if (s === "shortlist") return <Badge tone="warn">短名单</Badge>;
  if (s === "filled") return <Badge tone="ok">已招满</Badge>;
  if (s === "closed") return <Badge tone="neutral">已关闭</Badge>;
  if (s === "cancelled") return <Badge tone="bad">已取消</Badge>;
  return <Badge>{status}</Badge>;
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-8 w-8 rounded-full border-2 border-slate-200 dark:border-slate-600 border-t-accent animate-spin ${className}`}
      role="status"
      aria-label="加载中"
    />
  );
}

export function PageLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-500 dark:text-slate-400">
      <Spinner />
      <span className="text-sm">加载中…</span>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-24 rounded-2xl bg-slate-200/80 dark:bg-slate-800 animate-pulse"
        />
      ))}
    </div>
  );
}

export function TableSkeleton({ cols = 4, rows = 5 }: { cols?: number; rows?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden" aria-hidden>
      <div className="grid gap-px bg-slate-200 dark:bg-slate-700" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: rows * cols }).map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
