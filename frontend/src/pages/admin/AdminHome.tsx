/** 管理员仪表盘：统计概览、风险告警（英文模式下翻译告警文案）。 */
import { useEffect, useState } from "react";
import { api, downloadWithAuth } from "../../api";
import { useFeedback } from "../../feedback";
import { useLocale } from "../../locale";
import { translateDashboardRiskAlert } from "../../translateApiMessage";
import type { WorkloadRow } from "../../types";
import AppShell from "../../AppShell";
import { Badge, Button, Card, Input, PageLoading, Select } from "../../ui";

type UserStatKey = "ta_count" | "mo_count" | "admin_count" | "mo_ta_count" | "total_user_count";

function formatDashCount(v: unknown, dash: string): string {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return String(n);
  }
  return dash;
}

export default function AdminHome() {
  const { toast } = useFeedback();
  const { locale, t, te } = useLocale();
  const [rows, setRows] = useState<WorkloadRow[]>([]);
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  const [userStatKey, setUserStatKey] = useState<UserStatKey>("ta_count");
  const [maxHours, setMaxHours] = useState("20");
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  const load = (opts?: { tableOnly?: boolean }) => {
    const tableOnly = opts?.tableOnly ?? false;
    if (tableOnly) setTableLoading(true);
    else setLoading(true);
    const m = maxHours.trim() ? parseFloat(maxHours) : undefined;
    api.admin
      .workload(m)
      .then(setRows)
      .catch((e) => toast(e instanceof Error ? te(e.message) : t("common.loadFailed"), "error"))
      .finally(() => {
        if (tableOnly) setTableLoading(false);
        else setLoading(false);
      });
  };

  useEffect(() => {
    load();
    api.admin.dashboard().then(setDash).catch(() => setDash(null));
  }, []);

  const refreshTable = () => load({ tableOnly: true });

  const exportCsv = async () => {
    try {
      await downloadWithAuth(api.admin.exportWorkloadUrl(), "workload.csv");
      toast(t("common.exportSuccess"), "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? te(e.message) : t("common.exportFailed"), "error");
    }
  };

  const riskAlerts = Array.isArray(dash?.risk_alerts) ? (dash!.risk_alerts as string[]) : [];
  const riskAlertsText =
    riskAlerts.length > 0
      ? riskAlerts.map((a) => translateDashboardRiskAlert(a, locale)).join(locale === "zh" ? "；" : "; ")
      : t("common.none");

  return (
    <AppShell title={t("shell.titleAdminOverview")} role="admin">
      {dash ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6 items-stretch">
          <Card className="p-4 h-full">
            <p className="text-xs text-ink-500 dark:text-slate-400 mb-2">{t("admin.userStats")}</p>
            <Select
              value={userStatKey}
              onChange={(e) => setUserStatKey(e.target.value as UserStatKey)}
              aria-label={t("admin.selectStat")}
              className="w-full"
            >
              <option value="ta_count">{t("roles.ta")}</option>
              <option value="mo_count">{t("roles.mo")}</option>
              <option value="admin_count">{t("admin.statAdminOnly")}</option>
              <option value="mo_ta_count">{t("admin.statMoTa")}</option>
              <option value="total_user_count">{t("admin.statTotalUsers")}</option>
            </Select>
            <p className="text-2xl font-bold text-ink-950 dark:text-white mt-3 tabular-nums">
              {formatDashCount(dash[userStatKey], t("common.dash"))}
            </p>
          </Card>
          <Card className="p-4 h-full flex flex-col min-h-[7.5rem]">
            <p className="text-xs text-ink-500 dark:text-slate-400">{t("admin.totalHours")}</p>
            <div className="flex flex-1 min-h-0 items-center justify-center">
              <p className="text-2xl font-bold text-ink-950 dark:text-white tabular-nums">
                {typeof dash.weekly_assigned_hours_sum === "number"
                  ? dash.weekly_assigned_hours_sum.toFixed(1)
                  : t("common.dash")}
              </p>
            </div>
          </Card>
          <Card className="p-4 h-full flex flex-col min-h-[7.5rem]">
            <p className="text-xs text-ink-500 dark:text-slate-400">{t("admin.overloadCount")}</p>
            <div className="flex flex-1 min-h-0 items-center justify-center">
              <p className="text-2xl font-bold text-red-700 dark:text-red-400 tabular-nums">
                {String(dash.overloaded_ta_count ?? t("common.dash"))}
              </p>
            </div>
          </Card>
          <Card className="p-4 h-full flex flex-col min-h-[7.5rem]">
            <p className="text-xs text-ink-500 dark:text-slate-400">{t("admin.riskHint")}</p>
            <div className="flex flex-1 min-h-0 items-center justify-center px-1">
              <p className="text-sm text-amber-800 dark:text-amber-200 text-center leading-snug">
                {riskAlertsText}
              </p>
            </div>
          </Card>
        </div>
      ) : null}

      {dash && dash.insights && typeof dash.insights === "object" ? (
        <Card className="p-4 mb-6 text-sm text-ink-600 dark:text-slate-300">
          <p className="font-semibold text-ink-800 dark:text-slate-200 mb-1">{t("admin.systemInsights")}</p>
          <p>
            {t("admin.notifications7d")}{" "}
            <strong>
              {String((dash.insights as Record<string, unknown>).notifications_last_7d ?? t("common.dash"))}
            </strong>
          </p>
          <p className="mt-1">
            {t("admin.stuckScreening")}{" "}
            <strong>
              {String((dash.insights as Record<string, unknown>).jobs_stuck_screening_14d ?? t("common.dash"))}
            </strong>{" "}
            {t("admin.stuckUnit")}
          </p>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label htmlFor="admin-max" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
            {t("admin.overloadThreshold")}
          </label>
          <Input
            id="admin-max"
            className="w-32 mt-1"
            value={maxHours}
            onChange={(e) => setMaxHours(e.target.value)}
          />
        </div>
        <Button onClick={refreshTable} disabled={tableLoading}>
          {tableLoading ? t("common.refreshing") : t("common.refresh")}
        </Button>
        <Button variant="secondary" onClick={exportCsv} aria-label={t("admin.exportAllCsv")}>
          {t("admin.exportAllCsv")}
        </Button>
      </div>

      {loading ? (
        <PageLoading />
      ) : (
        <div className="relative overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-soft">
          {tableLoading && (
            <div
              className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 z-10 flex items-center justify-center"
              aria-busy="true"
              aria-label={t("admin.refreshingTable")}
            >
              <span className="text-sm text-ink-600 dark:text-slate-300">{t("common.updating")}</span>
            </div>
          )}
          <table className="w-full text-sm" aria-label={t("admin.workloadTable")}>
            <thead className="bg-slate-50 dark:bg-slate-800/80 font-semibold text-ink-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-[1]">
              <tr>
                <th scope="col" className="px-4 py-3 text-left">
                  {t("admin.taCol")}
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  {t("common.email")}
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  {t("admin.hoursCol")}
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  {t("common.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.ta_user_id}
                  className={`border-b border-slate-100 dark:border-slate-800 ${
                    r.overloaded ? "bg-red-50/90 dark:bg-red-950/30" : ""
                  } ${i % 2 === 1 && !r.overloaded ? "bg-slate-50/40 dark:bg-slate-800/20" : ""}`}
                >
                  <td className="px-4 py-3 font-medium text-ink-950 dark:text-white">
                    <span className="inline-flex items-center gap-2">
                      {r.display_name}
                      {r.overloaded && (
                        <span className="text-lg" title={t("status.overloaded")} aria-hidden>
                          ⚠
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-600 dark:text-slate-300">{r.email}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-900 dark:text-slate-100">
                    {r.weekly_hours.toFixed(1)}
                  </td>
                  <td className="px-4 py-3">
                    {r.overloaded ? (
                      <span className="inline-flex items-center gap-2">
                        <Badge tone="bad">{t("status.overloaded")}</Badge>
                        <span className="text-xs text-ink-500 dark:text-slate-400">{t("status.overThreshold")}</span>
                      </span>
                    ) : (
                      <Badge tone="ok">{t("status.userActive")}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
