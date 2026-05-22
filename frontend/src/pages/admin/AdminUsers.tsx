import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { useFeedback } from "../../feedback";
import type { AdminUserSummary, UserRole } from "../../types";
import AppShell from "../../AppShell";
import { Button, Card, Input, PageLoading, Select } from "../../ui";

const PAGE_SIZE = 50;

function formatStatus(u: AdminUserSummary): string {
  if (u.disabled) return "已禁用";
  if (u.locked_until && new Date(u.locked_until).getTime() > Date.now()) return "锁定中";
  return "正常";
}

function formatCreatedAt(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminUsers() {
  const { toast, confirm } = useFeedback();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Extract<UserRole, "mo" | "admin">>("mo");
  const [displayName, setDisplayName] = useState("");
  const [staffId, setStaffId] = useState("");
  const [busy, setBusy] = useState(false);

  const [listRole, setListRole] = useState("");
  const [listQ, setListQ] = useState("");
  const [items, setItems] = useState<AdminUserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [rowBusyId, setRowBusyId] = useState<number | null>(null);

  const loadList = useCallback(
    (opts?: { reset?: boolean }) => {
      const nextSkip = opts?.reset ? 0 : skip;
      if (opts?.reset) setSkip(0);
      setListLoading(true);
      api.admin
        .listUsers({
          role: listRole || undefined,
          q: listQ.trim() || undefined,
          skip: opts?.reset ? 0 : nextSkip,
          limit: PAGE_SIZE,
        })
        .then((res) => {
          if (opts?.reset) {
            setItems(res.items);
          } else {
            setItems((prev) => (nextSkip === 0 ? res.items : [...prev, ...res.items]));
          }
          setTotal(res.total);
        })
        .catch((e: unknown) => {
          toast(e instanceof Error ? e.message : "用户列表加载失败", "error");
          if (opts?.reset) setItems([]);
        })
        .finally(() => setListLoading(false));
    },
    [listRole, listQ, skip, toast]
  );

  useEffect(() => {
    loadList({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅首屏
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "mo" && !staffId.trim()) {
      toast("MO 账号需要填写职工号", "error");
      return;
    }
    setBusy(true);
    try {
      await api.admin.createUser({
        email: email.trim(),
        password,
        role,
        display_name: displayName || undefined,
        student_id: role === "mo" ? staffId.trim() : undefined,
      });
      toast("用户已创建", "success");
      setEmail("");
      setPassword("");
      setDisplayName("");
      setStaffId("");
      loadList({ reset: true });
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "创建失败", "error");
    } finally {
      setBusy(false);
    }
  };

  const searchUsers = () => loadList({ reset: true });

  const loadMore = () => {
    const next = skip + PAGE_SIZE;
    if (next >= total) return;
    setSkip(next);
    setListLoading(true);
    api.admin
      .listUsers({
        role: listRole || undefined,
        q: listQ.trim() || undefined,
        skip: next,
        limit: PAGE_SIZE,
      })
      .then((res) => {
        setItems((prev) => [...prev, ...res.items]);
        setTotal(res.total);
      })
      .catch((e: unknown) => toast(e instanceof Error ? e.message : "加载失败", "error"))
      .finally(() => setListLoading(false));
  };

  const toggleDisabled = async (u: AdminUserSummary) => {
    if (u.role === "admin") return;
    const enabling = u.disabled;
    const ok = await confirm({
      title: enabling ? "启用账号" : "禁用账号",
      message: enabling
        ? `确定启用 ${u.email}？将清除登录锁定状态。`
        : `确定禁用 ${u.email}？该用户将无法登录。`,
      confirmText: enabling ? "启用" : "禁用",
      danger: !enabling,
    });
    if (!ok) return;
    setRowBusyId(u.id);
    try {
      await api.admin.patchUser(u.id, { disabled: !u.disabled });
      toast(enabling ? "已启用" : "已禁用", "success");
      loadList({ reset: true });
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "操作失败", "error");
    } finally {
      setRowBusyId(null);
    }
  };

  const resetPassword = async (u: AdminUserSummary) => {
    const pwd = window.prompt(`为 ${u.email} 设置新密码（至少 8 位，含字母与数字）：`);
    if (!pwd) return;
    if (pwd.length < 8 || !/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) {
      toast("密码需至少 8 位且同时包含字母与数字", "error");
      return;
    }
    const ok = await confirm({
      title: "重置密码",
      message: `确定重置 ${u.email} 的登录密码？`,
      confirmText: "重置",
      danger: true,
    });
    if (!ok) return;
    setRowBusyId(u.id);
    try {
      await api.admin.patchUser(u.id, { password: pwd });
      toast("密码已重置", "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "重置失败", "error");
    } finally {
      setRowBusyId(null);
    }
  };

  const deleteUser = async (u: AdminUserSummary) => {
    if (u.role === "admin") return;
    const ok = await confirm({
      title: "删除用户",
      message:
        u.role === "mo"
          ? `确定删除课程负责人 ${u.email}？将强制删除其全部岗位及关联数据，且不可恢复。`
          : `确定删除助教 ${u.email}？将删除其申请、简历等关联数据，且不可恢复。`,
      confirmText: "删除",
      danger: true,
    });
    if (!ok) return;
    setRowBusyId(u.id);
    try {
      await api.admin.deleteUser(u.id);
      toast("用户已删除", "success");
      loadList({ reset: true });
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "删除失败", "error");
    } finally {
      setRowBusyId(null);
    }
  };

  return (
    <AppShell title="管理员 · 用户管理" role="admin">
      <div className="mb-4">
        <Link to="/admin" className="text-sm text-accent hover:underline">
          ← 返回管理员首页
        </Link>
      </div>

      <Card className="p-6 max-w-lg mb-8">
        <h2 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">创建用户</h2>
        <p className="text-sm text-ink-600 dark:text-slate-300 mb-4">
          创建 MO 或 Admin 账号。密码需至少 8 位且同时包含字母与数字。
          {role === "mo" ? " MO 需填写职工号，与公开注册一致。" : null}
        </p>
        <form onSubmit={submit} className="space-y-3">
          <Select value={role} onChange={(e) => setRole(e.target.value as "mo" | "admin")} aria-label="角色">
            <option value="mo">课程负责人 (MO)</option>
            <option value="admin">管理员 (Admin)</option>
          </Select>
          {role === "mo" ? (
            <>
              <Input placeholder="姓名" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              <Input placeholder="职工号" value={staffId} onChange={(e) => setStaffId(e.target.value)} required />
              <Input placeholder="邮箱" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input
                type="password"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </>
          ) : (
            <>
              <Input placeholder="姓名" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              <Input placeholder="邮箱" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input
                type="password"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "创建中…" : "创建用户"}
          </Button>
        </form>
      </Card>

      <Card className="p-4 mb-4">
        <h2 className="text-lg font-semibold text-ink-900 dark:text-white mb-3">用户列表与治理</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label htmlFor="filter-role" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block">
              角色
            </label>
            <Select
              id="filter-role"
              className="mt-1 w-36"
              value={listRole}
              onChange={(e) => setListRole(e.target.value)}
              aria-label="筛选角色"
            >
              <option value="">全部</option>
              <option value="ta">助教 (TA)</option>
              <option value="mo">课程负责人 (MO)</option>
              <option value="admin">管理员</option>
            </Select>
          </div>
          <div className="flex-1 min-w-[12rem]">
            <label htmlFor="filter-q" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block">
              搜索（邮箱 / 姓名 / 学号工号）
            </label>
            <Input
              id="filter-q"
              className="mt-1"
              value={listQ}
              onChange={(e) => setListQ(e.target.value)}
              placeholder="输入关键词"
            />
          </div>
          <Button type="button" onClick={searchUsers} disabled={listLoading}>
            查询
          </Button>
        </div>
        <p className="text-xs text-ink-500 dark:text-slate-400 mt-2">
          共 {total} 条；管理员账号不可禁用或删除；删除 MO 将强制删除其全部岗位。
        </p>
      </Card>

      {listLoading && items.length === 0 ? (
        <PageLoading />
      ) : (
        <Card className="overflow-hidden relative">
          {listLoading && items.length > 0 ? (
            <div className="absolute inset-0 z-[1] bg-white/70 dark:bg-slate-900/70 flex items-center justify-center text-sm">
              加载中…
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[800px]" aria-label="用户列表">
              <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-ink-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th scope="col" className="px-3 py-2">
                    ID
                  </th>
                  <th scope="col" className="px-3 py-2">
                    邮箱
                  </th>
                  <th scope="col" className="px-3 py-2">
                    姓名
                  </th>
                  <th scope="col" className="px-3 py-2">
                    角色
                  </th>
                  <th scope="col" className="px-3 py-2">
                    学号/工号
                  </th>
                  <th scope="col" className="px-3 py-2">
                    状态
                  </th>
                  <th scope="col" className="px-3 py-2">
                    创建时间
                  </th>
                  <th scope="col" className="px-3 py-2">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-ink-500 dark:text-slate-400">
                      暂无匹配用户
                    </td>
                  </tr>
                ) : (
                  items.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-slate-100 dark:border-slate-800 even:bg-slate-50/50 dark:even:bg-slate-900/40"
                    >
                      <td className="px-3 py-2 tabular-nums">{u.id}</td>
                      <td className="px-3 py-2">{u.email}</td>
                      <td className="px-3 py-2">{u.display_name || "—"}</td>
                      <td className="px-3 py-2 uppercase">{u.role}</td>
                      <td className="px-3 py-2">{u.student_id || "—"}</td>
                      <td className="px-3 py-2">{formatStatus(u)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatCreatedAt(u.created_at)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {u.role === "ta" || u.role === "mo" ? (
                            <Button
                              type="button"
                              variant="secondary"
                              className="text-xs py-1 px-2"
                              disabled={rowBusyId === u.id}
                              onClick={() => toggleDisabled(u)}
                            >
                              {u.disabled ? "启用" : "禁用"}
                            </Button>
                          ) : (
                            <span className="text-xs text-ink-400 dark:text-slate-500">—</span>
                          )}
                          <Button
                            type="button"
                            variant="secondary"
                            className="text-xs py-1 px-2"
                            disabled={rowBusyId === u.id}
                            onClick={() => resetPassword(u)}
                          >
                            重置密码
                          </Button>
                          {u.role === "ta" || u.role === "mo" ? (
                            <Button
                              type="button"
                              variant="secondary"
                              className="text-xs py-1 px-2 !border-rose-300 !text-rose-800 dark:!border-rose-800 dark:!text-rose-200"
                              disabled={rowBusyId === u.id}
                              onClick={() => deleteUser(u)}
                            >
                              删除
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {items.length < total ? (
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 text-center">
              <Button type="button" variant="secondary" onClick={loadMore} disabled={listLoading}>
                加载更多（{items.length}/{total}）
              </Button>
            </div>
          ) : null}
        </Card>
      )}
    </AppShell>
  );
}
