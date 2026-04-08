import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useFeedback } from "../feedback";
import type { Notification } from "../types";
import type { UserRole } from "../types";
import AppShell from "../AppShell";
import { Button, Card } from "../ui";

function homeForRole(role: UserRole) {
  if (role === "ta") return "/ta";
  if (role === "mo") return "/mo";
  return "/admin";
}

export default function NotificationsPage({ role }: { role: UserRole }) {
  const { toast } = useFeedback();
  const [notes, setNotes] = useState<Notification[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [since7, setSince7] = useState(false);

  const load = useCallback(() => {
    api.notifications
      .list({ unread_only: unreadOnly, since_days: since7 ? 7 : undefined })
      .then(setNotes)
      .catch(() => {
        setNotes([]);
        toast("通知加载失败", "error");
      });
  }, [unreadOnly, since7, toast]);

  useEffect(() => {
    load();
  }, [load]);

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

  const notifLink = (n: Notification) => {
    if (role === "ta") {
      if (n.link_application_id != null) return "/ta/applications";
      if (n.link_job_id != null) return "/ta/jobs";
    }
    if (role === "mo") {
      if (n.link_job_id != null) return `/mo/jobs/${n.link_job_id}`;
    }
    return null;
  };

  const title =
    role === "ta" ? "助教工作台" : role === "mo" ? "课程负责人工作台" : "管理员 · 通知";

  return (
    <AppShell title={title} role={role}>
      <div className="mb-4">
        <Link to={homeForRole(role)} className="text-sm text-accent hover:underline">
          ← 返回总览
        </Link>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant={!unreadOnly ? "primary" : "secondary"} onClick={() => setUnreadOnly(false)}>
          全部通知
        </Button>
        <Button variant={unreadOnly ? "primary" : "secondary"} onClick={() => setUnreadOnly(true)}>
          仅未读
        </Button>
        <Button variant={since7 ? "primary" : "secondary"} onClick={() => setSince7((v) => !v)}>
          {since7 ? "最近 7 天（开）" : "最近 7 天"}
        </Button>
        <Button variant="secondary" onClick={markAll}>
          全部标为已读
        </Button>
      </div>
      <Card className="p-6">
        {notes.length === 0 ? (
          <p className="text-sm text-ink-500 dark:text-slate-400">
            {unreadOnly ? "暂无未读通知" : "暂无通知"}
          </p>
        ) : (
          <ul className="space-y-4">
            {notes.map((n) => {
              const href = notifLink(n);
              const risk = n.category === "decision" || n.category === "workload_alert";
              return (
                <li
                  key={n.id}
                  className={`border-b border-slate-100 dark:border-slate-800 pb-4 text-sm ${
                    risk ? "rounded-lg bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2 -mx-1" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-ink-900 dark:text-slate-100">{n.title}</span>
                      {n.category ? (
                        <span className="text-xs text-ink-500 dark:text-slate-400 ml-2">[{n.category}]</span>
                      ) : null}
                      <p className="text-ink-600 dark:text-slate-300 mt-1">{n.body}</p>
                      {href ? (
                        <Link to={href} className="text-accent text-xs mt-2 inline-block hover:underline">
                          前往相关页面 →
                        </Link>
                      ) : null}
                    </div>
                    {!n.read && (
                      <Button variant="ghost" className="!py-1 !px-2 text-xs shrink-0" onClick={() => markOne(n.id)}>
                        标已读
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </AppShell>
  );
}
