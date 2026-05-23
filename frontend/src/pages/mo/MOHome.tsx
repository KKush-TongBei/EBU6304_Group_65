/** MO 工作台首页：所管岗位与待处理申请摘要。 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { useLocale } from "../../locale";
import type { Job } from "../../types";
import AppShell from "../../AppShell";
import { Card, StatusBadge } from "../../ui";

export default function MOHome() {
  const { t } = useLocale();
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
    <AppShell title={t("shell.titleMo")} role="mo">
      {dash ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="p-4">
            <p className="text-xs text-ink-500 dark:text-slate-400 uppercase tracking-wide">{t("mo.recruitingJobs")}</p>
            <p className="text-2xl font-display font-bold text-emerald-700 dark:text-emerald-400 mt-1">
              {String(dash.my_open_jobs ?? open)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-ink-500 dark:text-slate-400 uppercase tracking-wide">{t("mo.totalApplications")}</p>
            <p className="text-2xl font-display font-bold text-ink-950 dark:text-white mt-1">
              {String(dash.total_applications ?? t("common.dash"))}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-ink-500 dark:text-slate-400 uppercase tracking-wide">{t("mo.pendingApplications")}</p>
            <p className="text-2xl font-display font-bold text-amber-700 dark:text-amber-400 mt-1">
              {String(dash.pending_applications ?? t("common.dash"))}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-ink-500 dark:text-slate-400 uppercase tracking-wide">{t("mo.fillRate")}</p>
            <p className="text-2xl font-display font-bold text-accent mt-1">
              {String(dash.fill_rate_pct ?? t("common.dash"))}%
            </p>
          </Card>
        </div>
      ) : null}
      {dash && dash.insights && typeof dash.insights === "object" ? (
        <Card className="p-4 mb-6 text-sm text-ink-600 dark:text-slate-300">
          <p className="font-semibold text-ink-800 dark:text-slate-200 mb-1">{t("mo.opsHint")}</p>
          <p>
            {t("mo.lowApplicants", {
              count: String((dash.insights as Record<string, unknown>).jobs_low_applicants ?? t("common.dash")),
            })}
          </p>
          <p className="mt-1">
            {t("mo.deadlineSoon", {
              count: String((dash.insights as Record<string, unknown>).jobs_deadline_soon ?? t("common.dash")),
            })}
          </p>
        </Card>
      ) : null}
      {dash ? (
        <div className="mb-8 flex flex-wrap gap-4 items-center">
          <Link to="/mo/post" className="text-accent font-semibold text-sm hover:underline">
            {t("mo.postNewJob")}
          </Link>
          <Link to="/mo/notifications" className="text-accent font-semibold text-sm hover:underline">
            {t("mo.notificationCenter")}
          </Link>
        </div>
      ) : null}
      {!dash ? (
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="p-5">
            <p className="text-xs text-ink-500 dark:text-slate-400 uppercase tracking-wide">{t("mo.totalJobs")}</p>
            <p className="text-3xl font-display font-bold text-ink-950 dark:text-white mt-1">{jobs.length}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-ink-500 dark:text-slate-400 uppercase tracking-wide">{t("mo.recruiting")}</p>
            <p className="text-3xl font-display font-bold text-emerald-700 dark:text-emerald-400 mt-1">{open}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-ink-500 dark:text-slate-400">{t("mo.quickActions")}</p>
            <Link to="/mo/post" className="text-accent font-semibold text-sm mt-2 inline-block hover:underline">
              {t("mo.postNewJob")}
            </Link>
            <Link to="/mo/notifications" className="text-accent font-semibold text-sm mt-2 block hover:underline">
              {t("mo.notificationCenter")}
            </Link>
          </Card>
        </div>
      ) : null}

      <h2 className="font-display font-semibold text-lg mb-4 text-ink-950 dark:text-white">{t("mo.recentJobs")}</h2>
      {jobs.length === 0 ? (
        <Card className="p-8 text-center text-ink-500 dark:text-slate-400">{t("mo.noJobsYet")}</Card>
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
