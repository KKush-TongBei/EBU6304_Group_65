import type { Locale } from "./locales";
import { translate } from "./locales";

/** 后端 {@code detail} 固定文案 → locales 中的 {@code apiErrors.*} 键。 */
const MESSAGE_TO_I18N_KEY: Record<string, string> = {
  "Data store temporarily unavailable. Please retry later.": "apiErrors.dataStoreUnavailable",
  "Internal server error": "apiErrors.internalServerError",
  "Service unavailable": "apiErrors.serviceUnavailable",
  "Not authenticated": "apiErrors.notAuthenticated",
  "Forbidden": "apiErrors.forbidden",
  "User not found": "apiErrors.userNotFound",
  "Invalid email or password": "apiErrors.invalidCredentials",
  "账号已禁用": "apiErrors.accountDisabled",
  "密码错误": "apiErrors.incorrectPassword",
  "email required": "apiErrors.emailRequired",
  "email: invalid format": "apiErrors.invalidEmailFormat",
  "email: too long": "apiErrors.emailTooLong",
  "password: at least 8 characters": "apiErrors.passwordTooShort",
  "password: must contain both letters and digits": "apiErrors.passwordNeedsLettersDigits",
  "password must be at least 8 chars": "apiErrors.passwordTooShort",
  "password must contain letters and digits": "apiErrors.passwordNeedsLettersDigits",
  "Email already registered": "apiErrors.emailAlreadyRegistered",
  "email already exists": "apiErrors.emailAlreadyExists",
  "student_id is required for TA": "apiErrors.studentIdRequiredTa",
  "MO accounts require staff_id": "apiErrors.staffIdRequiredMo",
  "role must be mo or admin": "apiErrors.roleMustBeMoOrAdmin",
  "不能禁用管理员账号": "apiErrors.cannotDisableAdmin",
  "管理员账号不可自行注销": "apiErrors.adminCannotSelfDelete",
  "No supported fields to update": "apiErrors.noSupportedFields",
  "下载失败": "apiErrors.downloadFailed",
};

const LOCKOUT_ZH_RE = /^账号已暂时锁定，约 (\d+) 分钟后可重试$/;

/** Backend dashboard `risk_alerts` strings (Chinese) → localized copy. */
const RISK_OVERLOAD_ZH =
  /^部分助教每周已分配工时累计超过超负荷阈值[（(]([\d.]+)\s*工时\/周[）)]$/;

export function translateDashboardRiskAlert(message: string, locale: Locale): string {
  if (locale === "zh" || !message) return message;
  const m = message.match(RISK_OVERLOAD_ZH);
  if (m) {
    return translate(locale, "admin.riskOverloadAlert", { threshold: m[1] });
  }
  return message;
}

export function translateApiMessage(message: string, locale: Locale): string {
  if (!message) return message;

  const key = MESSAGE_TO_I18N_KEY[message];
  if (key) return translate(locale, key);

  const lockZh = message.match(LOCKOUT_ZH_RE);
  if (lockZh) {
    return translate(locale, "apiErrors.accountLocked", { minutes: lockZh[1] });
  }

  if (locale === "en") {
    if (message.startsWith("email:")) return message.replace(/^email:/, "Email:");
    if (message.startsWith("password:")) return message.replace(/^password:/, "Password:");
  }

  return message;
}
