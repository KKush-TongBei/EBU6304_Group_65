/** 系统设置页：编辑并保存全局招聘相关配置。 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { useFeedback } from "../../feedback";
import { useLocale } from "../../locale";
import type { AppSettings } from "../../types";
import AppShell from "../../AppShell";
import { Button, Card, Input } from "../../ui";

export default function AdminSettings() {
  const { toast } = useFeedback();
  const { t, te } = useLocale();
  const [s, setS] = useState<AppSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.admin
      .settings()
      .then(setS)
      .catch((e) => toast(e instanceof Error ? te(e.message) : t("common.loadFailed"), "error"));
  }, [toast, t, te]);

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
      toast(t("common.saveSuccess"), "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? te(e.message) : t("common.saveFailed"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title={t("shell.titleAdminSettings")} role="admin">
      <div className="mb-4">
        <Link to="/admin" className="text-sm text-accent hover:underline">
          ← {t("common.backToAdminHome")}
        </Link>
      </div>
      {!s ? (
        <p className="text-ink-500">{t("common.loading")}</p>
      ) : (
        <Card className="p-6 max-w-lg">
          <form onSubmit={save} className="space-y-3">
            <label className="block text-xs font-semibold text-ink-700 dark:text-slate-300">
              {t("admin.defaultMaxWeeklyHours")}
            </label>
            <Input
              type="number"
              value={s.max_ta_hours_default}
              onChange={(e) => setS({ ...s, max_ta_hours_default: Number(e.target.value) })}
            />
            <label className="block text-xs font-semibold text-ink-700 dark:text-slate-300">
              {t("admin.overloadThreshold")}
            </label>
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
              {t("admin.notificationsEnabled")}
            </label>
            <label className="block text-xs font-semibold text-ink-700 dark:text-slate-300">{t("admin.termStart")}</label>
            <Input value={s.term_start} onChange={(e) => setS({ ...s, term_start: e.target.value })} />
            <label className="block text-xs font-semibold text-ink-700 dark:text-slate-300">{t("admin.termEnd")}</label>
            <Input value={s.term_end} onChange={(e) => setS({ ...s, term_end: e.target.value })} />
            <label className="block text-xs font-semibold text-ink-700 dark:text-slate-300">{t("admin.defaultJobQuota")}</label>
            <Input
              type="number"
              min={1}
              value={s.default_job_quota ?? 1}
              onChange={(e) => setS({ ...s, default_job_quota: Math.max(1, parseInt(e.target.value, 10) || 1) })}
            />
            <label className="block text-xs font-semibold text-ink-700 dark:text-slate-300">{t("admin.semesterLabel")}</label>
            <Input
              value={s.semester_label ?? ""}
              onChange={(e) => setS({ ...s, semester_label: e.target.value })}
              placeholder={t("common.semesterExample")}
            />
            <Button type="submit" disabled={busy}>
              {busy ? t("admin.savingSettings") : t("admin.saveSettings")}
            </Button>
          </form>
        </Card>
      )}
    </AppShell>
  );
}
