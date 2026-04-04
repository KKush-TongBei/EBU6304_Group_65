import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, downloadWithAuth } from "../../api";
import type { Application, Job } from "../../types";
import AppShell from "../../AppShell";
import { Badge, Button, Card, Input, Textarea, StatusBadge } from "../../ui";

export default function MOJobDetail() {
  const { id } = useParams();
  const jobId = Number(id);
  const [job, setJob] = useState<Job | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ module_name: "", requirements: "", deadline: "", skill_tags: "", assigned_hours: 5 });

  const load = () => {
    if (!jobId) return;
    api.mo.myJobs().then((jobs) => {
      const j = jobs.find((x) => x.id === jobId) ?? null;
      setJob(j);
      if (j) {
        setForm({
          module_name: j.module_name,
          requirements: j.requirements,
          deadline: j.deadline,
          skill_tags: j.skill_tags,
          assigned_hours: j.assigned_hours,
        });
      }
    });
    api.mo.applicants(jobId).then(setApps).catch(() => setApps([]));
  };

  useEffect(() => {
    load();
  }, [jobId]);

  const save = async () => {
    if (!job) return;
    try {
      const j = await api.mo.updateJob(job.id, form);
      setJob(j);
      setEditing(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "保存失败");
    }
  };

  const closeJob = async () => {
    if (!job || !confirm("关闭后学生无法再申请，确定？")) return;
    try {
      const j = await api.mo.closeJob(job.id);
      setJob(j);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "操作失败");
    }
  };

  const decide = async (appId: number, status: "accepted" | "rejected") => {
    try {
      await api.mo.decide(appId, status);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "操作失败");
    }
  };

  if (!jobId || Number.isNaN(jobId)) {
    return (
      <AppShell title="岗位" role="mo">
        <p>无效 ID</p>
      </AppShell>
    );
  }

  if (!job) {
    return (
      <AppShell title="岗位" role="mo">
        <p className="text-ink-500">加载中或未找到该岗位…</p>
        <Link to="/mo/jobs" className="text-accent text-sm mt-4 inline-block">
          返回列表
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell title={job.module_name} role="mo">
      <div className="mb-4">
        <Link to="/mo/jobs" className="text-sm text-accent hover:underline">
          ← 返回岗位列表
        </Link>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex flex-wrap justify-between gap-3 mb-4">
          <div>
            {job.status === "open" ? <Badge tone="ok">开放申请</Badge> : <Badge tone="neutral">已关闭</Badge>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => downloadWithAuth(api.mo.exportCsvUrl(job.id), `job_${job.id}.csv`)}>
              导出 CSV
            </Button>
            {job.status === "open" && (
              <Button variant="danger" onClick={closeJob}>
                关闭岗位
              </Button>
            )}
            <Button variant={editing ? "primary" : "secondary"} onClick={() => (editing ? save() : setEditing(true))}>
              {editing ? "保存修改" : "编辑岗位"}
            </Button>
          </div>
        </div>

        {editing ? (
          <div className="space-y-3">
            <Input value={form.module_name} onChange={(e) => setForm({ ...form, module_name: e.target.value })} />
            <Textarea value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
            <div className="grid sm:grid-cols-2 gap-3">
              <Input value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              <Input value={form.skill_tags} onChange={(e) => setForm({ ...form, skill_tags: e.target.value })} />
            </div>
            <Input
              type="number"
              value={form.assigned_hours}
              onChange={(e) => setForm({ ...form, assigned_hours: Number(e.target.value) })}
            />
          </div>
        ) : (
          <>
            <p className="text-sm text-ink-600 whitespace-pre-wrap">{job.requirements}</p>
            <p className="text-xs text-ink-500 mt-3">
              截止 {job.deadline} · 标签 {job.skill_tags} · 工时 {job.assigned_hours}h
            </p>
          </>
        )}
      </Card>

      <h2 className="font-display font-semibold text-lg mb-3">申请人</h2>
      {apps.length === 0 ? (
        <Card className="p-8 text-center text-ink-500">暂无申请</Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-ink-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left">姓名</th>
                <th className="px-4 py-3 text-left">邮箱</th>
                <th className="px-4 py-3 text-left">学号</th>
                <th className="px-4 py-3 text-left">状态</th>
                <th className="px-4 py-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">{a.ta_display_name}</td>
                  <td className="px-4 py-3">{a.ta_email}</td>
                  <td className="px-4 py-3">{a.ta_student_id}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3">
                    {a.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button className="!py-1 !px-2 text-xs" onClick={() => decide(a.id, "accepted")}>
                          录用
                        </Button>
                        <Button variant="danger" className="!py-1 !px-2 text-xs" onClick={() => decide(a.id, "rejected")}>
                          拒绝
                        </Button>
                      </div>
                    ) : (
                      <span className="text-ink-400">—</span>
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
