import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../AuthContext";
import { useFeedback } from "../../feedback";
import type { Application, ApplicationStatus, Job, JobStatus } from "../../types";
import AppShell from "../../AppShell";
import { Button, Card, Input, ListSkeleton, Select, StatusBadge } from "../../ui";

function jobAcceptingApplications(status: JobStatus): boolean {
  return status === "open" || status === "screening" || status === "interview" || status === "shortlist";
}

type JobListScope = "open" | "closed";

/** Sum weekly hours from applications in pending / interviewing / accepted (matches backend workload). */
function weeklyHoursFromActiveApps(apps: Application[]): number {
  let sum = 0;
  for (const a of apps) {
    if (a.status !== "pending" && a.status !== "interviewing" && a.status !== "accepted") {
      continue;
    }
    sum += a.job?.assigned_hours ?? 0;
  }
  return sum;
}

/** Weekly hours if this job were active: if already counted in active apps, no extra add. */
function projectedWeeklyHoursAfterApply(apps: Application[], job: Job): number {
  const base = weeklyHoursFromActiveApps(apps);
  const app = apps.find((x) => x.job_id === job.id);
  if (
    app &&
    (app.status === "pending" || app.status === "interviewing" || app.status === "accepted")
  ) {
    return base;
  }
  return base + job.assigned_hours;
}

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
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [q, setQ] = useState("");
  const [skill, setSkill] = useState("");
  const [sort, setSort] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [unappliedOnly, setUnappliedOnly] = useState(false);
  const [listScope, setListScope] = useState<JobListScope>("open");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.jobs.list({
        q: q || undefined,
        skill: skill || undefined,
        status: listScope,
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
    // 与「搜索」一致：切换开放/已关闭时按当前筛选重新拉取；不在此依赖 q/skill 以免输入即请求
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [listScope]);

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
      <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="岗位列表范围">
        <Button
          type="button"
          variant={listScope === "open" ? "primary" : "outlineMuted"}
          className={listScope === "open" ? "" : "border-slate-300 dark:border-slate-600"}
          aria-selected={listScope === "open"}
          role="tab"
          onClick={() => setListScope("open")}
        >
          开放岗位
        </Button>
        <Button
          type="button"
          variant={listScope === "closed" ? "primary" : "outlineMuted"}
          className={listScope === "closed" ? "" : "border-slate-300 dark:border-slate-600"}
          aria-selected={listScope === "closed"}
          role="tab"
          onClick={() => setListScope("closed")}
        >
          已关闭
        </Button>
      </div>
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
                <option value="">默认（最新发布）</option>
                <option value="deadline">截止日</option>
                <option value="created_at">发布时间</option>
                <option value="assigned_hours">预估每周工时（低→高）</option>
                <option value="quota">招聘名额（少→多）</option>
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
        <Card className="p-12 text-center text-ink-500 dark:text-slate-400">
          {listScope === "open" ? "未找到符合条件的开放岗位。" : "暂无已关闭岗位（含截止停招、满员、教师关闭等）。"}
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((j) => {
            const existing = appByJob.get(j.id);
            const showApply = !existing || existing.status === "withdrawn";
            const canApply = showApply && jobAcceptingApplications(j.status);
            const maxWeekly = user?.max_weekly_hours ?? 0;
            const projected = projectedWeeklyHoursAfterApply(apps, j);
            const wouldExceedSelfCap =
              maxWeekly > 0 &&
              projected > maxWeekly &&
              existing?.status !== "accepted";
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
                      截止 {j.deadline || "—"} · 预估每周工时 {j.assigned_hours} 工时/周 · 名额 {j.accepted_count ?? 0}/{j.quota ?? 1} ·{" "}
                      <StatusBadge status={j.status as JobStatus} />
                    </p>
                    {j.term ? (
                      <p className="text-xs text-ink-500 dark:text-slate-400 mt-0.5">学期 {j.term}</p>
                    ) : null}
                    <p className="text-sm text-ink-600 dark:text-slate-300 mt-2">{applicationSummary(existing?.status)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 max-w-[11rem] text-right">
                    {wouldExceedSelfCap ? (
                      <span
                        className="text-xs font-semibold text-red-800 dark:text-red-100 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-2 py-1 rounded-lg"
                        title={`当前已计每周约 ${weeklyHoursFromActiveApps(apps).toFixed(1)} 工时/周，若计入本岗位约 ${projected.toFixed(1)} 工时/周，超过您在资料中设置的 ${maxWeekly} 工时/周`}
                      >
                        录用将超负荷
                      </span>
                    ) : null}
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
                  {canApply ? (
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
