import { useEffect, useState } from "react";
import { api } from "../../api";
import { useFeedback } from "../../feedback";
import type { Application, ApplicationStatus, Job, JobStatus } from "../../types";
import AppShell from "../../AppShell";
import { Button, Card, Input, ListSkeleton, Select, StatusBadge } from "../../ui";

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
  const [sort, setSort] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [unappliedOnly, setUnappliedOnly] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.jobs.list({
        q: q || undefined,
        skill: skill || undefined,
        status: "open",
        sort: sort || undefined,
        favorites_only: favoritesOnly,
        unapplied_only: unappliedOnly,
      }),
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
      load();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "申请失败", "error");
    }
  };

  const toggleFav = async (e: React.MouseEvent, jobId: number) => {
    e.stopPropagation();
    try {
      await api.ta.toggleFavorite(jobId);
      load();
    } catch (err2: unknown) {
      toast(err2 instanceof Error ? err2.message : "操作失败", "error");
    }
  };

  const clearFilters = () => {
    setQ("");
    setSkill("");
    setSort("");
    setFavoritesOnly(false);
    setUnappliedOnly(false);
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  return (
    <AppShell title="浏览岗位" role="ta">
      <Card className="p-4 mb-6">
        <form onSubmit={onSearchSubmit} className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[140px]">
              <label htmlFor="job-q" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block">
                关键词
              </label>
              <Input
                id="job-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="模块名或要求"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label htmlFor="job-skill" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block">
                技能
              </label>
              <Input id="job-skill" value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="如 Python" />
            </div>
            <div className="min-w-[140px]">
              <label htmlFor="job-sort" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block">
                排序
              </label>
              <Select id="job-sort" className="mt-1 w-full" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="">默认</option>
                <option value="deadline">截止日</option>
                <option value="created_at">发布时间</option>
              </Select>
            </div>
            <Button type="submit">搜索</Button>
            <Button type="button" variant="ghost" onClick={clearFilters}>
              清空条件
            </Button>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-ink-800 dark:text-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} />
              仅收藏
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={unappliedOnly} onChange={(e) => setUnappliedOnly(e.target.checked)} />
              仅未申请
            </label>
          </div>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-semibold text-lg text-ink-950 dark:text-white">{j.module_name}</h3>
                      <Button
                        type="button"
                        variant="ghost"
                        className="!py-0 !px-2 text-lg"
                        onClick={(e) => toggleFav(e, j.id)}
                        aria-label={j.favorited ? "取消收藏" : "收藏岗位"}
                        title={j.favorited ? "取消收藏" : "收藏"}
                      >
                        {j.favorited ? "★" : "☆"}
                      </Button>
                    </div>
                    <p className="text-xs text-ink-500 dark:text-slate-400 mt-1">
                      截止 {j.deadline || "—"} · 预估工时 {j.assigned_hours}h · 名额 {j.accepted_count ?? 0}/{j.quota ?? 1} ·{" "}
                      <StatusBadge status={j.status as JobStatus} />
                    </p>
                    {j.term ? (
                      <p className="text-xs text-ink-500 dark:text-slate-400 mt-0.5">学期 {j.term}</p>
                    ) : null}
                    <p className="text-sm text-ink-600 dark:text-slate-300 mt-2">{applicationSummary(existing?.status)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {existing && <StatusBadge status={existing.status} />}
                  </div>
                </div>
                <p className="text-sm text-ink-700 dark:text-slate-200 mt-3 whitespace-pre-wrap">{j.requirements}</p>
                {j.skill_tags && (
                  <p className="text-xs text-ink-500 dark:text-slate-400 mt-2">技能标签：{j.skill_tags}</p>
                )}
                {j.schedule_text ? (
                  <p className="text-xs text-ink-600 dark:text-slate-300 mt-2 whitespace-pre-wrap">时段：{j.schedule_text}</p>
                ) : null}
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
