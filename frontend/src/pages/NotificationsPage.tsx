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

  const deleteOne = (id: number) => {
    api.notifications
      .delete(id)
      .then(() => {
        setNotes((prev) => prev.filter((n) => n.id !== id));
        toast("已删除", "success");
      })
      .catch((e: unknown) => toast(e instanceof Error ? e.message : "删除失败", "error"));
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
                    <div className="min-w-0 flex-1">
                      <div className="mb-2">
                        {n.read ? (
                          <span className="inline-block rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                            已读
                          </span>
                        ) : (
                          <span className="inline-block rounded-md bg-amber-400 px-2.5 py-1 text-xs font-semibold text-amber-950 shadow-sm dark:bg-amber-500 dark:text-amber-950">
                            未读
                          </span>
                        )}
                      </div>
                      {href ? (
                        <Link
                          to={href}
                          className="block rounded-lg -mx-1 px-1 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                        >
                          <span className="font-semibold text-ink-900 dark:text-slate-100">{n.title}</span>
                          {n.category ? (
                            <span className="text-xs text-ink-500 dark:text-slate-400 ml-2">[{n.category}]</span>
                          ) : null}
                          <p className="text-ink-600 dark:text-slate-300 mt-1">{n.body}</p>
                          <span className="text-accent text-xs mt-2 inline-block">点击进入相关页面 →</span>
                        </Link>
                      ) : (
                        <>
                          <span className="font-semibold text-ink-900 dark:text-slate-100">{n.title}</span>
                          {n.category ? (
                            <span className="text-xs text-ink-500 dark:text-slate-400 ml-2">[{n.category}]</span>
                          ) : null}
                          <p className="text-ink-600 dark:text-slate-300 mt-1">{n.body}</p>
                        </>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {!n.read && (
                        <Button variant="ghost" className="!py-1 !px-2 text-xs" onClick={() => markOne(n.id)}>
                          标已读
                        </Button>
                      )}
                      {n.read && (
                        <Button
                          variant="ghost"
                          className="!py-1 !px-2 text-xs text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          onClick={() => deleteOne(n.id)}
                        >
                          删除
                        </Button>
                      )}
                    </div>
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
