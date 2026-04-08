import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "./ui";

export type ToastVariant = "success" | "error" | "info";

type ToastItem = { id: number; message: string; variant: ToastVariant };

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type FeedbackCtx = {
  toast: (message: string, variant?: ToastVariant) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const Ctx = createContext<FeedbackCtx | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const confirmResolver = useRef<((v: boolean) => void) | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);

  const toast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  const confirmFn = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      confirmResolver.current = resolve;
      setConfirmState(options);
    });
  }, []);

  const resolveConfirm = (v: boolean) => {
    setConfirmState(null);
    confirmResolver.current?.(v);
    confirmResolver.current = null;
  };

  return (
    <Ctx.Provider value={{ toast, confirm: confirmFn }}>
      {children}
      <div
        className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-lg border transition-opacity ${
              t.variant === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800"
                : t.variant === "error"
                  ? "bg-red-50 dark:bg-red-950/90 text-red-900 dark:text-red-100 border-red-200 dark:border-red-800"
                  : "bg-white dark:bg-slate-800 text-ink-900 dark:text-slate-100 border-slate-200 dark:border-slate-600"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {confirmState && (
        <div
          className="fixed inset-0 z-[190] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onKeyDown={(e) => e.key === "Escape" && resolveConfirm(false)}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6">
            <h2 id="confirm-title" className="font-display text-lg font-semibold text-ink-950 dark:text-white">
              {confirmState.title}
            </h2>
            <p className="mt-2 text-sm text-ink-600 dark:text-slate-300 whitespace-pre-wrap">
              {confirmState.message}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => resolveConfirm(false)} autoFocus>
                {confirmState.cancelText ?? "取消"}
              </Button>
              <Button
                variant={confirmState.danger ? "danger" : "primary"}
                onClick={() => resolveConfirm(true)}
              >
                {confirmState.confirmText ?? "确定"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useFeedback() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFeedback outside FeedbackProvider");
  return v;
}
