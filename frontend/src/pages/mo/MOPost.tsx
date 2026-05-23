/** MO 发布/编辑岗位：表单校验与模板选择。 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useFeedback } from "../../feedback";
import { useLocale } from "../../locale";
import AppShell from "../../AppShell";
import { Button, Card, Input, Select, Textarea } from "../../ui";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function MOPost() {
  const { toast } = useFeedback();
  const { t, te } = useLocale();
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
    const tpl = templates.find(
      (x) => String(x.id ?? x.saved_id ?? "") === id || String(x.saved_id ?? "") === id
    );
    if (!tpl) return;
    if (typeof tpl.module_name === "string") setModuleName(tpl.module_name);
    if (typeof tpl.requirements === "string") setRequirements(tpl.requirements);
    if (typeof tpl.skill_tags === "string") setSkillTags(tpl.skill_tags);
    if (typeof tpl.assigned_hours === "number") setAssignedHours(String(tpl.assigned_hours));
    if (typeof tpl.quota === "number") setQuota(String(tpl.quota));
    if (typeof tpl.job_type === "string") setJobType(tpl.job_type);
    if (typeof tpl.term === "string") setTerm(tpl.term);
    if (typeof tpl.schedule_text === "string") setScheduleText(tpl.schedule_text);
    if (typeof tpl.allow_duplicate_apply_same_type === "boolean") setAllowDup(tpl.allow_duplicate_apply_same_type);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!module_name.trim()) {
      toast(t("mo.fillModuleName"), "error");
      nameRef.current?.focus();
      return;
    }
    if (deadline.trim() && !DATE_RE.test(deadline.trim())) {
      toast(t("mo.deadlineFormat"), "error");
      return;
    }
    const hours = parseFloat(assigned_hours);
    if (Number.isNaN(hours) || hours < 0) {
      toast(t("mo.hoursNonNegative"), "error");
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
      toast(publish ? t("mo.jobPublished") : t("mo.draftSaved"), "success");
      nav(`/mo/jobs/${j.id}`);
    } catch (e2: unknown) {
      toast(e2 instanceof Error ? te(e2.message) : t("mo.publishFailed"), "error");
    }
  };

  return (
    <AppShell title={t("shell.titleMoPost")} role="mo">
      <Card className="p-6 max-w-2xl">
        <h1 className="font-display text-xl font-bold text-ink-950 dark:text-white">{t("mo.newJob")}</h1>
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="post-tpl" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              {t("mo.templatePrefill")}
            </label>
            <Select
              id="post-tpl"
              className="mt-1"
              value={templateId}
              onChange={(e) => applyTemplateSelection(e.target.value)}
            >
              <option value="">{t("mo.noTemplate")}</option>
              {templates.map((tpl, idx) => {
                const id = String(tpl.saved_id ?? tpl.id ?? `tpl_${idx}`);
                const label = (tpl.name as string) || (tpl.module_name as string) || id;
                return (
                  <option key={`${id}_${idx}`} value={id}>
                    {(tpl.built_in ? t("mo.builtIn") : t("mo.myTemplate")) + label}
                  </option>
                );
              })}
            </Select>
          </div>
          <div>
            <label htmlFor="post-name" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              {t("mo.moduleName")}
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
              {t("mo.requirements")}
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
                {t("common.deadline")}
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
                {t("mo.skillTags")}
              </label>
              <Input id="post-tags" value={skill_tags} onChange={(e) => setSkillTags(e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="post-quota" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
                {t("mo.headcount")}
              </label>
              <Input id="post-quota" type="number" min={1} value={quota} onChange={(e) => setQuota(e.target.value)} />
            </div>
            <div>
              <label htmlFor="post-type" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
                {t("mo.jobType")}
              </label>
              <Select
                id="post-type"
                className="mt-1"
                value={job_type}
                onChange={(e) => setJobType(e.target.value)}
              >
                <option value="course_ta">{t("mo.jobTypeCourseTa")}</option>
                <option value="invigilation">{t("mo.jobTypeInvigilation")}</option>
                <option value="event_support">{t("mo.jobTypeEvent")}</option>
              </Select>
            </div>
          </div>
          <div>
            <label htmlFor="post-term" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              {t("mo.term")}
            </label>
            <Input
              id="post-term"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={t("common.semesterExample")}
            />
          </div>
          <div>
            <label htmlFor="post-schedule" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              {t("mo.scheduleClassTime")}
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
              {t("mo.hoursAfterHire")}
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
            {t("mo.publishNow")}
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-800 dark:text-slate-200">
            <input type="checkbox" checked={allowDup} onChange={(e) => setAllowDup(e.target.checked)} />
            {t("mo.allowDupMulti")}
          </label>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-ink-700 dark:text-slate-300 mb-2">{t("mo.saveAsTemplate")}</p>
            <div className="flex flex-wrap gap-2 items-end">
              <Input
                className="max-w-xs"
                placeholder={t("mo.templateName")}
                value={saveTplName}
                onChange={(e) => setSaveTplName(e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  if (!saveTplName.trim()) {
                    toast(t("mo.fillTemplateName"), "error");
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
                    toast(t("mo.templateSaved"), "success");
                    const list = await api.mo.jobTemplates();
                    setTemplates(list);
                  } catch (e2: unknown) {
                    toast(e2 instanceof Error ? te(e2.message) : t("mo.saveTemplateFailed"), "error");
                  }
                }}
              >
                {t("mo.saveFormAsTemplate")}
              </Button>
            </div>
          </div>
          <Button type="submit">{publish ? t("mo.publish") : t("mo.saveDraft")}</Button>
        </form>
      </Card>
    </AppShell>
  );
}
