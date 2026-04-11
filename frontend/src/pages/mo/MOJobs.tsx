import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import type { Job, JobStatus } from "../../types";
import AppShell from "../../AppShell";
import { Card, Select, StatusBadge } from "../../ui";

export default function MOJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<string>("");

  const load = () => {
    api.mo.myJobs(filter || undefined).then(setJobs).catch(() => setJobs([]));
  };

  useEffect(() => {
    load();
  }, [filter]);

  return (
    <AppShell title="我的岗位" role="mo">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label htmlFor="job-filter" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
          按状态筛选
        </label>
        <Select
          id="job-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-48"
          aria-label="岗位状态筛选"
        >
          <option value="">全部</option>
          <option value="draft">草稿</option>
          <option value="open">开放</option>
          <option value="screening">筛选中</option>
          <option value="interview">候选中</option>
          <option value="shortlist">短名单</option>
          <option value="filled">已招满</option>
          <option value="closed">已关闭</option>
          <option value="cancelled">已取消</option>
        </Select>
      </div>
      {jobs.length === 0 ? (
        <Card className="p-12 text-center text-ink-500">
          暂无岗位。{" "}
          <Link className="text-accent font-semibold" to="/mo/post">
            去发布
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <Link key={j.id} to={`/mo/jobs/${j.id}`}>
              <Card className="p-5 hover:shadow-md transition cursor-pointer">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink-950 dark:text-white">{j.module_name}</h3>
                      {(j.pending_applications_count ?? 0) > 0 ? (
                        <span
                          className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-amber-500 text-white text-xs font-bold shadow-sm tabular-nums"
                          title="待处理申请（未推进流程）"
                          aria-label={`${j.pending_applications_count} 条待处理申请`}
                        >
                          {j.pending_applications_count}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-ink-500 dark:text-slate-400 mt-1">
                      截止 {j.deadline || "—"} · {j.assigned_hours}h/人 · 名额 {j.accepted_count ?? 0}/{j.quota ?? 1}
                    </p>
                  </div>
                  <div className="shrink-0 self-center">
                    <StatusBadge status={j.status as JobStatus} pill={false} />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
