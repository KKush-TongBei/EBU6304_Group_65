import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import type { Job } from "../../types";
import AppShell from "../../AppShell";
import { Card, StatusBadge } from "../../ui";

export default function MOHome() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api.mo.dashboard().then(setDash).catch(() => setDash(null));
    api.mo.myJobs().then(setJobs).catch(() => setJobs([]));
  }, []);

  const open = jobs.filter((j) =>
    ["open", "screening", "interview", "shortlist"].includes(j.status)
  ).length;

  return (
    <AppShell title="课程负责人工作台" role="mo">
      {dash ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="p-4">
            <p className="text-xs text-ink-500 dark:text-slate-400 uppercase tracking-wide">招聘中岗位</p>
            <p className="text-2xl font-display font-bold text-emerald-700 dark:text-emerald-400 mt-1">
              {String(dash.my_open_jobs ?? open)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-ink-500 dark:text-slate-400 uppercase tracking-wide">申请总数</p>
            <p className="text-2xl font-display font-bold text-ink-950 dark:text-white mt-1">
              {String(dash.total_applications ?? "—")}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-ink-500 dark:text-slate-400 uppercase tracking-wide">待处理申请</p>
            <p className="text-2xl font-display font-bold text-amber-700 dark:text-amber-400 mt-1">
              {String(dash.pending_applications ?? "—")}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-ink-500 dark:text-slate-400 uppercase tracking-wide">岗位填满率</p>
            <p className="text-2xl font-display font-bold text-accent mt-1">{String(dash.fill_rate_pct ?? "—")}%</p>
          </Card>
        </div>
      ) : null}
      {dash && dash.insights && typeof dash.insights === "object" ? (
        <Card className="p-4 mb-6 text-sm text-ink-600 dark:text-slate-300">
          <p className="font-semibold text-ink-800 dark:text-slate-200 mb-1">运营提示</p>
          <p>
            申请人数偏少（&lt;2）的招聘中岗位：{" "}
            <strong>{String((dash.insights as Record<string, unknown>).jobs_low_applicants ?? "—")}</strong> 个
          </p>
          <p className="mt-1">
            七日内截止的岗位：{" "}
            <strong>{String((dash.insights as Record<string, unknown>).jobs_deadline_soon ?? "—")}</strong> 个
          </p>
        </Card>
      ) : null}
      {dash ? (
        <div className="mb-8">
          <Link to="/mo/post" className="text-accent font-semibold text-sm hover:underline">
            发布新岗位 →
          </Link>
        </div>
      ) : null}
      {!dash ? (
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="p-5">
            <p className="text-xs text-ink-500 dark:text-slate-400 uppercase tracking-wide">岗位总数</p>
            <p className="text-3xl font-display font-bold text-ink-950 dark:text-white mt-1">{jobs.length}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-ink-500 dark:text-slate-400 uppercase tracking-wide">招聘中</p>
            <p className="text-3xl font-display font-bold text-emerald-700 dark:text-emerald-400 mt-1">{open}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-ink-500 dark:text-slate-400">快捷操作</p>
            <Link to="/mo/post" className="text-accent font-semibold text-sm mt-2 inline-block hover:underline">
              发布新岗位 →
            </Link>
          </Card>
        </div>
      ) : null}

      <h2 className="font-display font-semibold text-lg mb-4 text-ink-950 dark:text-white">最近岗位</h2>
      {jobs.length === 0 ? (
        <Card className="p-8 text-center text-ink-500 dark:text-slate-400">暂无岗位，请先发布。</Card>
      ) : (
        <div className="space-y-2">
          {jobs.slice(0, 5).map((j) => (
            <Link key={j.id} to={`/mo/jobs/${j.id}`}>
              <Card className="p-4 hover:border-accent/30 transition cursor-pointer">
                <div className="flex justify-between items-center gap-2 flex-wrap">
                  <span className="font-medium text-ink-950 dark:text-white">{j.module_name}</span>
                  <StatusBadge status={j.status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
