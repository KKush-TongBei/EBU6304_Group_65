import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { useLocale } from "../../locale";
import type { Job, JobStatus } from "../../types";
import AppShell from "../../AppShell";
import { Card, Select, StatusBadge } from "../../ui";

export default function MOJobs() {
  const { t } = useLocale();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<string>("");

  const load = () => {
    api.mo.myJobs(filter || undefined).then(setJobs).catch(() => setJobs([]));
  };

  useEffect(() => {
    load();
  }, [filter]);

  return (
    <AppShell title={t("shell.titleMoJobs")} role="mo">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label htmlFor="job-filter" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
          {t("mo.filterByJobStatus")}
        </label>
        <Select
          id="job-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-48"
          aria-label={t("mo.jobStatusFilterAria")}
        >
          <option value="">{t("roles.all")}</option>
          <option value="draft">{t("status.draft")}</option>
          <option value="open">{t("status.open")}</option>
          <option value="screening">{t("status.screening")}</option>
          <option value="interview">{t("status.interview")}</option>
          <option value="shortlist">{t("status.shortlist")}</option>
          <option value="filled">{t("status.filled")}</option>
          <option value="closed">{t("status.closed")}</option>
          <option value="cancelled">{t("status.cancelled")}</option>
        </Select>
      </div>
      {jobs.length === 0 ? (
        <Card className="p-12 text-center text-ink-500">
          {t("mo.noJobsGoPost")}{" "}
          <Link className="text-accent font-semibold" to="/mo/post">
            {t("mo.goPost")}
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
                          title={t("mo.pendingAppsTitle")}
                          aria-label={t("mo.pendingAppsAria", { count: j.pending_applications_count ?? 0 })}
                        >
                          {j.pending_applications_count}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-ink-500 dark:text-slate-400 mt-1">
                      {t("common.deadline")} {j.deadline || t("common.dash")} · {j.assigned_hours}{" "}
                      {t("common.perWeekHours")} · {t("common.quota")} {j.accepted_count ?? 0}/{j.quota ?? 1}
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
