/** MO 账号设置：改密与注销。 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../../api";
import { useFeedback } from "../../feedback";
import { useLocale } from "../../locale";
import AppShell from "../../AppShell";
import { Button, Card, Input } from "../../ui";

export default function MOAccount() {
  const { toast } = useFeedback();
  const { t, te } = useLocale();
  const nav = useNavigate();
  const [deletePwd, setDeletePwd] = useState("");
  const [deleting, setDeleting] = useState(false);

  const deleteAccount = async () => {
    if (!deletePwd.trim()) {
      toast(t("ta.confirmPasswordDelete"), "error");
      return;
    }
    if (!window.confirm(t("mo.deleteConfirmMo"))) return;
    setDeleting(true);
    try {
      await api.auth.deleteAccount(deletePwd);
      setToken(null);
      toast(t("ta.accountDeleted"), "success");
      nav("/login?reason=account_deleted", { replace: true });
    } catch (e: unknown) {
      toast(e instanceof Error ? te(e.message) : t("ta.deleteFailed"), "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell title={t("shell.titleMo")} subtitle={t("shell.subtitleAccountSecurity")} role="mo">
      <Card className="p-6 max-w-2xl border-rose-200 dark:border-rose-900/50">
        <h1 className="font-display text-xl font-bold text-rose-800 dark:text-rose-300">{t("mo.deleteAccountTitle")}</h1>
        <p className="mt-2 text-sm text-ink-600 dark:text-slate-400">{t("mo.deleteAccountMoHint")}</p>
        <div className="mt-4 space-y-2 max-w-md">
          <label htmlFor="mo-del-pwd" className="text-xs font-semibold text-ink-700 dark:text-slate-300">
            {t("ta.confirmPasswordDelete")}
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
            {deleting ? t("common.processing") : t("ta.deleteAccount")}
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}
