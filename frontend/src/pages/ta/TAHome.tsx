import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { notificationCategoryLabel, notificationRiskStyle } from "../../notificationLabels";
import { useFeedback } from "../../feedback";
import type { Notification } from "../../types";
import AppShell from "../../AppShell";
import { Button, Card } from "../../ui";

export default function TAHome() {
  const { toast } = useFeedback();
  const [notes, setNotes] = useState<Notification[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [since7, setSince7] = useState(false);
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);

  const loadDash = useCallback(() => {
    api.ta.dashboard().then(setDash).catch(() => setDash(null));
  }, []);

  const load = useCallback(() => {
    api.notifications
      .list({ unread_only: unreadOnly, since_days: since7 ? 7 : undefined })
      .then(setNotes)
      .catch(() => {
        setNotes([]);
        toast("通知加载失败", "error");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- toast 引用省略以避免无意义重渲染
  }, [unreadOnly, since7]);

  useEffect(() => {
    loadDash();
  }, [loadDash]);

  useEffect(() => {
    load();
  }, [load]);

  const unread = notes.filter((n) => !n.read);

  const markAll = () => {
    api.notifications.markRead().then(() => {
      setNotes((prev) => prev.map((n) => ({ ...n, read: true })));
      toast("已全部标为已读", "success");
      loadDash();
    });
  };

  const markOne = (id: number) => {
    api.notifications.markRead([id]).then(() => {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      toast("已标为已读", "success");
      loadDash();
    });
  };

  const deleteOne = (id: number) => {
    api.notifications
      .delete(id)
      .then(() => {
        setNotes((prev) => prev.filter((n) => n.id !== id));
        toast("已删除", "success");
        loadDash();
      })
      .catch((e: unknown) => toast(e instanceof Error ? e.message : "删除失败", "error"));
  };

  const notifLink = (n: Notification) => {
    if (n.category === "workload_alert" && n.link_job_id != null) {
      return "/ta/jobs";
    }
    if (n.link_application_id != null) {
      return "/ta/applications";
    }
    if (n.link_job_id != null) {
      return "/ta/jobs";
    }
    return null;
  };

  return (
    <AppShell title="助教工作台" role="ta">
      {dash ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="p-4">
            <p className="text-xs text-ink-500 dark:text-slate-400">我的申请</p>
            <p className="text-2xl font-bold text-ink-950 dark:text-white mt-1">
              {String(dash.applications_total ?? "—")}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-ink-500 dark:text-slate-400">待处理</p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
              {String(dash.applications_pending ?? "—")}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-ink-500 dark:text-slate-400">已录用</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
              {String(dash.applications_accepted ?? "—")}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-ink-500 dark:text-slate-400">资料完整度</p>
            <p className="text-2xl font-bold text-accent mt-1">{String(dash.profile_completeness ?? "—")}%</p>
          </Card>
        </div>
      ) : null}

      {dash && dash.insights && typeof dash.insights === "object" ? (
        <Card className="p-4 mb-6 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80">
          <h2 className="text-sm font-semibold text-ink-800 dark:text-slate-200 mb-2">系统提示（规则引擎）</h2>
          <ul className="text-sm text-ink-600 dark:text-slate-300 space-y-1 list-disc list-inside">
            <li>
              七日内截止的可申请岗位约{" "}
              <strong>{String((dash.insights as Record<string, unknown>).deadline_soon_count ?? "—")}</strong> 个
            </li>
            <li>
              资料待补字段：{" "}
              {Array.isArray((dash.insights as Record<string, unknown>).missing_profile_fields) &&
              ((dash.insights as Record<string, string[]>).missing_profile_fields?.length ?? 0) > 0
                ? (dash.insights as Record<string, string[]>).missing_profile_fields.join("、")
                : "无"}
            </li>
          </ul>
        </Card>
      ) : null}

      {unread.length > 0 && (
        <div
          className="mb-6 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
          role="status"
        >
          <div className="min-w-0">
            <p className="font-semibold text-amber-950 dark:text-amber-100">
              您有 {unread.length} 条未读通知
            </p>
            <p className="text-sm text-amber-900 dark:text-amber-200/90 mt-1">{unread[0]?.body}</p>
            {unread[0] && notifLink(unread[0]) ? (
              <Link
                to={notifLink(unread[0])!}
                className="text-sm font-semibold text-accent mt-2 inline-block hover:underline"
              >
                点击查看 / 前往相关页面 →
              </Link>
            ) : null}
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
        <Button variant={since7 ? "primary" : "secondary"} onClick={() => setSince7((v) => !v)}>
          {since7 ? "最近 7 天（开）" : "最近 7 天"}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-display font-semibold text-lg text-ink-950 dark:text-white">快速入口</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link className="text-accent font-medium hover:underline" to="/ta/profile">
                编辑个人资料与简历
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
            <li>
              <Link className="text-accent font-medium hover:underline" to="/ta/notifications">
                通知中心（筛选、全部标已读）
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
              {notes.slice(0, 8).map((n) => {
                const href = notifLink(n);
                const risk = notificationRiskStyle(n.category);
                return (
                  <li
                    key={n.id}
                    className={`text-sm border-b border-slate-100 dark:border-slate-800 pb-2 flex flex-wrap items-start justify-between gap-2 ${
                      risk ? "rounded-lg bg-amber-50/80 dark:bg-amber-950/30 px-2 py-2 -mx-1" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      {href ? (
                        <Link
                          to={href}
                          className="block rounded-lg -mx-1 px-1 py-1 hover:bg-slate-100 dark:hover:bg-slate-800/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                        >
                          <div className="mb-1">
                            {n.read ? (
                              <span className="inline-block rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                                已读
                              </span>
                            ) : (
                              <span className="inline-block rounded-md bg-amber-400 px-2 py-0.5 text-[11px] font-semibold text-amber-950 dark:bg-amber-500 dark:text-amber-950">
                                未读
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-ink-900 dark:text-slate-100">{n.title}</span>
                            {n.category ? (
                              <span className="text-xs text-ink-500 dark:text-slate-400">
                                [{notificationCategoryLabel(n.category)}]
                              </span>
                            ) : null}
                          </div>
                          <p className="text-ink-600 dark:text-slate-300 mt-1">{n.body}</p>
                          <span className="text-accent text-xs mt-1 inline-block">点击进入浏览岗位 / 相关页面 →</span>
                        </Link>
                      ) : (
                        <>
                          <div className="mb-1">
                            {n.read ? (
                              <span className="inline-block rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                                已读
                              </span>
                            ) : (
                              <span className="inline-block rounded-md bg-amber-400 px-2 py-0.5 text-[11px] font-semibold text-amber-950 dark:bg-amber-500 dark:text-amber-950">
                                未读
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-ink-900 dark:text-slate-100">{n.title}</span>
                            {n.category ? (
                              <span className="text-xs text-ink-500 dark:text-slate-400">
                                [{notificationCategoryLabel(n.category)}]
                              </span>
                            ) : null}
                          </div>
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
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
