import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { useFeedback } from "../../feedback";
import type { UserRole } from "../../types";
import AppShell from "../../AppShell";
import { Button, Card, Input, Select } from "../../ui";

export default function AdminUsers() {
  const { toast } = useFeedback();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Extract<UserRole, "mo" | "admin">>("mo");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.admin.createUser({
        email: email.trim(),
        password,
        role,
        display_name: displayName || undefined,
      });
      toast("用户已创建", "success");
      setEmail("");
      setPassword("");
      setDisplayName("");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "创建失败", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="管理员 · 创建用户" role="admin">
      <div className="mb-4">
        <Link to="/admin" className="text-sm text-accent hover:underline">
          ← 返回管理员首页
        </Link>
      </div>
      <Card className="p-6 max-w-lg">
        <p className="text-sm text-ink-600 dark:text-slate-300 mb-4">
          创建 MO 或 Admin 账号。密码需至少 8 位且同时包含字母与数字。
        </p>
        <form onSubmit={submit} className="space-y-3">
          <Select value={role} onChange={(e) => setRole(e.target.value as "mo" | "admin")} aria-label="角色">
            <option value="mo">课程负责人 (MO)</option>
            <option value="admin">管理员 (Admin)</option>
          </Select>
          <Input placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <Input placeholder="显示名称" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <Button type="submit" disabled={busy}>
            {busy ? "创建中…" : "创建用户"}
          </Button>
        </form>
      </Card>
    </AppShell>
  );
}
