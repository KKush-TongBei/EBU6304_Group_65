/** TA 岗位浏览：筛选、收藏、投递申请。 */
import { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../AuthContext";
import { useFeedback } from "../../feedback";
import { useLocale } from "../../locale";
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

function applicationSummary(
  status: ApplicationStatus | undefined,
  t: (key: string) => string
): string {
  if (!status) return t("ta.appSummaryNotApplied");
  switch (status) {
    case "pending":
      return t("ta.appSummaryPending");
    case "accepted":
      return t("ta.appSummaryAccepted");
    case "rejected":
      return t("ta.appSummaryRejected");
    case "withdrawn":
      return t("ta.appSummaryWithdrawn");
    default:
      return "";
  }
}

export default function TAJobs() {
  const { toast } = useFeedback();
  const { user } = useAuth();
  const { t, te } = useLocale();
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
      .catch((e) => setErr(e instanceof Error ? te(e.message) : t("common.loadFailed")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [listScope]);

  const appByJob = new Map(apps.map((a) => [a.job_id, a]));

  const apply = async (jobId: number) => {
    try {
      await api.jobs.apply(jobId);
      const a = await api.ta.myApplications();
      setApps(a);
      toast(t("ta.applySubmitted"), "success");
      load();
    } catch (e: unknown) {
      toast(e instanceof Error ? te(e.message) : t("ta.applyFailed"), "error");
    }
  };

  const toggleFav = async (e: React.MouseEvent, jobId: number) => {
    e.stopPropagation();
    try {
      await api.ta.toggleFavorite(jobId);
      load();
    } catch (err2: unknown) {
      toast(err2 instanceof Error ? te(err2.message) : t("common.opFailed"), "error");
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
    <AppShell title={t("ta.jobsTitle")} role="ta">
      <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label={t("ta.jobListScopeAria")}>
        <Button
          type="button"
          variant={listScope === "open" ? "primary" : "outlineMuted"}
          className={listScope === "open" ? "" : "border-slate-300 dark:border-slate-600"}
          aria-selected={listScope === "open"}
          role="tab"
          onClick={() => setListScope("open")}
        >
          {t("ta.jobsOpen")}
        </Button>
        <Button
          type="button"
          variant={listScope === "closed" ? "primary" : "outlineMuted"}
          className={listScope === "closed" ? "" : "border-slate-300 dark:border-slate-600"}
          aria-selected={listScope === "closed"}
          role="tab"
          onClick={() => setListScope("closed")}
        >
          {t("ta.jobsClosed")}
        </Button>
      </div>
      <Card className="p-4 mb-6">
        <form onSubmit={onSearchSubmit} className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[140px]">
              <label htmlFor="job-q" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block">
                {t("common.keyword")}
              </label>
              <Input
                id="job-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("ta.moduleOrReq")}
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label htmlFor="job-skill" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block">
                {t("ta.skillFilter")}
              </label>
              <Input
                id="job-skill"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                placeholder={t("ta.skillPlaceholder")}
              />
            </div>
            <div className="min-w-[140px]">
              <label htmlFor="job-sort" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block">
                {t("common.sort")}
              </label>
              <Select id="job-sort" className="mt-1 w-full" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="">{t("ta.sortDefault")}</option>
                <option value="deadline">{t("ta.sortDeadline")}</option>
                <option value="created_at">{t("ta.sortCreatedAt")}</option>
                <option value="assigned_hours">{t("ta.sortAssignedHours")}</option>
                <option value="quota">{t("ta.sortQuota")}</option>
              </Select>
            </div>
            <Button type="submit">{t("common.search")}</Button>
            <Button type="button" variant="ghost" onClick={clearFilters}>
              {t("ta.clearFilters")}
            </Button>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-ink-800 dark:text-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} />
              {t("ta.favoritesOnly")}
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={unappliedOnly} onChange={(e) => setUnappliedOnly(e.target.checked)} />
              {t("ta.unappliedOnly")}
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
          {listScope === "open" ? t("ta.noOpenJobs") : t("ta.noClosedJobs")}
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
                        aria-label={j.favorited ? t("ta.unfavoriteJob") : t("ta.favoriteJob")}
                        title={j.favorited ? t("ta.unfavorite") : t("ta.favorite")}
                      >
                        {j.favorited ? "★" : "☆"}
                      </Button>
                    </div>
                    <p className="text-xs text-ink-500 dark:text-slate-400 mt-1">
                      {t("ta.deadlineLine", {
                        date: j.deadline || t("common.dash"),
                        hours: j.assigned_hours,
                        unit: t("common.perWeekHours"),
                        accepted: j.accepted_count ?? 0,
                        quota: j.quota ?? 1,
                      })}{" "}
                      · <StatusBadge status={j.status as JobStatus} />
                    </p>
                    {j.term ? (
                      <p className="text-xs text-ink-500 dark:text-slate-400 mt-0.5">
                        {t("ta.termLine", { term: j.term })}
                      </p>
                    ) : null}
                    <p className="text-sm text-ink-600 dark:text-slate-300 mt-2">
                      {applicationSummary(existing?.status, t)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 max-w-[11rem] text-right">
                    {wouldExceedSelfCap ? (
                      <span
                        className="text-xs font-semibold text-red-800 dark:text-red-100 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-2 py-1 rounded-lg"
                        title={t("ta.overloadTooltip", {
                          current: weeklyHoursFromActiveApps(apps).toFixed(1),
                          projected: projected.toFixed(1),
                          max: maxWeekly,
                        })}
                      >
                        {t("ta.wouldOverload")}
                      </span>
                    ) : null}
                    {existing && <StatusBadge status={existing.status} />}
                  </div>
                </div>
                <p className="text-sm text-ink-700 dark:text-slate-200 mt-3 whitespace-pre-wrap">{j.requirements}</p>
                {j.skill_tags && (
                  <p className="text-xs text-ink-500 dark:text-slate-400 mt-2">
                    {t("ta.skillTagsLine", { tags: j.skill_tags })}
                  </p>
                )}
                {j.schedule_text ? (
                  <p className="text-xs text-ink-600 dark:text-slate-300 mt-2 whitespace-pre-wrap">
                    {t("common.schedule")}: {j.schedule_text}
                  </p>
                ) : null}
                <div className="mt-4">
                  {canApply ? (
                    <Button onClick={() => apply(j.id)}>{t("ta.apply")}</Button>
                  ) : existing?.status === "pending" ? (
                    <span className="text-sm text-ink-500 dark:text-slate-400">{t("ta.withdrawInApplications")}</span>
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
