import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { useFeedback } from "../../feedback";
import { useLocale } from "../../locale";
import type { AdminUserSummary, UserRole } from "../../types";
import AppShell from "../../AppShell";
import { Button, Card, Input, PageLoading, Select } from "../../ui";

const PAGE_SIZE = 50;

function formatStatus(
  u: AdminUserSummary,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  if (u.disabled) return t("status.userDisabled");
  if (u.locked_until && new Date(u.locked_until).getTime() > Date.now()) return t("status.userLocked");
  return t("status.userActive");
}

function formatCreatedAt(iso: string, dash: string): string {
  if (!iso) return dash;
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminUsers() {
  const { toast, confirm } = useFeedback();
  const { t, te } = useLocale();
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
          toast(e instanceof Error ? te(e.message) : t("common.usersLoadFailed"), "error");
          if (opts?.reset) setItems([]);
        })
        .finally(() => setListLoading(false));
    },
    [listRole, listQ, skip, toast, t, te]
  );

  useEffect(() => {
    loadList({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅首屏
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "mo" && !staffId.trim()) {
      toast(t("admin.moStaffRequired"), "error");
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
      toast(t("admin.userCreated"), "success");
      setEmail("");
      setPassword("");
      setDisplayName("");
      setStaffId("");
      loadList({ reset: true });
    } catch (e: unknown) {
      toast(e instanceof Error ? te(e.message) : t("admin.createFailed"), "error");
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
      .catch((e: unknown) => toast(e instanceof Error ? te(e.message) : t("common.loadFailed"), "error"))
      .finally(() => setListLoading(false));
  };

  const toggleDisabled = async (u: AdminUserSummary) => {
    if (u.role === "admin") return;
    const enabling = u.disabled;
    const ok = await confirm({
      title: enabling ? t("admin.enableAccount") : t("admin.disableAccount"),
      message: enabling
        ? t("admin.enableConfirm", { email: u.email })
        : t("admin.disableConfirm", { email: u.email }),
      confirmText: enabling ? t("admin.enable") : t("admin.disable"),
      danger: !enabling,
    });
    if (!ok) return;
    setRowBusyId(u.id);
    try {
      await api.admin.patchUser(u.id, { disabled: !u.disabled });
      toast(enabling ? t("admin.enabled") : t("admin.disabled"), "success");
      loadList({ reset: true });
    } catch (e: unknown) {
      toast(e instanceof Error ? te(e.message) : t("common.opFailed"), "error");
    } finally {
      setRowBusyId(null);
    }
  };

  const resetPassword = async (u: AdminUserSummary) => {
    const pwd = window.prompt(t("common.promptNewPassword", { email: u.email }));
    if (!pwd) return;
    if (pwd.length < 8 || !/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) {
      toast(t("common.passwordRuleShort"), "error");
      return;
    }
    const ok = await confirm({
      title: t("admin.resetPwdTitle"),
      message: t("admin.resetPwdConfirm", { email: u.email }),
      confirmText: t("admin.resetPwd"),
      danger: true,
    });
    if (!ok) return;
    setRowBusyId(u.id);
    try {
      await api.admin.patchUser(u.id, { password: pwd });
      toast(t("admin.passwordReset"), "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? te(e.message) : t("admin.resetFailed"), "error");
    } finally {
      setRowBusyId(null);
    }
  };

  const deleteUser = async (u: AdminUserSummary) => {
    if (u.role === "admin") return;
    const ok = await confirm({
      title: t("admin.deleteUser"),
      message:
        u.role === "mo"
          ? t("admin.deleteMoConfirm", { email: u.email })
          : t("admin.deleteTaConfirm", { email: u.email }),
      confirmText: t("common.delete"),
      danger: true,
    });
    if (!ok) return;
    setRowBusyId(u.id);
    try {
      await api.admin.deleteUser(u.id);
      toast(t("admin.userDeleted"), "success");
      loadList({ reset: true });
    } catch (e: unknown) {
      toast(e instanceof Error ? te(e.message) : t("common.deleteFailed"), "error");
    } finally {
      setRowBusyId(null);
    }
  };

  return (
    <AppShell title={t("shell.titleAdminUsers")} role="admin">
      <div className="mb-4">
        <Link to="/admin" className="text-sm text-accent hover:underline">
          ← {t("common.backToAdminHome")}
        </Link>
      </div>

      <Card className="p-6 max-w-lg mb-8">
        <h2 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">{t("admin.createUser")}</h2>
        <p className="text-sm text-ink-600 dark:text-slate-300 mb-4">
          {t("admin.createUserHint")}
          {role === "mo" ? t("admin.createUserMoHint") : null}
        </p>
        <form onSubmit={submit} className="space-y-3">
          <Select value={role} onChange={(e) => setRole(e.target.value as "mo" | "admin")} aria-label={t("common.role")}>
            <option value="mo">{t("roles.mo")}</option>
            <option value="admin">{t("roles.admin")}</option>
          </Select>
          {role === "mo" ? (
            <>
              <Input placeholder={t("common.name")} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              <Input
                placeholder={t("common.staffId")}
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                required
              />
              <Input
                placeholder={t("common.email")}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder={t("common.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </>
          ) : (
            <>
              <Input placeholder={t("common.name")} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              <Input
                placeholder={t("common.email")}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder={t("common.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? t("admin.creating") : t("admin.createUser")}
          </Button>
        </form>
      </Card>

      <Card className="p-4 mb-4">
        <h2 className="text-lg font-semibold text-ink-900 dark:text-white mb-3">{t("admin.userList")}</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label htmlFor="filter-role" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block">
              {t("common.role")}
            </label>
            <Select
              id="filter-role"
              className="mt-1 w-36"
              value={listRole}
              onChange={(e) => setListRole(e.target.value)}
              aria-label={t("admin.filterRole")}
            >
              <option value="">{t("roles.all")}</option>
              <option value="ta">{t("roles.ta")}</option>
              <option value="mo">{t("roles.mo")}</option>
              <option value="admin">{t("admin.statAdminOnly")}</option>
            </Select>
          </div>
          <div className="flex-1 min-w-[12rem]">
            <label htmlFor="filter-q" className="text-xs font-semibold text-ink-700 dark:text-slate-300 block">
              {t("admin.searchPlaceholder")}
            </label>
            <Input
              id="filter-q"
              className="mt-1"
              value={listQ}
              onChange={(e) => setListQ(e.target.value)}
              placeholder={t("admin.searchKeyword")}
            />
          </div>
          <Button type="button" onClick={searchUsers} disabled={listLoading}>
            {t("common.query")}
          </Button>
        </div>
        <p className="text-xs text-ink-500 dark:text-slate-400 mt-2">
          {t("admin.userListSummary", { total })}
        </p>
      </Card>

      {listLoading && items.length === 0 ? (
        <PageLoading />
      ) : (
        <Card className="overflow-hidden relative">
          {listLoading && items.length > 0 ? (
            <div className="absolute inset-0 z-[1] bg-white/70 dark:bg-slate-900/70 flex items-center justify-center text-sm">
              {t("common.loading")}
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[800px]" aria-label={t("admin.userList")}>
              <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-ink-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th scope="col" className="px-3 py-2">
                    {t("common.id")}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    {t("common.email")}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    {t("common.name")}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    {t("common.role")}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    {t("common.studentOrStaffId")}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    {t("common.status")}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    {t("common.createdAt")}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-ink-500 dark:text-slate-400">
                      {t("admin.noUsers")}
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
                      <td className="px-3 py-2">{u.display_name || t("common.dash")}</td>
                      <td className="px-3 py-2 uppercase">{u.role}</td>
                      <td className="px-3 py-2">{u.student_id || t("common.dash")}</td>
                      <td className="px-3 py-2">{formatStatus(u, t)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatCreatedAt(u.created_at, t("common.dash"))}</td>
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
                              {u.disabled ? t("admin.enable") : t("admin.disable")}
                            </Button>
                          ) : (
                            <span className="text-xs text-ink-400 dark:text-slate-500">{t("common.dash")}</span>
                          )}
                          <Button
                            type="button"
                            variant="secondary"
                            className="text-xs py-1 px-2"
                            disabled={rowBusyId === u.id}
                            onClick={() => resetPassword(u)}
                          >
                            {t("admin.resetPassword")}
                          </Button>
                          {u.role === "ta" || u.role === "mo" ? (
                            <Button
                              type="button"
                              variant="secondary"
                              className="text-xs py-1 px-2 !border-rose-300 !text-rose-800 dark:!border-rose-800 dark:!text-rose-200"
                              disabled={rowBusyId === u.id}
                              onClick={() => deleteUser(u)}
                            >
                              {t("common.delete")}
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
                {t("common.loadMore", { loaded: items.length, total })}
              </Button>
            </div>
          ) : null}
        </Card>
      )}
    </AppShell>
  );
}
