import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { useFeedback } from "../../feedback";
import type { Notification } from "../../types";
import AppShell from "../../AppShell";
import { Badge, Button, Card } from "../../ui";

export default function TAHome() {
  const { toast } = useFeedback();
  const [notes, setNotes] = useState<Notification[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = useCallback(() => {
    api.notifications
      .list({ unread_only: unreadOnly })
      .then(setNotes)
      .catch(() => {
        setNotes([]);
        toast("通知加载失败", "error");
      });
  }, [unreadOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const unread = notes.filter((n) => !n.read);

  const markAll = () => {
    api.notifications.markRead().then(() => {
      setNotes((prev) => prev.map((n) => ({ ...n, read: true })));
      toast("已全部标为已读", "success");
    });
  };

  const markOne = (id: number) => {
    api.notifications.markRead([id]).then(() => {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      toast("已标为已读", "success");
    });
  };

  return (
    <AppShell title="助教工作台" role="ta">
      {unread.length > 0 && (
        <div
          className="mb-6 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
          role="status"
        >
          <div>
            <p className="font-semibold text-amber-950 dark:text-amber-100">
              您有 {unread.length} 条未读通知
            </p>
            <p className="text-sm text-amber-900 dark:text-amber-200/90 mt-1">{unread[0]?.body}</p>
          </div>
          <Button variant="secondary" onClick={markAll}>
            全部标为已读
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant={!unreadOnly ? "primary" : "secondary"} onClick={() => setUnreadOnly(false)}>
          全部通知
        </Button>
        <Button variant={unreadOnly ? "primary" : "secondary"} onClick={() => setUnreadOnly(true)}>
          仅未读
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-display font-semibold text-lg text-ink-950 dark:text-white">快速入口</h2>
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
          <h2 className="font-display font-semibold text-lg text-ink-950 dark:text-white">最近通知</h2>
          {notes.length === 0 ? (
            <p className="text-sm text-ink-500 dark:text-slate-400 mt-4">
              {unreadOnly ? "暂无未读通知" : "暂无通知"}
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {notes.slice(0, 8).map((n) => (
                <li
                  key={n.id}
                  className="text-sm border-b border-slate-100 dark:border-slate-800 pb-2 flex flex-wrap items-start justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-ink-900 dark:text-slate-100">{n.title}</span>
                      {!n.read && <Badge tone="warn">未读</Badge>}
                    </div>
                    <p className="text-ink-600 dark:text-slate-300 mt-1">{n.body}</p>
                  </div>
                  {!n.read && (
                    <Button variant="ghost" className="!py-1 !px-2 text-xs shrink-0" onClick={() => markOne(n.id)}>
                      标已读
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
