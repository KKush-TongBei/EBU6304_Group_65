import { useEffect, useState } from "react";
import { api } from "../../api";
import { useFeedback } from "../../feedback";
import type { Application } from "../../types";
import AppShell from "../../AppShell";
import { Button, Card, PageLoading, StatusBadge } from "../../ui";

export default function TAApplications() {
  const { toast, confirm } = useFeedback();
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

  useEffect(() => {
    const t = window.setInterval(() => {
      api.ta.myApplications().then(setRows).catch(() => {
        /* ignore transient polling errors */
      });
    }, 8000);
    return () => window.clearInterval(t);
  }, []);

  const withdraw = async (id: number) => {
    const ok = await confirm({
      title: "撤回申请",
      message: "确定撤回该申请？撤回后若为待处理状态可再次申请。",
      confirmText: "撤回",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.applications.withdraw(id);
      toast("已撤回", "success");
      load();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "撤回失败", "error");
    }
  };

  return (
    <AppShell title="我的申请" role="ta">
      {loading ? (
        <PageLoading />
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center text-ink-500 dark:text-slate-400">暂无申请记录。</Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-soft">
          <table className="w-full text-sm text-left" aria-label="我的申请列表">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-ink-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th scope="col" className="px-4 py-3">
                  岗位
                </th>
                <th scope="col" className="px-4 py-3">
                  状态
                </th>
                <th scope="col" className="px-4 py-3">
                  申请时间
                </th>
                <th scope="col" className="px-4 py-3">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => (
                <tr
                  key={a.id}
                  className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${
                    i % 2 === 1 ? "bg-slate-50/40 dark:bg-slate-800/20" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-ink-950 dark:text-white">
                    {a.job?.module_name ?? `#${a.job_id}`}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3 text-ink-600 dark:text-slate-300">
                    {new Date(a.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {a.status === "pending" ? (
                      <Button
                        variant="danger"
                        onClick={() => withdraw(a.id)}
                        aria-label={`撤回对 ${a.job?.module_name ?? "该岗位"} 的申请`}
                      >
                        撤回
                      </Button>
                    ) : (
                      <span className="text-ink-400 dark:text-slate-500">—</span>
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
