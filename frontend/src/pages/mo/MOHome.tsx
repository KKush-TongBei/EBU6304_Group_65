import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import type { Job } from "../../types";
import AppShell from "../../AppShell";
import { Badge, Card } from "../../ui";

export default function MOHome() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    api.mo.myJobs().then(setJobs).catch(() => setJobs([]));
  }, []);

  const open = jobs.filter((j) => j.status === "open").length;

  return (
    <AppShell title="课程负责人工作台" role="mo">
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card className="p-5">
          <p className="text-xs text-ink-500 dark:text-slate-400 uppercase tracking-wide">岗位总数</p>
          <p className="text-3xl font-display font-bold text-ink-950 dark:text-white mt-1">{jobs.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-500 dark:text-slate-400 uppercase tracking-wide">开放中</p>
          <p className="text-3xl font-display font-bold text-emerald-700 dark:text-emerald-400 mt-1">{open}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-500 dark:text-slate-400">快捷操作</p>
          <Link to="/mo/post" className="text-accent font-semibold text-sm mt-2 inline-block hover:underline">
            发布新岗位 →
          </Link>
        </Card>
      </div>
      <h2 className="font-display font-semibold text-lg mb-4 text-ink-950 dark:text-white">最近岗位</h2>
      {jobs.length === 0 ? (
        <Card className="p-8 text-center text-ink-500 dark:text-slate-400">暂无岗位，请先发布。</Card>
      ) : (
        <div className="space-y-2">
          {jobs.slice(0, 5).map((j) => (
            <Link key={j.id} to={`/mo/jobs/${j.id}`}>
              <Card className="p-4 hover:border-accent/30 transition cursor-pointer">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-ink-950">{j.module_name}</span>
                  {j.status === "open" ? <Badge tone="ok">开放</Badge> : <Badge tone="neutral">已关闭</Badge>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
