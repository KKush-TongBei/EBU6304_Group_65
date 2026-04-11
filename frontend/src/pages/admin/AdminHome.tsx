import { useEffect, useState } from "react";
import { api, downloadWithAuth } from "../../api";
import { useFeedback } from "../../feedback";
import type { WorkloadRow } from "../../types";
import AppShell from "../../AppShell";
import { Badge, Button, Card, Input, PageLoading, Select } from "../../ui";

type UserStatKey = "ta_count" | "mo_count" | "admin_count" | "mo_ta_count" | "total_user_count";

function formatDashCount(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return String(n);
  }
  return "—";
}

export default function AdminHome() {
  const { toast } = useFeedback();
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
      .catch((e) => toast(e instanceof Error ? e.message : "加载失败", "error"))
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
      toast("导出成功", "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "导出失败", "error");
    }
  };

  const riskAlerts = Array.isArray(dash?.risk_alerts) ? (dash!.risk_alerts as string[]) : [];

  return (
    <AppShell title="管理员 · 总览" role="admin">
      {dash ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6 items-stretch">
          <Card className="p-4 h-full">
            <p className="text-xs text-ink-500 dark:text-slate-400 mb-2">用户统计</p>
            <Select
              value={userStatKey}
              onChange={(e) => setUserStatKey(e.target.value as UserStatKey)}
              aria-label="选择统计项"
              className="w-full"
            >
              <option value="ta_count">助教 (TA)</option>
              <option value="mo_count">课程负责人 (MO)</option>
              <option value="admin_count">管理员</option>
              <option value="mo_ta_count">MO + TA</option>
              <option value="total_user_count">用户合计 (MO+TA+Admin)</option>
            </Select>
            <p className="text-2xl font-bold text-ink-950 dark:text-white mt-3 tabular-nums">
              {formatDashCount(dash[userStatKey])}
            </p>
          </Card>
          <Card className="p-4 h-full flex flex-col min-h-[7.5rem]">
            <p className="text-xs text-ink-500 dark:text-slate-400">已分配工时合计（各岗位每周工时之和）</p>
            <div className="flex flex-1 min-h-0 items-center justify-center">
              <p className="text-2xl font-bold text-ink-950 dark:text-white tabular-nums">
                {typeof dash.weekly_assigned_hours_sum === "number" ? dash.weekly_assigned_hours_sum.toFixed(1) : "—"}
              </p>
            </div>
          </Card>
          <Card className="p-4 h-full flex flex-col min-h-[7.5rem]">
            <p className="text-xs text-ink-500 dark:text-slate-400">超负荷人数</p>
            <div className="flex flex-1 min-h-0 items-center justify-center">
              <p className="text-2xl font-bold text-red-700 dark:text-red-400 tabular-nums">
                {String(dash.overloaded_ta_count ?? "—")}
              </p>
            </div>
          </Card>
          <Card className="p-4 h-full flex flex-col min-h-[7.5rem]">
            <p className="text-xs text-ink-500 dark:text-slate-400">风险提示</p>
            <div className="flex flex-1 min-h-0 items-center justify-center px-1">
              <p className="text-sm text-amber-800 dark:text-amber-200 text-center leading-snug">
                {riskAlerts.length ? riskAlerts.join("；") : "无"}
              </p>
            </div>
          </Card>
        </div>
      ) : null}

      {dash && dash.insights && typeof dash.insights === "object" ? (
        <Card className="p-4 mb-6 text-sm text-ink-600 dark:text-slate-300">
          <p className="font-semibold text-ink-800 dark:text-slate-200 mb-1">系统洞察</p>
          <p>
            最近 7 天新增通知条数：{" "}
            <strong>{String((dash.insights as Record<string, unknown>).notifications_last_7d ?? "—")}</strong>
          </p>
          <p className="mt-1">
            screening 阶段超过 14 天未更新的岗位：{" "}
            <strong>{String((dash.insights as Record<string, unknown>).jobs_stuck_screening_14d ?? "—")}</strong> 个
          </p>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label htmlFor="admin-max" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
            超负荷阈值（工时/周）
          </label>
          <Input
            id="admin-max"
            className="w-32 mt-1"
            value={maxHours}
            onChange={(e) => setMaxHours(e.target.value)}
          />
        </div>
        <Button onClick={refreshTable} disabled={tableLoading}>
          {tableLoading ? "刷新中…" : "刷新"}
        </Button>
        <Button variant="secondary" onClick={exportCsv} aria-label="导出全部工时 CSV">
          导出全部 CSV
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
              aria-label="正在刷新"
            >
              <span className="text-sm text-ink-600 dark:text-slate-300">更新中…</span>
            </div>
          )}
          <table className="w-full text-sm" aria-label="助教工作量">
            <thead className="bg-slate-50 dark:bg-slate-800/80 font-semibold text-ink-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-[1]">
              <tr>
                <th scope="col" className="px-4 py-3 text-left">
                  助教
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  邮箱
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  每周工时累计
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  状态
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
                        <span className="text-lg" title="超负荷" aria-hidden>
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
                        <Badge tone="bad">超负荷</Badge>
                        <span className="text-xs text-ink-500 dark:text-slate-400">超阈值（工时/周）</span>
                      </span>
                    ) : (
                      <Badge tone="ok">正常</Badge>
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
