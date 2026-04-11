import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../../api";
import { useFeedback } from "../../feedback";
import AppShell from "../../AppShell";
import { Button, Card, Input } from "../../ui";

export default function MOAccount() {
  const { toast } = useFeedback();
  const nav = useNavigate();
  const [deletePwd, setDeletePwd] = useState("");
  const [deleting, setDeleting] = useState(false);

  const deleteAccount = async () => {
    if (!deletePwd.trim()) {
      toast("请输入当前密码以确认注销", "error");
      return;
    }
    if (!window.confirm("确定要永久注销账号吗？若您仍拥有已创建的岗位，需先删除岗位。此操作不可恢复。")) return;
    setDeleting(true);
    try {
      await api.auth.deleteAccount(deletePwd);
      setToken(null);
      toast("账号已注销", "success");
      nav("/login?reason=account_deleted", { replace: true });
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "注销失败", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell title="课程负责人工作台" subtitle="账号与安全" role="mo">
      <Card className="p-6 max-w-2xl border-rose-200 dark:border-rose-900/50">
        <h1 className="font-display text-xl font-bold text-rose-800 dark:text-rose-300">注销账号</h1>
        <p className="mt-2 text-sm text-ink-600 dark:text-slate-400">
          注销前请确保您名下已无任何岗位（含已关闭岗位需先删除）。成功后管理员会收到系统通知。
        </p>
        <div className="mt-4 space-y-2 max-w-md">
          <label htmlFor="mo-del-pwd" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
            输入当前密码确认
          </label>
          <Input
            id="mo-del-pwd"
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
            {deleting ? "处理中…" : "注销账号"}
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}
