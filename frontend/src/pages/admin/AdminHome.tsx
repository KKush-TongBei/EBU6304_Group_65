import { useEffect, useState } from "react";
import { api, downloadWithAuth } from "../../api";
import type { WorkloadRow } from "../../types";
import AppShell from "../../AppShell";
import { Badge, Button, Card, Input } from "../../ui";

export default function AdminHome() {
  const [rows, setRows] = useState<WorkloadRow[]>([]);
  const [maxHours, setMaxHours] = useState("20");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const m = maxHours.trim() ? parseFloat(maxHours) : undefined;
    api.admin
      .workload(m)
      .then(setRows)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell title="管理员 · 工作量" role="admin">
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label className="text-xs font-semibold text-ink-700">超负荷阈值（小时）</label>
          <Input
            className="w-32 mt-1"
            value={maxHours}
            onChange={(e) => setMaxHours(e.target.value)}
          />
        </div>
        <Button onClick={load}>刷新</Button>
        <Button variant="secondary" onClick={() => downloadWithAuth(api.admin.exportWorkloadUrl(), "workload.csv")}>
          导出全部 CSV
        </Button>
      </div>

      {loading ? (
        <p className="text-ink-500">加载中…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 font-semibold text-ink-700 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left">助教</th>
                <th className="px-4 py-3 text-left">邮箱</th>
                <th className="px-4 py-3 text-right">总工时</th>
                <th className="px-4 py-3 text-left">状态</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.ta_user_id}
                  className={`border-b border-slate-100 ${r.overloaded ? "bg-red-50/80" : ""}`}
                >
                  <td className="px-4 py-3 font-medium text-ink-950">{r.display_name}</td>
                  <td className="px-4 py-3 text-ink-600">{r.email}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.total_hours.toFixed(1)}</td>
                  <td className="px-4 py-3">
                    {r.overloaded ? <Badge tone="bad">超负荷</Badge> : <Badge tone="ok">正常</Badge>}
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
