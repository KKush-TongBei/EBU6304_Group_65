import { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { useFeedback } from "../../feedback";
import type { User } from "../../types";
import AppShell from "../../AppShell";
import { Button, Card, Input, PageLoading, Textarea } from "../../ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function TAProfile() {
  const { toast } = useFeedback();
  const [u, setU] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    api.ta
      .profile()
      .then(setU)
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
      });
      setU(next);
      toast("已保存", "success");
    } catch (e2: unknown) {
      toast(e2 instanceof Error ? e2.message : "保存失败", "error");
    }
  };

  const onPickFile = () => fileRef.current?.click();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !u) return;
    setU({ ...u, cv_file_path: f.name });
    toast(`已选择文件：${f.name}（仅保存名称，未上传服务器）`, "info");
    e.target.value = "";
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

  return (
    <AppShell title="个人资料" role="ta">
      <Card className="p-6 max-w-xl">
        <h1 className="font-display text-xl font-bold text-ink-950 dark:text-white">助教档案</h1>
        <form onSubmit={save} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="pf-name" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              姓名
            </label>
            <Input
              id="pf-name"
              value={u.display_name}
              onChange={(e) => setU({ ...u, display_name: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="pf-sid" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              学号
            </label>
            <Input
              id="pf-sid"
              value={u.student_id ?? ""}
              onChange={(e) => setU({ ...u, student_id: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="pf-email" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              邮箱
            </label>
            <Input
              id="pf-email"
              type="email"
              value={u.email}
              onChange={(e) => setU({ ...u, email: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="pf-skills" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              技能（可逗号分隔）
            </label>
            <Textarea
              id="pf-skills"
              value={u.skills}
              onChange={(e) => setU({ ...u, skills: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="pf-cv" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
              简历文件路径
            </label>
            <input
              ref={fileRef}
              type="file"
              className="sr-only"
              aria-hidden
              tabIndex={-1}
              onChange={onFile}
            />
            <div className="flex flex-wrap gap-2 mt-1">
              <Input
                id="pf-cv"
                value={u.cv_file_path}
                onChange={(e) => setU({ ...u, cv_file_path: e.target.value })}
                placeholder="例如 /Users/me/CV.pdf"
                aria-describedby="pf-cv-hint"
              />
              <Button type="button" variant="secondary" onClick={onPickFile}>
                选择本地文件
              </Button>
            </div>
            <p id="pf-cv-hint" className="text-xs text-ink-500 dark:text-slate-400 mt-1">
              按课程要求存储路径或文件名字符串；选择文件仅写入文件名，不会上传到服务器。
            </p>
          </div>
          <Button type="submit">保存</Button>
        </form>
      </Card>
    </AppShell>
  );
}
