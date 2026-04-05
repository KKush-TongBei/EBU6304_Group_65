import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useParams } from "react-router-dom";
import { api, downloadWithAuth } from "../../api";
import { useFeedback } from "../../feedback";
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
  const { toast, confirm } = useFeedback();
  const [job, setJob] = useState<Job | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [appSort, setAppSort] = useState<string>("");
  const [appStatusFilter, setAppStatusFilter] = useState<string>("");
  const [transitionTo, setTransitionTo] = useState<string>("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expandedEval, setExpandedEval] = useState<number | null>(null);
  const [evalDraft, setEvalDraft] = useState<EvalDraft | null>(null);

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

  const blocker = useBlocker(dirty);

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
    api.mo.myJobs().then((jobs) => {
      const j = jobs.find((x) => x.id === jobId) ?? null;
      setJob(j);
      if (j) {
        setForm(jobToForm(j));
        setTransitionTo("");
      }
    });
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
      toast("岗位已更新", "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "保存失败", "error");
    }
  };

  const closeJob = async () => {
    if (!job) return;
    const ok = await confirm({
      title: "关闭岗位",
      message: "关闭后学生无法再申请该岗位，确定继续？",
      confirmText: "关闭",
      danger: true,
    });
    if (!ok) return;
    try {
      const j = await api.mo.closeJob(job.id);
      setJob(j as Job);
      toast("岗位已关闭", "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "操作失败", "error");
    }
  };

  const doTransition = async () => {
    if (!job || !transitionTo) {
      toast("请选择目标状态", "error");
      return;
    }
    try {
      const j = await api.mo.transitionJob(job.id, transitionTo);
      setJob(j as Job);
      toast("状态已更新", "success");
      loadApps();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "状态流转失败", "error");
    }
  };

  const exportCsv = async () => {
    if (!job) return;
    try {
      await downloadWithAuth(api.mo.exportCsvUrl(job.id), `job_${job.id}.csv`);
      toast("导出成功", "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "导出失败", "error");
    }
  };

  const decide = async (appId: number, status: "accepted" | "rejected") => {
    const ok = await confirm({
      title: status === "accepted" ? "录用申请人" : "拒绝申请人",
      message: status === "accepted" ? "确认录用该申请人？" : "确认拒绝该申请人？",
      confirmText: status === "accepted" ? "录用" : "拒绝",
      danger: status === "rejected",
    });
    if (!ok) return;
    try {
      const res = await api.mo.decide(appId, status);
      toast(status === "accepted" ? "已录用" : "已拒绝", "success");
      if (res.warnings?.length) {
        toast(res.warnings.join("；"), "info");
      }
      loadJob();
      loadApps();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "操作失败", "error");
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

  const batchDecide = async (status: "accepted" | "rejected") => {
    if (!job || selected.size === 0) {
      toast("请先勾选待处理的申请", "error");
      return;
    }
    const ok = await confirm({
      title: status === "accepted" ? "批量录用" : "批量拒绝",
      message: `将对 ${selected.size} 条申请执行${status === "accepted" ? "录用" : "拒绝"}，继续？`,
      confirmText: "继续",
      danger: status === "rejected",
    });
    if (!ok) return;
    try {
      const res = await api.mo.batchDecide(job.id, Array.from(selected), status);
      toast(`已处理 ${res.updated} 条`, res.errors.length ? "info" : "success");
      if (res.errors.length) {
        toast(res.errors.slice(0, 5).join("；") + (res.errors.length > 5 ? "…" : ""), "error");
      }
      setSelected(new Set());
      loadJob();
      loadApps();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "批量操作失败", "error");
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
      toast("评分已保存", "success");
      loadApps();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "保存失败", "error");
    }
  };

  const nextStates = job ? allowedTransitions(job.status as JobStatus) : [];
  const canClose = job && job.status !== "closed" && job.status !== "cancelled";

  const appStats = useMemo(() => {
    const total = apps.length;
    const pending = apps.filter((a) => a.status === "pending").length;
    const accepted = apps.filter((a) => a.status === "accepted").length;
    const rejected = apps.filter((a) => a.status === "rejected").length;
    return { total, pending, accepted, rejected };
  }, [apps]);

  const downloadApplicantCv = async (a: Application) => {
    if (!a.ta_cv_file_id) {
      toast("该申请人尚未上传简历", "info");
      return;
    }
    const name = a.ta_cv_original_name?.trim() || `application_${a.id}_cv`;
    try {
      await downloadWithAuth(api.mo.applicantCvDownloadUrl(a.id), name);
      toast("已开始下载", "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "下载失败", "error");
    }
  };

  const jobTypeLabel = (t: string | undefined) => {
    if (t === "invigilation") return "监考";
    if (t === "event_support") return "活动支持";
    return "课程 TA";
  };

  if (!jobId || Number.isNaN(jobId)) {
    return (
      <AppShell title="岗位" role="mo">
        <p className="text-ink-700 dark:text-slate-200">无效 ID</p>
      </AppShell>
    );
  }

  if (!job) {
    return (
      <AppShell title="岗位" role="mo">
        <p className="text-ink-500 dark:text-slate-400">加载中或未找到该岗位…</p>
        <Link to="/mo/jobs" className="text-accent text-sm mt-4 inline-block">
          返回列表
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell title={job.module_name} role="mo">
      {blocker.state === "blocked" ? (
        <div
          className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="nav-block-title"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 shadow-xl">
            <h2 id="nav-block-title" className="font-display font-semibold text-lg text-ink-950 dark:text-white">
              未保存的修改
            </h2>
            <p className="text-sm text-ink-600 dark:text-slate-300 mt-2">
              离开页面将丢失正在编辑的岗位内容，是否离开？
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => blocker.reset()}>
                继续编辑
              </Button>
              <Button variant="danger" onClick={() => blocker.proceed()}>
                放弃修改
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-4">
        <Link to="/mo/jobs" className="text-sm text-accent hover:underline">
          ← 返回岗位列表
        </Link>
      </div>

      <header className="mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-ink-950 dark:text-white tracking-tight">
          {job.module_name}
        </h1>
        <p className="text-sm text-ink-500 dark:text-slate-400 mt-1">查看与处理本岗位的助教申请</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard title="申请总数" value={appStats.total} tone="neutral" />
        <StatCard title="待处理" value={appStats.pending} tone="warn" />
        <StatCard title="已录用" value={appStats.accepted} tone="ok" />
        <StatCard title="已拒绝" value={appStats.rejected} tone="bad" />
      </div>

      <Card className="p-4 mb-4 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50">
        <p className="text-xs font-semibold text-ink-700 dark:text-slate-300 mb-2">招聘管道与申请概览</p>
        <div className="flex flex-wrap gap-3 text-sm text-ink-600 dark:text-slate-300">
          <span>
            当前阶段：<strong className="text-ink-950 dark:text-white">{job.status}</strong>
          </span>
          <span>
            待审：<strong>{apps.filter((a) => a.status === "pending").length}</strong>
          </span>
          <span>
            已录用：<strong>{apps.filter((a) => a.status === "accepted").length}</strong>
          </span>
          <span>
            已拒绝：<strong>{apps.filter((a) => a.status === "rejected").length}</strong>
          </span>
        </div>
        <p className="text-xs text-ink-500 dark:text-slate-400 mt-2">
          推进流程请使用下方「推进流程」。若无下拉选项，表示已至终态或需先关闭岗位。
        </p>
      </Card>

      <Card className="p-6 mb-6">
        <div className="flex flex-wrap justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} />
            <span className="text-xs text-ink-500 dark:text-slate-400">
              名额 {job.accepted_count ?? 0}/{job.quota ?? 1} · {job.term || "未填学期"} · {job.job_type || "course_ta"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportCsv} aria-label="导出申请人 CSV">
              导出 CSV
            </Button>
            {canClose ? (
              <Button variant="danger" onClick={closeJob}>
                关闭岗位
              </Button>
            ) : null}
            {editing ? (
              <>
                <Button variant="ghost" onClick={cancelEdit}>
                  取消
                </Button>
                <Button onClick={save}>保存修改</Button>
              </>
            ) : (
              <Button variant="secondary" onClick={startEdit}>
                编辑岗位
              </Button>
            )}
          </div>
        </div>

        {nextStates.length > 0 ? (
          <div className="flex flex-wrap items-end gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <label htmlFor="transition-to" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block">
                推进流程
              </label>
              <Select
                id="transition-to"
                className="mt-1 min-w-[160px]"
                value={transitionTo}
                onChange={(e) => setTransitionTo(e.target.value)}
                aria-label="目标状态"
              >
                <option value="">选择目标状态</option>
                {nextStates.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="button" onClick={doTransition} disabled={!transitionTo}>
              应用流转
            </Button>
          </div>
        ) : null}

        {editing ? (
          <div className="space-y-3">
            <Input
              value={form.module_name}
              onChange={(e) => setForm({ ...form, module_name: e.target.value })}
              aria-label="模块名称"
            />
            <Textarea
              value={form.requirements}
              onChange={(e) => setForm({ ...form, requirements: e.target.value })}
              aria-label="要求说明"
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                placeholder="YYYY-MM-DD"
                aria-label="截止日期"
              />
              <Input
                value={form.skill_tags}
                onChange={(e) => setForm({ ...form, skill_tags: e.target.value })}
                aria-label="技能标签"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                type="number"
                min={1}
                value={form.quota}
                onChange={(e) => setForm({ ...form, quota: Math.max(1, Number(e.target.value) || 1) })}
                aria-label="招聘人数"
              />
              <select
                className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                value={form.job_type}
                onChange={(e) => setForm({ ...form, job_type: e.target.value })}
                aria-label="岗位类型"
              >
                <option value="course_ta">课程 TA</option>
                <option value="invigilation">监考</option>
                <option value="event_support">活动支持</option>
              </select>
            </div>
            <Input
              value={form.term}
              onChange={(e) => setForm({ ...form, term: e.target.value })}
              placeholder="学期"
              aria-label="学期"
            />
            <Textarea
              value={form.schedule_text}
              onChange={(e) => setForm({ ...form, schedule_text: e.target.value })}
              aria-label="工作时段"
              rows={2}
            />
            <Input
              type="number"
              value={form.assigned_hours}
              onChange={(e) => setForm({ ...form, assigned_hours: Number(e.target.value) })}
              aria-label="工时"
            />
            <label className="flex items-center gap-2 text-sm text-ink-800 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.allow_duplicate_apply_same_type}
                onChange={(e) => setForm({ ...form, allow_duplicate_apply_same_type: e.target.checked })}
              />
              允许同类型同学期重复申请
            </label>
          </div>
        ) : (
          <>
            <p className="text-sm text-ink-600 dark:text-slate-300 whitespace-pre-wrap">{job.requirements}</p>
            <p className="text-xs text-ink-500 dark:text-slate-400 mt-3">
              截止 {job.deadline} · 标签 {job.skill_tags} · 工时 {job.assigned_hours}h
            </p>
            {job.schedule_text ? (
              <p className="text-xs text-ink-600 dark:text-slate-300 mt-2 whitespace-pre-wrap">
                时段：{job.schedule_text}
              </p>
            ) : null}
          </>
        )}
      </Card>

      <h2 className="font-display font-semibold text-lg text-ink-950 dark:text-white mb-3">申请人</h2>
      <Card className="p-4 mb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label htmlFor="app-sort" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block mb-1">
                排序
              </label>
              <Select
                id="app-sort"
                className="min-w-[140px]"
                value={appSort}
                onChange={(e) => setAppSort(e.target.value)}
                aria-label="申请人排序"
              >
                <option value="">申请时间</option>
                <option value="total_score">总分</option>
                <option value="skill_match">技能匹配</option>
              </Select>
            </div>
            <div>
              <label htmlFor="app-filter" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block mb-1">
                申请状态
              </label>
              <Select
                id="app-filter"
                className="min-w-[140px]"
                value={appStatusFilter}
                onChange={(e) => setAppStatusFilter(e.target.value)}
                aria-label="按申请状态筛选"
              >
                <option value="">全部</option>
                <option value="pending">待处理</option>
                <option value="accepted">已录用</option>
                <option value="rejected">已拒绝</option>
                <option value="withdrawn">已撤回</option>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outlineDanger" className="!py-2" onClick={() => batchDecide("rejected")}>
              批量拒绝所选
            </Button>
            <Button type="button" variant="outlineSuccess" className="!py-2" onClick={() => batchDecide("accepted")}>
              批量录用所选
            </Button>
          </div>
        </div>
      </Card>

      {apps.length === 0 ? (
        <Card className="p-8 text-center text-ink-500 dark:text-slate-400">暂无申请</Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-soft">
          <table className="w-full text-sm" aria-label="申请人列表">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-ink-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-2 py-3 w-10">
                  <span className="sr-only">选择</span>
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  申请人
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  岗位
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  邮箱
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  状态
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  总分
                </th>
                <th scope="col" className="px-4 py-3 text-left min-w-[220px]">
                  操作
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
                      {a.status === "pending" ? (
                        <input
                          type="checkbox"
                          checked={selected.has(a.id)}
                          onChange={() => toggleSelect(a.id)}
                          aria-label={`选择 ${a.ta_display_name ?? a.id}`}
                        />
                      ) : (
                        <span className="text-ink-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink-950 dark:text-white">{a.ta_display_name ?? "—"}</div>
                      <div className="text-xs text-ink-500 dark:text-slate-400 mt-0.5">
                        申请 #{a.id} · 用户 {a.ta_user_id}
                        {a.ta_student_id ? ` · ${a.ta_student_id}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink-900 dark:text-slate-100">{job.module_name}</div>
                      <div className="text-xs text-ink-500 dark:text-slate-400 mt-0.5">
                        {(a.job?.term || job.term || "—") + " · " + jobTypeLabel(a.job?.job_type ?? job.job_type)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-600 dark:text-slate-300 text-sm">{a.ta_email}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3 text-ink-700 dark:text-slate-200 tabular-nums">
                      {a.evaluation_total != null ? a.evaluation_total : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap items-center">
                        <Button
                          type="button"
                          variant="outlineInfo"
                          className="!py-1.5 !px-2.5 text-xs"
                          onClick={() => downloadApplicantCv(a)}
                          disabled={!a.ta_cv_file_id}
                          title={a.ta_cv_file_id ? "下载简历" : "无简历文件"}
                          aria-label="查看简历"
                        >
                          <IconEye />
                          简历
                        </Button>
                        <Button
                          type="button"
                          variant="outlineMuted"
                          className="!py-1.5 !px-2.5 text-xs"
                          onClick={() => openEval(a)}
                        >
                          {expandedEval === a.id ? "收起评分" : "评分"}
                        </Button>
                        {a.status === "pending" ? (
                          <>
                            <Button
                              type="button"
                              variant="outlineSuccess"
                              className="!py-1.5 !px-2.5 text-xs"
                              onClick={() => decide(a.id, "accepted")}
                            >
                              <IconCheck />
                              录用
                            </Button>
                            <Button
                              type="button"
                              variant="outlineDanger"
                              className="!py-1.5 !px-2.5 text-xs"
                              onClick={() => decide(a.id, "rejected")}
                            >
                              <IconX />
                              拒绝
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
                              ["skill_match", "技能"],
                              ["course_experience", "课程经验"],
                              ["academic_background", "学业"],
                              ["availability_score", "可用性"],
                              ["communication", "沟通"],
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
                            <label className="text-xs font-semibold text-ink-600 dark:text-slate-400">标签</label>
                            <Input
                              className="mt-1"
                              value={evalDraft.label}
                              onChange={(e) => setEvalDraft({ ...evalDraft, label: e.target.value })}
                              placeholder="StrongMatch / Interview…"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-ink-600 dark:text-slate-400">决策备注</label>
                            <Input
                              className="mt-1"
                              value={evalDraft.decision_note}
                              onChange={(e) => setEvalDraft({ ...evalDraft, decision_note: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="mt-3 max-w-4xl">
                          <label className="text-xs font-semibold text-ink-600 dark:text-slate-400">总评</label>
                          <Textarea
                            className="mt-1"
                            value={evalDraft.total_note}
                            onChange={(e) => setEvalDraft({ ...evalDraft, total_note: e.target.value })}
                            rows={2}
                          />
                        </div>
                        <Button type="button" className="mt-3" onClick={() => saveEval(a.id)}>
                          保存评分
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
