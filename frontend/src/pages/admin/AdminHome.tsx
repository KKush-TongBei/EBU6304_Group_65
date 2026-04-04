import { useEffect, useState } from "react";
import { api, downloadWithAuth } from "../../api";
import { useFeedback } from "../../feedback";
import type { WorkloadRow } from "../../types";
import AppShell from "../../AppShell";
import { Badge, Button, Input, PageLoading } from "../../ui";

export default function AdminHome() {
  const { toast } = useFeedback();
  const [rows, setRows] = useState<WorkloadRow[]>([]);
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

  return (
    <AppShell title="管理员 · 工作量" role="admin">
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label htmlFor="admin-max" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
            超负荷阈值（小时）
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
                  总工时
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
                    {r.total_hours.toFixed(1)}
                  </td>
                  <td className="px-4 py-3">
                    {r.overloaded ? (
                      <Badge tone="bad">超负荷</Badge>
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
