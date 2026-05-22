import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, downloadWithAuth, setToken } from "../../api";
import { useFeedback } from "../../feedback";
import { useLocale } from "../../locale";
import type { User } from "../../types";
import AppShell from "../../AppShell";
import { Badge, Button, Card, Input, PageLoading, Textarea } from "../../ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function tagsToList(s: string): string[] {
  return s
    .split(/[,，]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function TAProfile() {
  const { toast } = useFeedback();
  const { t, te } = useLocale();
  const nav = useNavigate();
  const [u, setU] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const [skillTagsText, setSkillTagsText] = useState("");
  const [deletePwd, setDeletePwd] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    api.ta
      .profile()
      .then((user) => {
        setU(user);
        const arr = user.profile_skills?.length ? user.profile_skills : tagsToList(user.skills || "");
        setSkillTagsText(arr.join(", "));
      })
      .catch(() => toast(t("common.loadFailed"), "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!u) return;
    if (!u.email.trim() || !EMAIL_RE.test(u.email.trim())) {
      toast(t("auth.emailValidRequired"), "error");
      return;
    }
    try {
      const next = await api.ta.updateProfile({
        display_name: u.display_name,
        student_id: u.student_id ?? "",
        email: u.email,
        skills: u.skills,
        cv_file_path: u.cv_file_path,
        profile_skills: tagsToList(skillTagsText),
        preferred_courses: u.preferred_courses ?? "",
        languages: u.languages ?? "",
        availability_json: u.availability_json ?? "",
        max_weekly_hours: u.max_weekly_hours ?? 0,
        ta_history: u.ta_history ?? "",
        certificates: u.certificates ?? "",
        gpa: u.gpa ?? "",
      });
      setU(next);
      const arr = next.profile_skills?.length ? next.profile_skills : tagsToList(next.skills || "");
      setSkillTagsText(arr.join(", "));
      toast(t("common.saveSuccess"), "success");
    } catch (e2: unknown) {
      toast(e2 instanceof Error ? te(e2.message) : t("common.saveFailed"), "error");
    }
  };

  const onPickFile = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !u) return;
    try {
      await api.ta.uploadCv(f);
      toast(t("ta.cvUploaded"), "success");
      load();
    } catch (err: unknown) {
      toast(err instanceof Error ? te(err.message) : t("ta.uploadFailed"), "error");
    }
    e.target.value = "";
  };

  const downloadCv = async () => {
    if (!u?.cv_file_id) {
      toast(t("ta.noFileToDownload"), "error");
      return;
    }
    const name = u.cv_original_name || "cv";
    try {
      await downloadWithAuth(api.ta.cvDownloadUrl(u.cv_file_id), name);
    } catch (err: unknown) {
      toast(err instanceof Error ? te(err.message) : t("common.downloadFailed"), "error");
    }
  };

  const deleteAccount = async () => {
    if (!deletePwd.trim()) {
      toast(t("ta.confirmPasswordDelete"), "error");
      return;
    }
    if (!window.confirm(t("ta.deleteAccountConfirm"))) return;
    setDeleting(true);
    try {
      await api.auth.deleteAccount(deletePwd);
      setToken(null);
      toast(t("ta.accountDeleted"), "success");
      nav("/login?reason=account_deleted", { replace: true });
    } catch (e2: unknown) {
      toast(e2 instanceof Error ? te(e2.message) : t("ta.deleteFailed"), "error");
    } finally {
      setDeleting(false);
    }
  };

  if (loading && !u) {
    return (
      <AppShell title={t("ta.profileTitle")} role="ta">
        <PageLoading />
      </AppShell>
    );
  }

  if (!u) {
    return (
      <AppShell title={t("ta.profileTitle")} role="ta">
        <p className="text-ink-500 dark:text-slate-400">{t("ta.loadProfileFailed")}</p>
      </AppShell>
    );
  }

  const missing = u.missing_profile_fields ?? [];
  const completeness = u.profile_completeness ?? 0;

  return (
    <AppShell title={t("ta.profileTitle")} role="ta">
      <Card className="p-6 max-w-2xl mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-xl font-bold text-ink-950 dark:text-white">{t("ta.profileArchive")}</h1>
          <div className="text-sm">
            <span className="text-ink-600 dark:text-slate-300">{t("ta.profileCompleteness")} </span>
            <span className="font-bold text-accent">{completeness}%</span>
          </div>
        </div>
        {missing.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {missing.map((f) => (
              <Badge key={f} tone="warn">
                {t("ta.pendingField", { field: f })}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">{t("ta.profileComplete")}</p>
        )}
      </Card>

      <Card className="p-6 max-w-2xl">
        <form onSubmit={save} className="space-y-4" noValidate>
          <div>
            <label htmlFor="pf-name" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              {t("common.name")}
            </label>
            <Input id="pf-name" value={u.display_name} onChange={(e) => setU({ ...u, display_name: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pf-sid" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              {t("common.studentId")}
            </label>
            <Input id="pf-sid" value={u.student_id ?? ""} onChange={(e) => setU({ ...u, student_id: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pf-email" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              {t("common.email")}
            </label>
            <Input id="pf-email" type="email" value={u.email} onChange={(e) => setU({ ...u, email: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pf-skills" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              {t("ta.skillsFreeText")}
            </label>
            <Textarea id="pf-skills" value={u.skills} onChange={(e) => setU({ ...u, skills: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pf-tags" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              {t("ta.structuredSkills")}
            </label>
            <Input id="pf-tags" value={skillTagsText} onChange={(e) => setSkillTagsText(e.target.value)} />
          </div>
          <div>
            <label htmlFor="pf-courses" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              {t("ta.preferredCourses")}
            </label>
            <Input
              id="pf-courses"
              value={u.preferred_courses ?? ""}
              onChange={(e) => setU({ ...u, preferred_courses: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="pf-lang" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              {t("ta.languages")}
            </label>
            <Input id="pf-lang" value={u.languages ?? ""} onChange={(e) => setU({ ...u, languages: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pf-avail" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              {t("ta.availability")}
            </label>
            <Textarea
              id="pf-avail"
              value={u.availability_json ?? ""}
              onChange={(e) => setU({ ...u, availability_json: e.target.value })}
              rows={3}
            />
          </div>
          <div>
            <label htmlFor="pf-maxh" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              {t("ta.maxWeeklyHoursHint")}
            </label>
            <Input
              id="pf-maxh"
              type="number"
              min={0}
              step={0.5}
              value={u.max_weekly_hours ?? 0}
              onChange={(e) => setU({ ...u, max_weekly_hours: Number(e.target.value) })}
            />
          </div>
          <div>
            <label htmlFor="pf-history" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              {t("ta.taHistory")}
            </label>
            <Textarea id="pf-history" value={u.ta_history ?? ""} onChange={(e) => setU({ ...u, ta_history: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pf-cert" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              {t("ta.certificates")}
            </label>
            <Input
              id="pf-cert"
              value={u.certificates ?? ""}
              onChange={(e) => setU({ ...u, certificates: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="pf-gpa" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              {t("ta.gpa")}
            </label>
            <Input id="pf-gpa" value={u.gpa ?? ""} onChange={(e) => setU({ ...u, gpa: e.target.value })} />
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <p className="text-xs font-semibold text-ink-700 dark:text-slate-300 mb-2">{t("ta.cvSection")}</p>
            <input ref={fileRef} type="file" className="sr-only" aria-hidden tabIndex={-1} onChange={onFile} accept=".pdf,.doc,.docx" />
            <div className="flex flex-wrap gap-2 items-center">
              <Button type="button" variant="secondary" onClick={onPickFile}>
                {t("ta.uploadCv")}
              </Button>
              {u.cv_file_id ? (
                <Button type="button" variant="ghost" onClick={downloadCv}>
                  {t("ta.downloadCv")}
                </Button>
              ) : null}
            </div>
            {u.cv_file_path ? (
              <p className="text-xs text-ink-500 dark:text-slate-400 mt-2">
                {t("ta.serverStorage", { path: u.cv_file_path })}
                {u.cv_original_name ? `（${u.cv_original_name}）` : ""}
              </p>
            ) : (
              <p className="text-xs text-ink-500 dark:text-slate-400 mt-2">{t("ta.noCvUploaded")}</p>
            )}
          </div>

          <Button type="submit">{t("ta.saveProfile")}</Button>
        </form>
      </Card>

      <Card className="p-6 max-w-2xl mt-6 border-rose-200 dark:border-rose-900/50">
        <h2 className="font-display text-lg font-bold text-rose-800 dark:text-rose-300">{t("ta.dangerZone")}</h2>
        <p className="mt-2 text-sm text-ink-600 dark:text-slate-400">{t("ta.deleteAccountHint")}</p>
        <div className="mt-4 space-y-2 max-w-md">
          <label htmlFor="del-pwd" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
            {t("ta.confirmPasswordDelete")}
          </label>
          <Input
            id="del-pwd"
            type="password"
            autoComplete="current-password"
            value={deletePwd}
            onChange={(e) => setDeletePwd(e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            className="!border-rose-300 !text-rose-800 dark:!border-rose-800 dark:!text-rose-200"
            disabled={deleting}
            onClick={deleteAccount}
          >
            {deleting ? t("common.processing") : t("ta.deleteAccount")}
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}
