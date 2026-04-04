import { useEffect, useState } from "react";
import { api } from "../../api";
import type { User } from "../../types";
import AppShell from "../../AppShell";
import { Button, Card, Input, Textarea } from "../../ui";

export default function TAProfile() {
  const [u, setU] = useState<User | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = () => {
    api.ta.profile().then(setU).catch(() => setErr("加载失败"));
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!u) return;
    setErr("");
    setMsg("");
    try {
      const next = await api.ta.updateProfile({
        display_name: u.display_name,
        student_id: u.student_id ?? "",
        email: u.email,
        skills: u.skills,
        cv_file_path: u.cv_file_path,
      });
      setU(next);
      setMsg("已保存");
    } catch (e2: unknown) {
      setErr(e2 instanceof Error ? e2.message : "保存失败");
    }
  };

  if (!u) return <AppShell title="个人资料" role="ta"><p className="text-ink-500">加载中…</p></AppShell>;

  return (
    <AppShell title="个人资料" role="ta">
      <Card className="p-6 max-w-xl">
        <h1 className="font-display text-xl font-bold text-ink-950">助教档案</h1>
        <form onSubmit={save} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink-700">姓名</label>
            <Input
              value={u.display_name}
              onChange={(e) => setU({ ...u, display_name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-700">学号</label>
            <Input
              value={u.student_id ?? ""}
              onChange={(e) => setU({ ...u, student_id: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-700">邮箱</label>
            <Input
              type="email"
              value={u.email}
              onChange={(e) => setU({ ...u, email: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-700">技能（可逗号分隔）</label>
            <Textarea
              value={u.skills}
              onChange={(e) => setU({ ...u, skills: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-700">简历文件路径</label>
            <Input
              value={u.cv_file_path}
              onChange={(e) => setU({ ...u, cv_file_path: e.target.value })}
              placeholder="例如 /Users/me/CV.pdf"
            />
            <p className="text-xs text-ink-500 mt-1">按课程要求存储本地路径字符串，无需实际上传文件。</p>
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          {msg && <p className="text-sm text-emerald-600">{msg}</p>}
          <Button type="submit">保存</Button>
        </form>
      </Card>
    </AppShell>
  );
}
