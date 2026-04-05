import { useEffect, useState } from "react";
import { api, downloadWithAuth } from "../../api";
import { useFeedback } from "../../feedback";
import type { ActivityLog } from "../../types";
import AppShell from "../../AppShell";
import { Button, Card, Input } from "../../ui";

export default function AdminLogs() {
  const { toast } = useFeedback();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [entityType, setEntityType] = useState("");

  const fetchLogs = () => {
    setLoading(true);
    const actorNum = actor.trim() ? parseInt(actor.trim(), 10) : NaN;
    api.admin
      .activityLogs({
        skip: 0,
        limit: 200,
        actor_user_id: Number.isFinite(actorNum) ? actorNum : undefined,
        action: action.trim() || undefined,
        from: from.trim() || undefined,
        to: to.trim() || undefined,
        entity_type: entityType.trim() || undefined,
      })
      .then(setLogs)
      .catch(() => {
        setLogs([]);
        toast("日志加载失败", "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅首屏
  }, []);

  const exportCsv = async () => {
    const actorNum = actor.trim() ? parseInt(actor.trim(), 10) : NaN;
    try {
      await downloadWithAuth(
        api.admin.exportActivityLogsUrl({
          actor_user_id: Number.isFinite(actorNum) ? actorNum : undefined,
          action: action.trim() || undefined,
          from: from.trim() || undefined,
          to: to.trim() || undefined,
          entity_type: entityType.trim() || undefined,
        }),
        "activity_logs.csv"
      );
      toast("导出成功", "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "导出失败", "error");
    }
  };

  return (
    <AppShell title="活动日志" role="admin">
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label htmlFor="log-actor" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block">
              操作者用户 ID
            </label>
            <Input id="log-actor" className="mt-1 w-32" value={actor} onChange={(e) => setActor(e.target.value)} />
          </div>
          <div>
            <label htmlFor="log-action" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block">
              动作（精确匹配）
            </label>
            <Input
              id="log-action"
              className="mt-1 w-40"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="如 job_created"
            />
          </div>
          <div>
            <label htmlFor="log-from" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block">
              起始时间 ISO
            </label>
            <Input id="log-from" className="mt-1 w-48" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label htmlFor="log-to" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block">
              结束时间 ISO
            </label>
            <Input id="log-to" className="mt-1 w-48" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label htmlFor="log-entity" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block">
              实体类型
            </label>
            <Input
              id="log-entity"
              className="mt-1 w-28"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              placeholder="job / user"
            />
          </div>
          <Button type="button" onClick={fetchLogs} disabled={loading}>
            查询
          </Button>
          <Button type="button" variant="secondary" onClick={exportCsv}>
            导出 CSV
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden relative">
        {loading ? (
          <div className="absolute inset-0 z-[1] bg-white/70 dark:bg-slate-900/70 flex items-center justify-center text-sm text-ink-600">
            加载中…
          </div>
        ) : null}
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
                {logs.map((l, i) => {
                  const risk =
                    l.action.includes("application_accepted") ||
                    l.action.includes("application_rejected") ||
                    l.action.includes("config_changed");
                  return (
                  <tr
                    key={l.id}
                    className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      i % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-800/20" : ""
                    } ${risk ? "bg-amber-50/80 dark:bg-amber-950/25" : ""}`}
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
                  );
                })}
              </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
