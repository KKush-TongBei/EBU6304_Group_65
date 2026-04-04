import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useFeedback } from "../../feedback";
import AppShell from "../../AppShell";
import { Button, Card, Input, Textarea } from "../../ui";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function MOPost() {
  const { toast } = useFeedback();
  const nav = useNavigate();
  const [module_name, setModuleName] = useState("");
  const [requirements, setRequirements] = useState("");
  const [deadline, setDeadline] = useState("");
  const [skill_tags, setSkillTags] = useState("");
  const [assigned_hours, setAssignedHours] = useState("5");
  const nameRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!module_name.trim()) {
      toast("请填写模块名称", "error");
      nameRef.current?.focus();
      return;
    }
    if (deadline.trim() && !DATE_RE.test(deadline.trim())) {
      toast("截止日期请使用 YYYY-MM-DD 格式", "error");
      return;
    }
    const hours = parseFloat(assigned_hours);
    if (Number.isNaN(hours) || hours < 0) {
      toast("工时必须为非负数", "error");
      return;
    }
    try {
      const j = await api.mo.createJob({
        module_name: module_name.trim(),
        requirements,
        deadline: deadline.trim(),
        skill_tags,
        assigned_hours: hours || 5,
      });
      toast("岗位已发布", "success");
      nav(`/mo/jobs/${j.id}`);
    } catch (e2: unknown) {
      toast(e2 instanceof Error ? e2.message : "发布失败", "error");
    }
  };

  return (
    <AppShell title="发布岗位" role="mo">
      <Card className="p-6 max-w-2xl">
        <h1 className="font-display text-xl font-bold text-ink-950 dark:text-white">新建助教岗位</h1>
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="post-name" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              模块名称
            </label>
            <Input
              id="post-name"
              ref={nameRef}
              value={module_name}
              onChange={(e) => setModuleName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="post-req" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              要求说明
            </label>
            <Textarea
              id="post-req"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="post-deadline" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
                截止日期
              </label>
              <Input
                id="post-deadline"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div>
              <label htmlFor="post-tags" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
                技能标签（逗号分隔）
              </label>
              <Input id="post-tags" value={skill_tags} onChange={(e) => setSkillTags(e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="post-hours" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              录用后计入工时（小时）
            </label>
            <Input
              id="post-hours"
              type="number"
              min={0}
              step={0.5}
              value={assigned_hours}
              onChange={(e) => setAssignedHours(e.target.value)}
            />
          </div>
          <Button type="submit">发布</Button>
        </form>
      </Card>
    </AppShell>
  );
}
