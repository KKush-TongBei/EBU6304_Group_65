import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import AppShell from "../../AppShell";
import { Button, Card, Input, Textarea } from "../../ui";

export default function MOPost() {
  const nav = useNavigate();
  const [module_name, setModuleName] = useState("");
  const [requirements, setRequirements] = useState("");
  const [deadline, setDeadline] = useState("");
  const [skill_tags, setSkillTags] = useState("");
  const [assigned_hours, setAssignedHours] = useState("5");
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      const j = await api.mo.createJob({
        module_name,
        requirements,
        deadline,
        skill_tags,
        assigned_hours: parseFloat(assigned_hours) || 5,
      });
      nav(`/mo/jobs/${j.id}`);
    } catch (e2: unknown) {
      setErr(e2 instanceof Error ? e2.message : "发布失败");
    }
  };

  return (
    <AppShell title="发布岗位" role="mo">
      <Card className="p-6 max-w-2xl">
        <h1 className="font-display text-xl font-bold text-ink-950">新建助教岗位</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink-700">模块名称</label>
            <Input value={module_name} onChange={(e) => setModuleName(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-700">要求说明</label>
            <Textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-ink-700">截止日期</label>
              <Input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="YYYY-MM-DD" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-700">技能标签（逗号分隔）</label>
              <Input value={skill_tags} onChange={(e) => setSkillTags(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-700">录用后计入工时（小时）</label>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={assigned_hours}
              onChange={(e) => setAssignedHours(e.target.value)}
            />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <Button type="submit">发布</Button>
        </form>
      </Card>
    </AppShell>
  );
}
