/** MO 岗位详情：申请列表、评分、录用/拒绝、下载简历。 */
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, downloadWithAuth } from "../../api";
import { useFeedback } from "../../feedback";
import { useLocale } from "../../locale";
import type { Application, Job, JobStatus } from "../../types";
import AppShell from "../../AppShell";
import {
  Button,
  Card,
  IconCheck,
  IconEye,
  IconX,
  Input,
  Select,
  StatCard,
  Textarea,
  StatusBadge,
} from "../../ui";

type JobForm = {
  module_name: string;
  requirements: string;
  deadline: string;
  skill_tags: string;
  assigned_hours: number;
  quota: number;
  job_type: string;
  term: string;
  schedule_text: string;
  allow_duplicate_apply_same_type: boolean;
};

function allowedTransitions(from: JobStatus): JobStatus[] {
  switch (from) {
    case "draft":
      return ["open", "cancelled"];
    case "open":
      return ["screening", "closed", "cancelled"];
    case "screening":
      return ["interview", "closed", "cancelled"];
    case "interview":
      return ["shortlist", "closed", "cancelled"];
    case "shortlist":
      return ["filled", "closed", "cancelled", "open"];
    case "filled":
      return ["closed"];
    default:
      return [];
  }
}

function snap(f: JobForm) {
  return JSON.stringify(f);
}

function jobToForm(j: Job): JobForm {
  return {
    module_name: j.module_name,
    requirements: j.requirements,
    deadline: j.deadline,
    skill_tags: j.skill_tags,
    assigned_hours: j.assigned_hours,
    quota: j.quota ?? 1,
    job_type: j.job_type ?? "course_ta",
    term: j.term ?? "",
    schedule_text: j.schedule_text ?? "",
    allow_duplicate_apply_same_type: j.allow_duplicate_apply_same_type !== false,
  };
}

type EvalDraft = {
  skill_match: number;
  course_experience: number;
  academic_background: number;
  availability_score: number;
  communication: number;
  label: string;
  decision_note: string;
  total_note: string;
};

function evalToDraft(e: Application["evaluation"]): EvalDraft {
  if (!e) {
    return {
      skill_match: 0,
      course_experience: 0,
      academic_background: 0,
      availability_score: 0,
      communication: 0,
      label: "",
      decision_note: "",
      total_note: "",
    };
  }
  return {
    skill_match: e.skill_match,
    course_experience: e.course_experience,
    academic_background: e.academic_background,
    availability_score: e.availability_score,
    communication: e.communication,
    label: e.label ?? "",
    decision_note: e.decision_note ?? "",
    total_note: e.total_note ?? "",
  };
}

