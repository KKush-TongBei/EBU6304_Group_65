import type { Locale } from "./locales";
import { translate } from "./locales";

/** Map common backend Chinese API `detail` strings to English when locale is en. */
const ZH_TO_EN: Record<string, string> = {
  "Invalid email or password": "Invalid email or password",
  "账号已禁用": "Account is disabled",
  "Not authenticated": "Not authenticated",
  "Forbidden": "Forbidden",
  "User not found": "User not found",
  "Internal server error": "Internal server error",
  "Service unavailable": "Service unavailable",
  "Data store temporarily unavailable. Please retry later.":
    "Data store temporarily unavailable. Please retry later.",
  "email required": "Email is required",
  "email: invalid format": "Invalid email format",
  "email: too long": "Email is too long",
  "password: at least 8 characters": "Password must be at least 8 characters",
  "password: must contain both letters and digits":
    "Password must contain both letters and digits",
  "password must be at least 8 chars": "Password must be at least 8 characters",
  "password must contain letters and digits":
    "Password must contain both letters and digits",
  "Email already registered": "Email already registered",
  "email already exists": "Email already exists",
  "student_id is required for TA": "Student ID is required for TA",
  "MO accounts require staff_id": "Staff ID is required for MO",
  "role must be mo or admin": "Role must be MO or Admin",
  "不能禁用管理员账号": "Administrator accounts cannot be disabled",
  "管理员账号不可自行注销": "Admin accounts cannot be self-deleted",
  "密码错误": "Incorrect password",
  "No supported fields to update": "No supported fields to update",
  "下载失败": "Download failed",
};

const LOCKOUT_RE =
  /^账号已暂时锁定，约 (\d+) 分钟后可重试$/;

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
  if (locale !== "en" || !message) return message;
  const exact = ZH_TO_EN[message];
  if (exact) return exact;
  const lock = message.match(LOCKOUT_RE);
  if (lock) {
    return `Account temporarily locked. Try again in about ${lock[1]} minute(s).`;
  }
  if (message.startsWith("email:")) return message.replace(/^email:/, "Email:");
  if (message.startsWith("password:")) return message.replace(/^password:/, "Password:");
  if (message.includes("max ") && message.includes("characters")) return message;
  return message;
}
