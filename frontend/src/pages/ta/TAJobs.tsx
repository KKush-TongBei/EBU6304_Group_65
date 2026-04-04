import { useEffect, useState } from "react";
import { api } from "../../api";
import { useFeedback } from "../../feedback";
import type { Application, ApplicationStatus, Job } from "../../types";
import AppShell from "../../AppShell";
import { Badge, Button, Card, Input, ListSkeleton, StatusBadge } from "../../ui";

function applicationSummary(status: ApplicationStatus | undefined): string {
  if (!status) return "尚未申请";
  switch (status) {
    case "pending":
      return "您已申请，当前待处理";
    case "accepted":
      return "您已被录用";
    case "rejected":
      return "本次申请未通过";
    case "withdrawn":
      return "您已撤回，可再次申请";
    default:
      return "";
  }
}

export default function TAJobs() {
  const { toast } = useFeedback();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [q, setQ] = useState("");
  const [skill, setSkill] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.jobs.list({ q: q || undefined, skill: skill || undefined, status: "open" }),
      api.ta.myApplications(),
    ])
      .then(([j, a]) => {
        setJobs(j);
        setApps(a);
        setErr("");
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "加载失败"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const appByJob = new Map(apps.map((a) => [a.job_id, a]));

  const apply = async (jobId: number) => {
    try {
      await api.jobs.apply(jobId);
      const a = await api.ta.myApplications();
      setApps(a);
      toast("申请已提交", "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "申请失败", "error");
    }
  };

  const clearFilters = () => {
    setQ("");
    setSkill("");
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  return (
    <AppShell title="浏览岗位" role="ta">
      <Card className="p-4 mb-6">
        <form onSubmit={onSearchSubmit} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
            <label htmlFor="job-q" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block">
              关键词
            </label>
            <Input
              id="job-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="模块名或要求"
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.form?.requestSubmit();
              }}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label htmlFor="job-skill" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block">
              技能
            </label>
            <Input
              id="job-skill"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              placeholder="如 Python"
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.form?.requestSubmit();
              }}
            />
          </div>
          <Button type="submit">搜索</Button>
          <Button type="button" variant="ghost" onClick={clearFilters}>
            清空条件
          </Button>
        </form>
      </Card>

      {err && (
        <p className="text-red-600 dark:text-red-400 text-sm mb-4" role="alert">
          {err}
        </p>
      )}
      {loading ? (
        <ListSkeleton rows={5} />
      ) : jobs.length === 0 ? (
        <Card className="p-12 text-center text-ink-500 dark:text-slate-400">未找到符合条件的开放岗位。</Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((j) => {
            const existing = appByJob.get(j.id);
            const showApply = !existing || existing.status === "withdrawn";
            return (
              <Card key={j.id} className="p-5 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                <div className="flex flex-wrap justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display font-semibold text-lg text-ink-950 dark:text-white">{j.module_name}</h3>
                    <p className="text-xs text-ink-500 dark:text-slate-400 mt-1">
                      截止 {j.deadline || "—"} · 预估工时 {j.assigned_hours}h · <StatusBadge status="open" />
                    </p>
                    <p className="text-sm text-ink-600 dark:text-slate-300 mt-2">
                      {applicationSummary(existing?.status)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {existing && <StatusBadge status={existing.status} />}
                  </div>
                </div>
                <p className="text-sm text-ink-700 dark:text-slate-200 mt-3 whitespace-pre-wrap">{j.requirements}</p>
                {j.skill_tags && (
                  <p className="text-xs text-ink-500 dark:text-slate-400 mt-2">技能标签：{j.skill_tags}</p>
                )}
                <div className="mt-4">
                  {showApply ? (
                    <Button onClick={() => apply(j.id)}>申请</Button>
                  ) : existing?.status === "pending" ? (
                    <span className="text-sm text-ink-500 dark:text-slate-400">
                      请在「我的申请」中撤回（若需）
                    </span>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