export default function MOJobDetail() {
  const { id } = useParams();
  const jobId = Number(id);
  const nav = useNavigate();
  const { toast, confirm } = useFeedback();
  const { t, te } = useLocale();
  const [job, setJob] = useState<Job | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [appSort, setAppSort] = useState<string>("");
  const [appStatusFilter, setAppStatusFilter] = useState<string>("");
  const [transitionTo, setTransitionTo] = useState<string>("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expandedEval, setExpandedEval] = useState<number | null>(null);
  const [evalDraft, setEvalDraft] = useState<EvalDraft | null>(null);
  const [autoEvaluating, setAutoEvaluating] = useState(false);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<JobForm>({
    module_name: "",
    requirements: "",
    deadline: "",
    skill_tags: "",
    assigned_hours: 5,
    quota: 1,
    job_type: "course_ta",
    term: "",
    schedule_text: "",
    allow_duplicate_apply_same_type: true,
  });
  const editBaseline = useRef("");

  const dirty = useMemo(
    () => editing && snap(form) !== editBaseline.current,
    [editing, form]
  );

  useEffect(() => {
    if (!dirty) return;
    const fn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty]);

  const loadJob = () => {
    if (!jobId) return;
    api.mo
      .myJobs()
      .then((jobs) => {
        const j = jobs.find((x) => Number(x.id) === jobId) ?? null;
        setJob(j);
        if (j) {
          setForm(jobToForm(j));
          setTransitionTo("");
        }
      })
      .catch(() => setJob(null));
  };

  const loadApps = () => {
    if (!jobId) return;
    api.mo
      .applicants(jobId, {
        sort: appSort || undefined,
        status: appStatusFilter || undefined,
      })
      .then(setApps)
      .catch(() => setApps([]));
  };

  useEffect(() => {
    loadJob();
  }, [jobId]);

  useEffect(() => {
    loadApps();
  }, [jobId, appSort, appStatusFilter]);

  useEffect(() => {
    const t = window.setInterval(() => {
      loadApps();
    }, 8000);
    return () => window.clearInterval(t);
  }, [jobId, appSort, appStatusFilter]);

  const startEdit = () => {
    if (!job) return;
    const next = jobToForm(job);
    setForm(next);
    editBaseline.current = snap(next);
    setEditing(true);
  };

  const cancelEdit = () => {
    if (!job) return;
    setForm(jobToForm(job));
    setEditing(false);
  };

  const save = async () => {
    if (!job) return;
    try {
      const j = await api.mo.updateJob(job.id, {
        module_name: form.module_name,
        requirements: form.requirements,
        deadline: form.deadline,
        skill_tags: form.skill_tags,
        assigned_hours: form.assigned_hours,
        quota: form.quota,
        job_type: form.job_type,
        term: form.term,
        schedule_text: form.schedule_text,
        allow_duplicate_apply_same_type: form.allow_duplicate_apply_same_type,
      });
      setJob(j as Job);
      setForm(jobToForm(j as Job));
      setEditing(false);
      toast(t("mo.jobUpdated"), "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? te(e.message) : t("common.saveFailed"), "error");
    }
  };

  const closeJob = async () => {
    if (!job) return;
    const ok = await confirm({
      title: t("mo.closeJobTitle"),
      message: t("mo.closeJobMsg"),
      confirmText: t("mo.closeJob"),
      danger: true,
    });
    if (!ok) return;
    try {
      const j = await api.mo.closeJob(job.id);
      setJob(j as Job);
      toast(t("mo.jobClosed"), "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? te(e.message) : t("common.opFailed"), "error");
    }
  };

  const deleteJobRecord = async () => {
    if (!job) return;
    const ok = await confirm({
      title: t("mo.deleteJobTitle"),
      message: t("mo.deleteJobMsg"),
      confirmText: t("common.delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await api.mo.deleteJob(job.id);
      toast(t("mo.jobDeleted"), "success");
      nav("/mo/jobs");
    } catch (e: unknown) {
      toast(e instanceof Error ? te(e.message) : t("common.deleteFailed"), "error");
    }
  };

  const doTransition = async () => {
    if (!job || !transitionTo) {
      toast(t("mo.selectTargetStatus"), "error");
      return;
    }
    try {
      const j = await api.mo.transitionJob(job.id, transitionTo);
      setJob(j as Job);
      toast(t("mo.statusUpdated"), "success");
      loadApps();
    } catch (e: unknown) {
      toast(e instanceof Error ? te(e.message) : t("mo.statusFlowFailed"), "error");
    }
  };

  const exportCsv = async () => {
    if (!job) return;
    try {
      await downloadWithAuth(api.mo.exportCsvUrl(job.id), `job_${job.id}.csv`);
      toast(t("common.exportSuccess"), "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? te(e.message) : t("common.exportFailed"), "error");
    }
  };

  const decide = async (appId: number, status: "interviewing" | "accepted" | "rejected") => {
    const ok = await confirm({
      title:
        status === "interviewing"
          ? t("mo.advanceInterview")
          : status === "accepted"
            ? t("mo.acceptApplicant")
            : t("mo.rejectApplicant"),
      message:
        status === "interviewing"
          ? t("mo.confirmAdvanceInterview")
          : status === "accepted"
            ? t("mo.confirmAccept")
            : t("mo.confirmReject"),
      confirmText:
        status === "interviewing" ? t("mo.advance") : status === "accepted" ? t("mo.accept") : t("mo.reject"),
      danger: status === "rejected",
    });
    if (!ok) return;
    try {
      const res = await api.mo.decide(appId, status);
      toast(
        status === "interviewing"
          ? t("mo.enteredInterview")
          : status === "accepted"
            ? t("mo.accepted")
            : t("mo.rejected"),
        "success"
      );
      if (res.warnings?.length) {
        toast(res.warnings.join("；"), "info");
      }
      loadJob();
      loadApps();
    } catch (e: unknown) {
      toast(e instanceof Error ? te(e.message) : t("common.opFailed"), "error");
    }
  };

  const toggleSelect = (appId: number) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(appId)) n.delete(appId);
      else n.add(appId);
      return n;
    });
  };

  const batchDecide = async (status: "interviewing" | "accepted" | "rejected") => {
    if (!job || selected.size === 0) {
      toast(t("mo.selectPendingFirst"), "error");
      return;
    }
    const ok = await confirm({
      title:
        status === "interviewing"
          ? t("mo.batchAdvance")
          : status === "accepted"
            ? t("mo.batchAccept")
            : t("mo.batchReject"),
      message: t("mo.batchMsg", {
        count: selected.size,
        action:
          status === "interviewing"
            ? t("mo.toInterviewing")
            : status === "accepted"
              ? t("mo.accept")
              : t("mo.reject"),
      }),
      confirmText: t("common.continue"),
      danger: status === "rejected",
    });
    if (!ok) return;
    try {
      const res = await api.mo.batchDecide(job.id, Array.from(selected), status);
      toast(t("mo.processedCount", { count: res.updated }), res.errors.length ? "info" : "success");
      if (res.errors.length) {
        toast(res.errors.slice(0, 5).join("；") + (res.errors.length > 5 ? "…" : ""), "error");
      }
      setSelected(new Set());
      loadJob();
      loadApps();
    } catch (e: unknown) {
      toast(e instanceof Error ? te(e.message) : t("mo.batchOpFailed"), "error");
    }
  };

  const openEval = (a: Application) => {
    if (expandedEval === a.id) {
      setExpandedEval(null);
      setEvalDraft(null);
      return;
    }
    setExpandedEval(a.id);
    setEvalDraft(evalToDraft(a.evaluation));
  };

  const saveEval = async (applicationId: number) => {
    if (!evalDraft) return;
    try {
      await api.mo.saveEvaluation(applicationId, {
        skill_match: evalDraft.skill_match,
        course_experience: evalDraft.course_experience,
        academic_background: evalDraft.academic_background,
        availability_score: evalDraft.availability_score,
        communication: evalDraft.communication,
        label: evalDraft.label || undefined,
        decision_note: evalDraft.decision_note || undefined,
        total_note: evalDraft.total_note || undefined,
      });
      toast(t("mo.evalSaved"), "success");
      loadApps();
    } catch (e: unknown) {
      toast(e instanceof Error ? te(e.message) : t("common.saveFailed"), "error");
    }
  };

  const handleAutoEvaluate = async (applicationId: number) => {
    try {
      await api.mo.autoEvaluate(applicationId);
      toast(t("mo.autoEvalDone"), "success");
      loadApps();
    } catch (e: unknown) {
      toast(e instanceof Error ? te(e.message) : t("mo.autoEvalFailed"), "error");
    }
  };

  const handleAutoEvaluateAll = async () => {
    if (!job) return;
    setAutoEvaluating(true);
    try {
      await api.mo.autoEvaluateAll(job.id);
      toast(t("mo.batchAutoEvalDone"), "success");
      loadApps();
    } catch (e: unknown) {
      toast(e instanceof Error ? te(e.message) : t("mo.batchAutoEvalFailed"), "error");
    } finally {
      setAutoEvaluating(false);
    }
  };

  const nextStates = job ? allowedTransitions(job.status as JobStatus) : [];
  const canClose = job && job.status !== "closed" && job.status !== "cancelled";
  const canDeleteRecord =
    job && (job.status === "closed" || job.status === "cancelled");

  const appStats = useMemo(() => {
    const total = apps.length;
    const pending = apps.filter((a) => a.status === "pending").length;
    const interviewing = apps.filter((a) => a.status === "interviewing").length;
    const accepted = apps.filter((a) => a.status === "accepted").length;
    const rejected = apps.filter((a) => a.status === "rejected").length;
    return { total, pending, interviewing, accepted, rejected };
  }, [apps]);

  const downloadApplicantCv = async (a: Application) => {
    if (!a.ta_cv_file_id) {
      toast(t("mo.noResume"), "info");
      return;
    }
    const name = a.ta_cv_original_name?.trim() || `application_${a.id}_cv`;
    try {
      await downloadWithAuth(api.mo.applicantCvDownloadUrl(a.id), name);
      toast(t("common.downloadStarted"), "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? te(e.message) : t("common.downloadFailed"), "error");
    }
  };

  const jobTypeLabel = (jobType: string | undefined) => {
    if (jobType === "invigilation") return t("mo.jobTypeInvigilation");
    if (jobType === "event_support") return t("mo.jobTypeEvent");
    return t("mo.jobTypeCourseTa");
  };

  if (!jobId || Number.isNaN(jobId)) {
    return (
      <AppShell title={t("shell.titleJob")} role="mo">
        <p className="text-ink-700 dark:text-slate-200">{t("common.invalidId")}</p>
      </AppShell>
    );
  }

  if (!job) {
    return (
      <AppShell title={t("shell.titleJob")} role="mo">
        <p className="text-ink-500 dark:text-slate-400">{t("common.notFoundLoading")}</p>
        <Link to="/mo/jobs" className="text-accent text-sm mt-4 inline-block">
          {t("common.backToList")}
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell title={job.module_name} role="mo">
      <div className="mb-4">
        <Link to="/mo/jobs" className="text-sm text-accent hover:underline">
          {t("mo.backToJobList")}
        </Link>
      </div>

      <header className="mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-ink-950 dark:text-white tracking-tight">
          {job.module_name}
        </h1>
        <p className="text-sm text-ink-500 dark:text-slate-400 mt-1">{t("mo.viewApplicationsHint")}</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard title={t("mo.totalApps")} value={appStats.total} tone="neutral" />
        <StatCard title={t("mo.statPending")} value={appStats.pending} tone="warn" />
        <StatCard title={t("mo.statInterviewing")} value={appStats.interviewing} tone="neutral" />
        <StatCard title={t("mo.statAccepted")} value={appStats.accepted} tone="ok" />
        <StatCard title={t("mo.statRejected")} value={appStats.rejected} tone="bad" />
      </div>

      <Card className="p-4 mb-4 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50">
        <p className="text-xs font-semibold text-ink-700 dark:text-slate-300 mb-2">{t("mo.pipelineOverview")}</p>
        <div className="flex flex-wrap gap-3 text-sm text-ink-600 dark:text-slate-300">
          <span>
            {t("mo.currentStageLabel")}
            <strong className="text-ink-950 dark:text-white">{job.status}</strong>
          </span>
          <span>
            {t("mo.appliedCount")}
            <strong>{apps.filter((a) => a.status === "pending").length}</strong>
          </span>
          <span>
            {t("mo.interviewingCount")}
            <strong>{apps.filter((a) => a.status === "interviewing").length}</strong>
          </span>
          <span>
            {t("mo.acceptedCount")}
            <strong>{apps.filter((a) => a.status === "accepted").length}</strong>
          </span>
          <span>
            {t("mo.rejectedCount")}
            <strong>{apps.filter((a) => a.status === "rejected").length}</strong>
          </span>
        </div>
        <p className="text-xs text-ink-500 dark:text-slate-400 mt-2">{t("mo.advanceHint")}</p>
      </Card>

      <Card className="p-6 mb-6">
        <div className="flex flex-wrap justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} />
            <span className="text-xs text-ink-500 dark:text-slate-400">
              {t("mo.quotaLine", {
                accepted: job.accepted_count ?? 0,
                quota: job.quota ?? 1,
                term: job.term || t("common.termUnset"),
                type: job.job_type || "course_ta",
              })}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportCsv} aria-label={t("common.exportCsv")}>
              {t("common.exportCsv")}
            </Button>
            {canClose ? (
              <Button variant="danger" onClick={closeJob}>
                {t("mo.closeJob")}
              </Button>
            ) : null}
            {canDeleteRecord ? (
              <Button variant="outlineDanger" onClick={deleteJobRecord} aria-label={t("mo.deleteRecord")}>
                {t("mo.deleteRecord")}
              </Button>
            ) : null}
            {editing ? (
              <>
                <Button variant="ghost" onClick={cancelEdit}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={save}>{t("mo.saveChanges")}</Button>
              </>
            ) : (
              <Button variant="secondary" onClick={startEdit}>
                {t("mo.editJob")}
              </Button>
            )}
          </div>
        </div>

        {nextStates.length > 0 ? (
          <div className="flex flex-wrap items-end gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <label htmlFor="transition-to" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block">
                {t("mo.advanceFlow")}
              </label>
              <Select
                id="transition-to"
                className="mt-1 min-w-[160px]"
                value={transitionTo}
                onChange={(e) => setTransitionTo(e.target.value)}
                aria-label={t("mo.selectTarget")}
              >
                <option value="">{t("mo.selectTarget")}</option>
                {nextStates.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="button" onClick={doTransition} disabled={!transitionTo}>
              {t("mo.applyTransition")}
            </Button>
          </div>
        ) : null}

        {editing ? (
          <div className="space-y-3">
            <Input
              value={form.module_name}
              onChange={(e) => setForm({ ...form, module_name: e.target.value })}
              aria-label={t("mo.moduleName")}
            />
            <Textarea
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
              aria-label={t("mo.requirements")}
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                placeholder="YYYY-MM-DD"
                aria-label={t("common.deadline")}
              />
              <Input
                value={form.skill_tags}
                onChange={(e) => setForm({ ...form, skill_tags: e.target.value })}
                aria-label={t("mo.skillTags")}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                type="number"
                min={1}
                value={form.quota}
                onChange={(e) => setForm({ ...form, quota: Math.max(1, Number(e.target.value) || 1) })}
                aria-label={t("mo.headcount")}
              />
              <select
                className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                value={form.job_type}
                onChange={(e) => setForm({ ...form, job_type: e.target.value })}
                aria-label={t("mo.jobType")}
              >
                <option value="course_ta">{t("mo.jobTypeCourseTa")}</option>
                <option value="invigilation">{t("mo.jobTypeInvigilation")}</option>
                <option value="event_support">{t("mo.jobTypeEvent")}</option>
              </select>
            </div>
            <Input
              value={form.term}
              onChange={(e) => setForm({ ...form, term: e.target.value })}
              placeholder={t("mo.term")}
              aria-label={t("mo.term")}
            />
            <Textarea
              value={form.schedule_text}
              onChange={(e) => setForm({ ...form, schedule_text: e.target.value })}
              aria-label={t("mo.scheduleText")}
              rows={2}
            />
            <div>
              <label htmlFor="job-assigned-hours" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
                {t("mo.weeklyHours")}
              </label>
              <Input
                id="job-assigned-hours"
                type="number"
                min={0}
                step={0.5}
                className="mt-1"
                value={form.assigned_hours}
                onChange={(e) => setForm({ ...form, assigned_hours: Number(e.target.value) })}
                aria-label={t("mo.weeklyHours")}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.allow_duplicate_apply_same_type}
                onChange={(e) => setForm({ ...form, allow_duplicate_apply_same_type: e.target.checked })}
              />
              {t("common.allowDuplicateApply")}
            </label>
          </div>
        ) : (
          <>
            <p className="text-sm text-ink-600 dark:text-slate-300 whitespace-pre-wrap">{job.requirements}</p>
            <p className="text-xs text-ink-500 dark:text-slate-400 mt-3">
              {t("mo.deadlineDetail", {
                date: job.deadline,
                tags: job.skill_tags,
                hours: job.assigned_hours,
                unit: t("common.perWeekHours"),
              })}
            </p>
            {job.schedule_text ? (
              <p className="text-xs text-ink-600 dark:text-slate-300 mt-2 whitespace-pre-wrap">
                {t("common.schedule")}: {job.schedule_text}
              </p>
            ) : null}
          </>
        )}
      </Card>

      <h2 className="font-display font-semibold text-lg text-ink-950 dark:text-white mb-3">{t("mo.applicants")}</h2>
      <Card className="p-4 mb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label htmlFor="app-sort" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block mb-1">
                {t("common.sort")}
              </label>
              <Select
                id="app-sort"
                className="min-w-[140px]"
                value={appSort}
                onChange={(e) => setAppSort(e.target.value)}
                aria-label={t("common.sort")}
              >
                <option value="">{t("mo.sortAppliedAt")}</option>
                <option value="total_score">{t("mo.totalScore")}</option>
                <option value="skill_match">{t("mo.skillMatch")}</option>
              </Select>
            </div>
            <div>
              <label htmlFor="app-filter" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block mb-1">
                {t("common.status")}
              </label>
              <Select
                id="app-filter"
                className="min-w-[140px]"
                value={appStatusFilter}
                onChange={(e) => setAppStatusFilter(e.target.value)}
                aria-label={t("mo.filterByStatus")}
              >
                <option value="">{t("mo.allStatus")}</option>
                <option value="pending">{t("mo.statPending")}</option>
                <option value="interviewing">{t("mo.statInterviewing")}</option>
                <option value="accepted">{t("mo.statAccepted")}</option>
                <option value="rejected">{t("mo.statRejected")}</option>
                <option value="withdrawn">{t("status.withdrawn")}</option>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outlineInfo" className="!py-2" onClick={handleAutoEvaluateAll} disabled={autoEvaluating}>
              {autoEvaluating ? t("common.evaluating") : t("mo.batchAutoEval")}
            </Button>
            <Button type="button" variant="secondary" className="!py-2" onClick={() => batchDecide("interviewing")}>
              {t("mo.batchInterview")}
            </Button>
            <Button type="button" variant="outlineDanger" className="!py-2" onClick={() => batchDecide("rejected")}>
              {t("mo.batchRejectSelected")}
            </Button>
            <Button type="button" variant="outlineSuccess" className="!py-2" onClick={() => batchDecide("accepted")}>
              {t("mo.batchAcceptSelected")}
            </Button>
          </div>
        </div>
      </Card>

      {apps.length === 0 ? (
        <Card className="p-8 text-center text-ink-500 dark:text-slate-400">{t("mo.noApplicants")}</Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-soft">
          <table className="w-full text-sm" aria-label={t("mo.applicantList")}>
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-ink-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-2 py-3 w-10">
                  <span className="sr-only">{t("common.select")}</span>
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  {t("mo.applicantCol")}
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  {t("mo.jobCol")}
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  {t("common.email")}
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  {t("common.status")}
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  {t("mo.scoreCol")}
                </th>
                <th scope="col" className="px-4 py-3 text-left min-w-[220px]">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a, i) => (
                <Fragment key={a.id}>
                  <tr
                    className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                      i % 2 === 1 ? "bg-slate-50/30 dark:bg-slate-800/20" : ""
                    }`}
                  >
                    <td className="px-2 py-3 text-center">
                      {a.status === "pending" || a.status === "interviewing" ? (
                        <input
                          type="checkbox"
                          checked={selected.has(a.id)}
                          onChange={() => toggleSelect(a.id)}
                          aria-label={t("mo.selectApplicant", { name: a.ta_display_name ?? String(a.id) })}
                        />
                      ) : (
                        <span className="text-ink-300">{t("common.dash")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink-950 dark:text-white">{a.ta_display_name ?? t("common.dash")}</div>
                      <div className="text-xs text-ink-500 dark:text-slate-400 mt-0.5">
                        {t("mo.appIdLine", { id: a.id, userId: a.ta_user_id })}
                        {a.ta_student_id ? ` · ${a.ta_student_id}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink-900 dark:text-slate-100">{job.module_name}</div>
                      <div className="text-xs text-ink-500 dark:text-slate-400 mt-0.5">
                        {(a.job?.term || job.term || t("common.dash")) +
                          " · " +
                          jobTypeLabel(a.job?.job_type ?? job.job_type)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-600 dark:text-slate-300 text-sm">{a.ta_email}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3 text-ink-700 dark:text-slate-200 tabular-nums">
                      {a.evaluation_total != null ? a.evaluation_total : t("common.dash")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap items-center">
                        <Button
                          type="button"
                          variant="outlineInfo"
                          className="!py-1.5 !px-2.5 text-xs"
                          onClick={() => downloadApplicantCv(a)}
                          disabled={!a.ta_cv_file_id}
                          title={a.ta_cv_file_id ? t("mo.downloadResume") : t("mo.noResume")}
                          aria-label={t("mo.resume")}
                        >
                          <IconEye />
                          {t("mo.resume")}
                        </Button>
                        <Button
                          type="button"
                          variant="outlineInfo"
                          className="!py-1.5 !px-2.5 text-xs"
                          onClick={() => handleAutoEvaluate(a.id)}
                        >
                          {t("mo.autoEval")}
                        </Button>
                        <Button
                          type="button"
                          variant="outlineMuted"
                          className="!py-1.5 !px-2.5 text-xs"
                          onClick={() => openEval(a)}
                        >
                          {expandedEval === a.id ? t("mo.collapseEval") : t("mo.expandEval")}
                        </Button>
                        {a.status === "pending" ? (
                          <>
                            <Button
                              type="button"
                              variant="secondary"
                              className="!py-1.5 !px-2.5 text-xs"
                              onClick={() => decide(a.id, "interviewing")}
                            >
                              {t("mo.interviewingShort")}
                            </Button>
                            <Button
                              type="button"
                              variant="outlineDanger"
                              className="!py-1.5 !px-2.5 text-xs"
                              onClick={() => decide(a.id, "rejected")}
                            >
                              <IconX />
                              {t("mo.reject")}
                            </Button>
                          </>
                        ) : a.status === "interviewing" ? (
                          <>
                            <Button
                              type="button"
                              variant="outlineSuccess"
                              className="!py-1.5 !px-2.5 text-xs"
                              onClick={() => decide(a.id, "accepted")}
                            >
                              <IconCheck />
                              {t("mo.accept")}
                            </Button>
                            <Button
                              type="button"
                              variant="outlineDanger"
                              className="!py-1.5 !px-2.5 text-xs"
                              onClick={() => decide(a.id, "rejected")}
                            >
                              <IconX />
                              {t("mo.reject")}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  {expandedEval === a.id && evalDraft ? (
                    <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="grid sm:grid-cols-5 gap-2 max-w-4xl">
                          {(
                            [
                              ["skill_match", t("mo.evalSkill")],
                              ["course_experience", t("mo.evalCourse")],
                              ["academic_background", t("mo.evalAcademic")],
                              ["availability_score", t("mo.evalAvailability")],
                              ["communication", t("mo.evalCommunication")],
                            ] as const
                          ).map(([k, lab]) => (
                            <div key={k}>
                              <label className="text-xs font-semibold text-ink-600 dark:text-slate-400">{lab} (0–5)</label>
                              <Input
                                type="number"
                                min={0}
                                max={5}
                                className="mt-1"
                                value={evalDraft[k]}
                                onChange={(e) =>
                                  setEvalDraft({
                                    ...evalDraft,
                                    [k]: Math.min(5, Math.max(0, Number(e.target.value) || 0)),
                                  })
                                }
                              />
                            </div>
                          ))}
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3 mt-3 max-w-4xl">
                          <div>
                            <label className="text-xs font-semibold text-ink-600 dark:text-slate-400">{t("mo.evalTags")}</label>
                            <Input
                              className="mt-1"
                              value={evalDraft.label}
                              onChange={(e) => setEvalDraft({ ...evalDraft, label: e.target.value })}
                              placeholder="StrongMatch / Interview…"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-ink-600 dark:text-slate-400">{t("mo.evalNotes")}</label>
                            <Input
                              className="mt-1"
                              value={evalDraft.decision_note}
                              onChange={(e) => setEvalDraft({ ...evalDraft, decision_note: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="mt-3 max-w-4xl">
                          <label className="text-xs font-semibold text-ink-600 dark:text-slate-400">{t("mo.evalSummary")}</label>
                          <Textarea
                            className="mt-1 min-h-[5.5rem]"
                            value={evalDraft.total_note}
                            onChange={(e) => setEvalDraft({ ...evalDraft, total_note: e.target.value })}
                            rows={4}
                          />
                        </div>
                        <Button type="button" className="mt-3" onClick={() => saveEval(a.id)}>
                          {t("mo.saveEval")}
                        </Button>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}