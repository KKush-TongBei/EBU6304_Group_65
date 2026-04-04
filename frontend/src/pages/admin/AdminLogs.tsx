import { useEffect, useState } from "react";
import { api } from "../../api";
import type { ActivityLog } from "../../types";
import AppShell from "../../AppShell";
import { Card } from "../../ui";

export default function AdminLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    api.admin.activityLogs(0, 200).then(setLogs).catch(() => setLogs([]));
  }, []);

  return (
    <AppShell title="活动日志" role="admin">
      <Card className="overflow-hidden">
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 bg-slate-100 font-semibold text-ink-700 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2">时间</th>
                <th className="px-3 py-2">操作</th>
                <th className="px-3 py-2">实体</th>
                <th className="px-3 py-2">用户</th>
                <th className="px-3 py-2">详情</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                  <td className="px-3 py-2 whitespace-nowrap text-ink-600">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-mono text-ink-900">{l.action}</td>
                  <td className="px-3 py-2 text-ink-600">
                    {l.entity_type}
                    {l.entity_id != null ? `#${l.entity_id}` : ""}
                  </td>
                  <td className="px-3 py-2">{l.actor_user_id ?? "—"}</td>
                  <td className="px-3 py-2 text-ink-500 max-w-xs truncate">
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
