import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { useFeedback } from "../../feedback";
import type { AppSettings } from "../../types";
import AppShell from "../../AppShell";
import { Button, Card, Input } from "../../ui";

export default function AdminSettings() {
  const { toast } = useFeedback();
  const [s, setS] = useState<AppSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.admin
      .settings()
      .then(setS)
      .catch((e) => toast(e instanceof Error ? e.message : "加载失败", "error"));
  }, [toast]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!s) return;
    setBusy(true);
    try {
      const next = await api.admin.patchSettings({
        max_ta_hours_default: s.max_ta_hours_default,
        notifications_enabled: s.notifications_enabled,
        term_start: s.term_start,
        term_end: s.term_end,
        overload_threshold_hours: s.overload_threshold_hours,
        default_job_quota: s.default_job_quota ?? 1,
        semester_label: s.semester_label ?? "",
      });
      setS(next);
      toast("已保存", "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "保存失败", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="管理员 · 系统设置" role="admin">
      <div className="mb-4">
        <Link to="/admin" className="text-sm text-accent hover:underline">
          ← 返回管理员首页
        </Link>
      </div>
      {!s ? (
        <p className="text-ink-500">加载中…</p>
      ) : (
        <Card className="p-6 max-w-lg">
          <form onSubmit={save} className="space-y-3">
            <label className="block text-xs font-semibold text-ink-700 dark:text-slate-300">默认最大工时</label>
            <Input
              type="number"
              value={s.max_ta_hours_default}
              onChange={(e) => setS({ ...s, max_ta_hours_default: Number(e.target.value) })}
            />
            <label className="block text-xs font-semibold text-ink-700 dark:text-slate-300">超载阈值（小时）</label>
            <Input
              type="number"
              value={s.overload_threshold_hours}
              onChange={(e) => setS({ ...s, overload_threshold_hours: Number(e.target.value) })}
            />
            <label className="flex items-center gap-2 text-sm text-ink-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={s.notifications_enabled}
                onChange={(e) => setS({ ...s, notifications_enabled: e.target.checked })}
              />
              启用系统通知
            </label>
            <label className="block text-xs font-semibold text-ink-700 dark:text-slate-300">学期开始</label>
            <Input value={s.term_start} onChange={(e) => setS({ ...s, term_start: e.target.value })} />
            <label className="block text-xs font-semibold text-ink-700 dark:text-slate-300">学期结束</label>
            <Input value={s.term_end} onChange={(e) => setS({ ...s, term_end: e.target.value })} />
            <label className="block text-xs font-semibold text-ink-700 dark:text-slate-300">MO 发帖默认名额</label>
            <Input
              type="number"
              min={1}
              value={s.default_job_quota ?? 1}
              onChange={(e) => setS({ ...s, default_job_quota: Math.max(1, parseInt(e.target.value, 10) || 1) })}
            />
            <label className="block text-xs font-semibold text-ink-700 dark:text-slate-300">学期标签（默认填入岗位 term）</label>
            <Input
              value={s.semester_label ?? ""}
              onChange={(e) => setS({ ...s, semester_label: e.target.value })}
              placeholder="如 2025-2026-1"
            />
            <Button type="submit" disabled={busy}>
              {busy ? "保存中…" : "保存设置"}
            </Button>
          </form>
        </Card>
      )}
    </AppShell>
  );
}
