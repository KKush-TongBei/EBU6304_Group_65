import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useParams } from "react-router-dom";
import { api, downloadWithAuth } from "../../api";
import { useFeedback } from "../../feedback";
import type { Application, Job } from "../../types";
import AppShell from "../../AppShell";
import { Badge, Button, Card, Input, Textarea, StatusBadge } from "../../ui";

type JobForm = {
  module_name: string;
  requirements: string;
  deadline: string;
  skill_tags: string;
  assigned_hours: number;
};

function snap(f: JobForm) {
  return JSON.stringify({
    module_name: f.module_name,
    requirements: f.requirements,
    deadline: f.deadline,
    skill_tags: f.skill_tags,
    assigned_hours: f.assigned_hours,
  });
}

function jobToForm(j: Job): JobForm {
  return {
    module_name: j.module_name,
    requirements: j.requirements,
    deadline: j.deadline,
    skill_tags: j.skill_tags,
    assigned_hours: j.assigned_hours,
  };
}

export default function MOJobDetail() {
  const { id } = useParams();
  const jobId = Number(id);
  const { toast, confirm } = useFeedback();
  const [job, setJob] = useState<Job | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<JobForm>({
    module_name: "",
    requirements: "",
    deadline: "",
    skill_tags: "",
    assigned_hours: 5,
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

  const load = () => {
    if (!jobId) return;
    api.mo.myJobs().then((jobs) => {
      const j = jobs.find((x) => x.id === jobId) ?? null;
      setJob(j);
      if (j) setForm(jobToForm(j));
    });
    api.mo.applicants(jobId).then(setApps).catch(() => setApps([]));
  };

  useEffect(() => {
    load();
  }, [jobId]);

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
      const j = await api.mo.updateJob(job.id, form);
      setJob(j);
      setForm(jobToForm(j));
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
      setJob(j);
      toast("岗位已关闭", "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "操作失败", "error");
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
      await api.mo.decide(appId, status);
      toast(status === "accepted" ? "已录用" : "已拒绝", "success");
      load();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "操作失败", "error");
    }
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

      <Card className="p-6 mb-6">
        <div className="flex flex-wrap justify-between gap-3 mb-4">
          <div>
            {job.status === "open" ? (
              <Badge tone="ok">开放申请</Badge>
            ) : (
              <Badge tone="neutral">已关闭</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportCsv} aria-label="导出申请人 CSV">
              导出 CSV
            </Button>
            {job.status === "open" && (
              <Button variant="danger" onClick={closeJob}>
                关闭岗位
              </Button>
            )}
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
            <Input
              type="number"
              value={form.assigned_hours}
              onChange={(e) => setForm({ ...form, assigned_hours: Number(e.target.value) })}
              aria-label="工时"
            />
          </div>
        ) : (
          <>
            <p className="text-sm text-ink-600 dark:text-slate-300 whitespace-pre-wrap">{job.requirements}</p>
            <p className="text-xs text-ink-500 dark:text-slate-400 mt-3">
              截止 {job.deadline} · 标签 {job.skill_tags} · 工时 {job.assigned_hours}h
            </p>
          </>
        )}
      </Card>

      <h2 className="font-display font-semibold text-lg mb-3 text-ink-950 dark:text-white">申请人</h2>
      {apps.length === 0 ? (
        <Card className="p-8 text-center text-ink-500 dark:text-slate-400">暂无申请</Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-soft">
          <table className="w-full text-sm" aria-label="申请人列表">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-ink-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-4 py-3 text-left">
                  姓名
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  邮箱
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  学号
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  状态
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a, i) => (
                <tr
                  key={a.id}
                  className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                    i % 2 === 1 ? "bg-slate-50/30 dark:bg-slate-800/20" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-ink-950 dark:text-white">{a.ta_display_name}</td>
                  <td className="px-4 py-3 text-ink-600 dark:text-slate-300">{a.ta_email}</td>
                  <td className="px-4 py-3 text-ink-600 dark:text-slate-300">{a.ta_student_id}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3">
                    {a.status === "pending" ? (
                      <div className="flex gap-2 flex-wrap">
                        <Button className="!py-1 !px-2 text-xs" onClick={() => decide(a.id, "accepted")}>
                          录用
                        </Button>
                        <Button
                          variant="danger"
                          className="!py-1 !px-2 text-xs"
                          onClick={() => decide(a.id, "rejected")}
                        >
                          拒绝
                        </Button>
                      </div>
                    ) : (
                      <span className="text-ink-400 dark:text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
