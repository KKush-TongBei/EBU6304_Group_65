import { useEffect, useState } from "react";
import { api } from "../../api";
import { useFeedback } from "../../feedback";
import type { ActivityLog } from "../../types";
import AppShell from "../../AppShell";
import { Card, PageLoading } from "../../ui";

export default function AdminLogs() {
  const { toast } = useFeedback();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin
      .activityLogs(0, 200)
      .then(setLogs)
      .catch(() => {
        setLogs([]);
        toast("日志加载失败", "error");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅挂载时拉取
  }, []);

  if (loading) {
    return (
      <AppShell title="活动日志" role="admin">
        <PageLoading />
      </AppShell>
    );
  }

  return (
    <AppShell title="活动日志" role="admin">
      <Card className="overflow-hidden">
        <div className="max-h-[70vh] overflow-y-auto overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[640px]" aria-label="系统活动日志">
            <thead className="sticky top-0 z-[1] bg-slate-100 dark:bg-slate-800 font-semibold text-ink-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th scope="col" className="px-3 py-2">
                  时间
                </th>
                <th scope="col" className="px-3 py-2">
                  操作
                </th>
                <th scope="col" className="px-3 py-2">
                  实体
                </th>
                <th scope="col" className="px-3 py-2">
                  用户
                </th>
                <th scope="col" className="px-3 py-2">
                  详情
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr
                  key={l.id}
                  className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    i % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-800/20" : ""
                  }`}
                >
                  <td className="px-3 py-2 whitespace-nowrap text-ink-600 dark:text-slate-300">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-mono text-ink-900 dark:text-slate-100">{l.action}</td>
                  <td className="px-3 py-2 text-ink-600 dark:text-slate-300">
                    {l.entity_type}
                    {l.entity_id != null ? `#${l.entity_id}` : ""}
                  </td>
                  <td className="px-3 py-2 text-ink-700 dark:text-slate-200">{l.actor_user_id ?? "—"}</td>
                  <td className="px-3 py-2 text-ink-500 dark:text-slate-400 max-w-xs truncate">
                    {l.payload ? JSON.stringify(l.payload) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
