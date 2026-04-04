import { useEffect, useState } from "react";
import { api } from "../../api";
import type { Application } from "../../types";
import AppShell from "../../AppShell";
import { Button, Card, StatusBadge } from "../../ui";

export default function TAApplications() {
  const [rows, setRows] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.ta
      .myApplications()
      .then(setRows)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const withdraw = async (id: number) => {
    if (!confirm("确定撤回该申请？")) return;
    try {
      await api.applications.withdraw(id);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "撤回失败");
    }
  };

  return (
    <AppShell title="我的申请" role="ta">
      {loading ? (
        <p className="text-ink-500">加载中…</p>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center text-ink-500">暂无申请记录。</Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-soft">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-ink-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">岗位</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">申请时间</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-ink-950">
                    {a.job?.module_name ?? `#${a.job_id}`}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    {new Date(a.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {a.status === "pending" ? (
                      <Button variant="danger" onClick={() => withdraw(a.id)}>
                        撤回
                      </Button>
                    ) : (
                      <span className="text-ink-400">—</span>
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
