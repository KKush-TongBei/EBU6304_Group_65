import { useEffect, useState } from "react";
import { api } from "../../api";
import type { Application, Job } from "../../types";
import AppShell from "../../AppShell";
import { Badge, Button, Card, Input } from "../../ui";

export default function TAJobs() {
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
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "申请失败");
    }
  };

  return (
    <AppShell title="浏览岗位" role="ta">
      <Card className="p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs font-semibold text-ink-700">关键词</label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="模块名或要求" />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs font-semibold text-ink-700">技能</label>
          <Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="如 Python" />
        </div>
        <Button onClick={load}>搜索</Button>
      </Card>

      {err && <p className="text-red-600 text-sm mb-4">{err}</p>}
      {loading ? (
        <p className="text-ink-500">加载中…</p>
      ) : jobs.length === 0 ? (
        <Card className="p-12 text-center text-ink-500">未找到符合条件的开放岗位。</Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((j) => {
            const existing = appByJob.get(j.id);
            const showApply =
              !existing || existing.status === "withdrawn";
            return (
              <Card key={j.id} className="p-5">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h3 className="font-display font-semibold text-lg text-ink-950">{j.module_name}</h3>
                    <p className="text-xs text-ink-500 mt-1">
                      截止 {j.deadline || "—"} · 预估工时 {j.assigned_hours}h ·{" "}
                      <Badge tone="ok">开放</Badge>
                    </p>
                  </div>
                  <div>
                    {existing && existing.status === "pending" && (
                      <Badge tone="warn">已申请（待处理）</Badge>
                    )}
                    {existing && existing.status === "accepted" && <Badge tone="ok">已录用</Badge>}
                    {existing && existing.status === "rejected" && <Badge tone="bad">未通过</Badge>}
                    {existing && existing.status === "withdrawn" && (
                      <Badge tone="neutral">已撤回，可再申请</Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-ink-700 mt-3 whitespace-pre-wrap">{j.requirements}</p>
                {j.skill_tags && (
                  <p className="text-xs text-ink-500 mt-2">技能标签：{j.skill_tags}</p>
                )}
                <div className="mt-4">
                  {showApply ? (
                    <Button onClick={() => apply(j.id)}>申请</Button>
                  ) : existing?.status === "pending" ? (
                    <span className="text-sm text-ink-500">请在「我的申请」中撤回（若需）</span>
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
