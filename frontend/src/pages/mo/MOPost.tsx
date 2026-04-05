import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useFeedback } from "../../feedback";
import AppShell from "../../AppShell";
import { Button, Card, Input, Select, Textarea } from "../../ui";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function MOPost() {
  const { toast } = useFeedback();
  const nav = useNavigate();
  const [module_name, setModuleName] = useState("");
  const [requirements, setRequirements] = useState("");
  const [deadline, setDeadline] = useState("");
  const [skill_tags, setSkillTags] = useState("");
  const [assigned_hours, setAssignedHours] = useState("5");
  const [quota, setQuota] = useState("1");
  const [job_type, setJobType] = useState("course_ta");
  const [term, setTerm] = useState("");
  const [schedule_text, setScheduleText] = useState("");
  const [publish, setPublish] = useState(false);
  const [allowDup, setAllowDup] = useState(true);
  const [templates, setTemplates] = useState<Record<string, unknown>[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [saveTplName, setSaveTplName] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.mo.jobTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  const applyTemplateSelection = (id: string) => {
    setTemplateId(id);
    if (!id) return;
    const t = templates.find(
      (x) => String(x.id ?? x.saved_id ?? "") === id || String(x.saved_id ?? "") === id
    );
    if (!t) return;
    if (typeof t.module_name === "string") setModuleName(t.module_name);
    if (typeof t.requirements === "string") setRequirements(t.requirements);
    if (typeof t.skill_tags === "string") setSkillTags(t.skill_tags);
    if (typeof t.assigned_hours === "number") setAssignedHours(String(t.assigned_hours));
    if (typeof t.quota === "number") setQuota(String(t.quota));
    if (typeof t.job_type === "string") setJobType(t.job_type);
    if (typeof t.term === "string") setTerm(t.term);
    if (typeof t.schedule_text === "string") setScheduleText(t.schedule_text);
    if (typeof t.allow_duplicate_apply_same_type === "boolean") setAllowDup(t.allow_duplicate_apply_same_type);
  };

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
    const qn = parseInt(quota, 10);
    try {
      const j = await api.mo.createJob({
        ...(templateId ? { template_id: templateId } : {}),
        module_name: module_name.trim(),
        requirements,
        deadline: deadline.trim(),
        skill_tags,
        assigned_hours: hours || 5,
        quota: Number.isFinite(qn) && qn >= 1 ? qn : 1,
        job_type,
        term: term.trim(),
        schedule_text: schedule_text.trim(),
        publish,
        allow_duplicate_apply_same_type: allowDup,
      });
      toast(publish ? "岗位已发布" : "草稿已保存", "success");
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
            <label htmlFor="post-tpl" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              从模板预填（可选）
            </label>
            <Select
              id="post-tpl"
              className="mt-1"
              value={templateId}
              onChange={(e) => applyTemplateSelection(e.target.value)}
            >
              <option value="">不使用模板</option>
              {templates.map((t, idx) => {
                const id = String(t.saved_id ?? t.id ?? `tpl_${idx}`);
                const label = (t.name as string) || (t.module_name as string) || id;
                return (
                  <option key={`${id}_${idx}`} value={id}>
                    {(t.built_in ? "[内置] " : "[我的] ") + label}
                  </option>
                );
              })}
            </Select>
          </div>
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
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="post-quota" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
                招聘人数
              </label>
              <Input id="post-quota" type="number" min={1} value={quota} onChange={(e) => setQuota(e.target.value)} />
            </div>
            <div>
              <label htmlFor="post-type" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
                岗位类型
              </label>
              <select
                id="post-type"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                value={job_type}
                onChange={(e) => setJobType(e.target.value)}
              >
                <option value="course_ta">课程 TA</option>
                <option value="invigilation">监考</option>
                <option value="event_support">活动支持</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="post-term" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              学期
            </label>
            <Input id="post-term" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="如 2025-2026-1" />
          </div>
          <div>
            <label htmlFor="post-schedule" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              上课时间 / 工作时段
            </label>
            <Textarea
              id="post-schedule"
              value={schedule_text}
              onChange={(e) => setScheduleText(e.target.value)}
              rows={2}
            />
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
          <label className="flex items-center gap-2 text-sm text-ink-800 dark:text-slate-200">
            <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
            立即发布（开放申请）；不勾选则保存为草稿
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-800 dark:text-slate-200">
            <input type="checkbox" checked={allowDup} onChange={(e) => setAllowDup(e.target.checked)} />
            允许同一学期重复申请多个同类岗位
          </label>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-ink-700 dark:text-slate-300 mb-2">保存为我的模板</p>
            <div className="flex flex-wrap gap-2 items-end">
              <Input
                className="max-w-xs"
                placeholder="模板名称"
                value={saveTplName}
                onChange={(e) => setSaveTplName(e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  if (!saveTplName.trim()) {
                    toast("请填写模板名称", "error");
                    return;
                  }
                  const hours = parseFloat(assigned_hours);
                  const qn = parseInt(quota, 10);
                  try {
                    await api.mo.saveJobTemplate({
                      name: saveTplName.trim(),
                      module_name: module_name.trim(),
                      requirements,
                      skill_tags,
                      assigned_hours: Number.isFinite(hours) ? hours : 5,
                      quota: Number.isFinite(qn) && qn >= 1 ? qn : 1,
                      job_type,
                      term: term.trim(),
                      schedule_text: schedule_text.trim(),
                      allow_duplicate_apply_same_type: allowDup,
                    });
                    toast("模板已保存", "success");
                    const list = await api.mo.jobTemplates();
                    setTemplates(list);
                  } catch (e2: unknown) {
                    toast(e2 instanceof Error ? e2.message : "保存模板失败", "error");
                  }
                }}
              >
                保存当前表单为模板
              </Button>
            </div>
          </div>
          <Button type="submit">{publish ? "发布" : "保存草稿"}</Button>
        </form>
      </Card>
    </AppShell>
  );
}
