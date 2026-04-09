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

export function StatCard({
  title,
  value,
  tone = "neutral",
  className = "",
}: {
  title: string;
  value: ReactNode;
  tone?: "neutral" | "warn" | "ok" | "bad";
  className?: string;
}) {
  const valueTone = {
    neutral: "text-ink-950 dark:text-white",
    warn: "text-amber-600 dark:text-amber-400",
    ok: "text-emerald-600 dark:text-emerald-400",
    bad: "text-red-600 dark:text-red-400",
  };
  return (
    <div className={`${cardBase} p-5 ${className}`}>
      <p className="text-xs font-medium text-ink-500 dark:text-slate-400 uppercase tracking-wide">{title}</p>
      <p className={`text-3xl font-display font-bold mt-1 tabular-nums ${valueTone[tone]}`}>{value}</p>
    </div>
  );
}

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "ghost"
  | "outlineInfo"
  | "outlineSuccess"
  | "outlineDanger"
  | "outlineMuted";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:opacity-50";
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-accent text-white hover:bg-accent-dim",
    secondary:
      "bg-slate-100 dark:bg-slate-800 text-ink-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "bg-transparent text-ink-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800",
    outlineInfo:
      "border-2 border-sky-500 text-sky-600 dark:text-sky-400 bg-transparent hover:bg-sky-50 dark:hover:bg-sky-950/50",
    outlineSuccess:
      "border-2 border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-transparent hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
    outlineDanger:
      "border-2 border-red-500 text-red-600 dark:text-red-400 bg-transparent hover:bg-red-50 dark:hover:bg-red-950/40",
    outlineMuted:
      "border-2 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80",
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
  function Input({ className = "", ...props }, ref) {
    return <input ref={ref} className={`${inputCls} ${className}`} {...props} />;
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
  pill = false,
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "bad" | "info";
  pill?: boolean;
}) {
  const map = {
    neutral: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200",
    ok: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200",
    warn: "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100",
    bad: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200",
    info: "bg-sky-100 dark:bg-sky-900/40 text-sky-900 dark:text-sky-100",
  };
  const shape = pill ? "rounded-full px-2.5 py-0.5" : "rounded-lg px-2 py-0.5";
  return (
    <span className={`inline-flex ${shape} text-xs font-semibold ${map[tone]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "pending") return <Badge tone="warn" pill>已申请</Badge>;
  if (s === "interviewing") return <Badge tone="info" pill>面试中</Badge>;
  if (s === "accepted") return <Badge tone="ok" pill>已录用</Badge>;
  if (s === "rejected") return <Badge tone="bad" pill>已拒绝</Badge>;
  if (s === "withdrawn") return <Badge tone="neutral" pill>已撤回</Badge>;
  if (s === "open") return <Badge tone="ok" pill>开放</Badge>;
  if (s === "draft") return <Badge tone="neutral" pill>草稿</Badge>;
  if (s === "screening") return <Badge tone="warn" pill>筛选中</Badge>;
  if (s === "interview") return <Badge tone="warn" pill>候选中</Badge>;
  if (s === "shortlist") return <Badge tone="warn" pill>短名单</Badge>;
  if (s === "filled") return <Badge tone="ok" pill>已招满</Badge>;
  if (s === "closed") return <Badge tone="neutral" pill>已关闭</Badge>;
  if (s === "cancelled") return <Badge tone="bad" pill>已取消</Badge>;
  return <Badge pill>{status}</Badge>;
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

/** Small icons for table action buttons (stroke inherits `currentColor`). */
export function IconEye({ className = "w-4 h-4 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

export function IconCheck({ className = "w-4 h-4 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function IconX({ className = "w-4 h-4 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
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
