import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import type { Notification } from "../../types";
import AppShell from "../../AppShell";
import { Badge, Button, Card } from "../../ui";

export default function TAHome() {
  const [notes, setNotes] = useState<Notification[]>([]);

  useEffect(() => {
    api.notifications.list().then(setNotes).catch(() => setNotes([]));
  }, []);

  const unread = notes.filter((n) => !n.read);

  const markAll = () => {
    api.notifications.markRead().then(() => {
      setNotes((prev) => prev.map((n) => ({ ...n, read: true })));
    });
  };

  return (
    <AppShell title="助教工作台" role="ta">
      {unread.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-amber-950">您有 {unread.length} 条未读通知</p>
            <p className="text-sm text-amber-900 mt-1">{unread[0]?.body}</p>
          </div>
          <Button variant="secondary" onClick={markAll}>
            全部标为已读
          </Button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-display font-semibold text-lg text-ink-950">快速入口</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link className="text-accent font-medium hover:underline" to="/ta/profile">
                编辑个人资料与 CV 路径
              </Link>
            </li>
            <li>
              <Link className="text-accent font-medium hover:underline" to="/ta/jobs">
                浏览开放岗位并申请
              </Link>
            </li>
            <li>
              <Link className="text-accent font-medium hover:underline" to="/ta/applications">
                查看申请状态与撤回待处理申请
              </Link>
            </li>
          </ul>
        </Card>
        <Card className="p-6">
          <h2 className="font-display font-semibold text-lg text-ink-950">最近通知</h2>
          {notes.length === 0 ? (
            <p className="text-sm text-ink-500 mt-4">暂无通知</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {notes.slice(0, 5).map((n) => (
                <li key={n.id} className="text-sm border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink-900">{n.title}</span>
                    {!n.read && <Badge tone="warn">未读</Badge>}
                  </div>
                  <p className="text-ink-600 mt-1">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
