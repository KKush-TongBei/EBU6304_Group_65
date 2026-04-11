import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, downloadWithAuth, setToken } from "../../api";
import { useFeedback } from "../../feedback";
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
      .catch(() => toast("加载失败", "error"))
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
      toast("请输入有效邮箱", "error");
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
      toast("已保存", "success");
    } catch (e2: unknown) {
      toast(e2 instanceof Error ? e2.message : "保存失败", "error");
    }
  };

  const onPickFile = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !u) return;
    try {
      await api.ta.uploadCv(f);
      toast("简历已上传", "success");
      load();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "上传失败", "error");
    }
    e.target.value = "";
  };

  const downloadCv = async () => {
    if (!u?.cv_file_id) {
      toast("暂无可下载文件", "error");
      return;
    }
    const name = u.cv_original_name || "cv";
    try {
      await downloadWithAuth(api.ta.cvDownloadUrl(u.cv_file_id), name);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "下载失败", "error");
    }
  };

  const deleteAccount = async () => {
    if (!deletePwd.trim()) {
      toast("请输入当前密码以确认注销", "error");
      return;
    }
    if (!window.confirm("确定要永久注销账号吗？此操作不可恢复。")) return;
    setDeleting(true);
    try {
      await api.auth.deleteAccount(deletePwd);
      setToken(null);
      toast("账号已注销", "success");
      nav("/login?reason=account_deleted", { replace: true });
    } catch (e2: unknown) {
      toast(e2 instanceof Error ? e2.message : "注销失败", "error");
    } finally {
      setDeleting(false);
    }
  };

  if (loading && !u) {
    return (
      <AppShell title="个人资料" role="ta">
        <PageLoading />
      </AppShell>
    );
  }

  if (!u) {
    return (
      <AppShell title="个人资料" role="ta">
        <p className="text-ink-500 dark:text-slate-400">无法加载资料</p>
      </AppShell>
    );
  }

  const missing = u.missing_profile_fields ?? [];
  const completeness = u.profile_completeness ?? 0;

  return (
    <AppShell title="个人资料" role="ta">
      <Card className="p-6 max-w-2xl mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-xl font-bold text-ink-950 dark:text-white">助教档案</h1>
          <div className="text-sm">
            <span className="text-ink-600 dark:text-slate-300">资料完整度 </span>
            <span className="font-bold text-accent">{completeness}%</span>
          </div>
        </div>
        {missing.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {missing.map((f) => (
              <Badge key={f} tone="warn">
                待填：{f}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">资料项已齐全</p>
        )}
      </Card>

      <Card className="p-6 max-w-2xl">
        <form onSubmit={save} className="space-y-4" noValidate>
          <div>
            <label htmlFor="pf-name" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              姓名
            </label>
            <Input id="pf-name" value={u.display_name} onChange={(e) => setU({ ...u, display_name: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pf-sid" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              学号
            </label>
            <Input id="pf-sid" value={u.student_id ?? ""} onChange={(e) => setU({ ...u, student_id: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pf-email" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              邮箱
            </label>
            <Input id="pf-email" type="email" value={u.email} onChange={(e) => setU({ ...u, email: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pf-skills" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              技能说明（自由文本）
            </label>
            <Textarea id="pf-skills" value={u.skills} onChange={(e) => setU({ ...u, skills: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pf-tags" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              结构化技能标签（逗号分隔）
            </label>
            <Input id="pf-tags" value={skillTagsText} onChange={(e) => setSkillTagsText(e.target.value)} />
          </div>
          <div>
            <label htmlFor="pf-courses" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              偏好课程
            </label>
            <Input
              id="pf-courses"
              value={u.preferred_courses ?? ""}
              onChange={(e) => setU({ ...u, preferred_courses: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="pf-lang" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              语言能力
            </label>
            <Input id="pf-lang" value={u.languages ?? ""} onChange={(e) => setU({ ...u, languages: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pf-avail" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              可用时段（JSON 或文字描述）
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
              每周可承担最大工时（工时/周，0 表示未设置）
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
              TA / 相关经历
            </label>
            <Textarea id="pf-history" value={u.ta_history ?? ""} onChange={(e) => setU({ ...u, ta_history: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pf-cert" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              证书
            </label>
            <Input
              id="pf-cert"
              value={u.certificates ?? ""}
              onChange={(e) => setU({ ...u, certificates: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="pf-gpa" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              GPA / 成绩说明
            </label>
            <Input id="pf-gpa" value={u.gpa ?? ""} onChange={(e) => setU({ ...u, gpa: e.target.value })} />
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <p className="text-xs font-semibold text-ink-700 dark:text-slate-300 mb-2">简历文件（PDF / Word，最大 5MB）</p>
            <input ref={fileRef} type="file" className="sr-only" aria-hidden tabIndex={-1} onChange={onFile} accept=".pdf,.doc,.docx" />
            <div className="flex flex-wrap gap-2 items-center">
              <Button type="button" variant="secondary" onClick={onPickFile}>
                上传简历
              </Button>
              {u.cv_file_id ? (
                <Button type="button" variant="ghost" onClick={downloadCv}>
                  下载当前简历
                </Button>
              ) : null}
            </div>
            {u.cv_file_path ? (
              <p className="text-xs text-ink-500 dark:text-slate-400 mt-2">
                服务器存储名：{u.cv_file_path}
                {u.cv_original_name ? `（${u.cv_original_name}）` : ""}
              </p>
            ) : (
              <p className="text-xs text-ink-500 dark:text-slate-400 mt-2">尚未上传服务器端简历</p>
            )}
          </div>

          <Button type="submit">保存资料</Button>
        </form>
      </Card>

      <Card className="p-6 max-w-2xl mt-6 border-rose-200 dark:border-rose-900/50">
        <h2 className="font-display text-lg font-bold text-rose-800 dark:text-rose-300">危险操作</h2>
        <p className="mt-2 text-sm text-ink-600 dark:text-slate-400">
          注销后您的账号、申请与收藏等数据将从系统中移除，且无法恢复。管理员会收到一条系统通知。
        </p>
        <div className="mt-4 space-y-2 max-w-md">
          <label htmlFor="del-pwd" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
            输入当前密码确认
          </label>
          <Input
            id="del-pwd"
            type="password"
            autoComplete="current-password"
            value={deletePwd}
            onChange={(e) => setDeletePwd(e.target.value)}
          />
          <Button type="button" variant="secondary" className="!border-rose-300 !text-rose-800 dark:!border-rose-800 dark:!text-rose-200" disabled={deleting} onClick={deleteAccount}>
            {deleting ? "处理中…" : "注销账号"}
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}
