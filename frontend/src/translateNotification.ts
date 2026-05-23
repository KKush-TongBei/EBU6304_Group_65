/** 将后端通知的固定中文 title/body 模板在英文模式下映射为 locales 中的键文案。 */
import type { Locale } from "./locales";
import { translate } from "./locales";

const TITLE_KEY: Record<string, string> = {
  新用户注册: "notifications.titleNewUserReg",
  用户已注销账号: "notifications.titleAccountSelfDeleted",
  管理员已删除用户: "notifications.titleAdminDeletedUser",
  新申请: "notifications.titleNewApplication",
  新岗位开放申请: "notifications.titleNewJobOpen",
};

/** 助教 / 课程负责人 */
const REG_NEW_USER =
  /^(助教|课程负责人)「([^」]+)」已通过公开注册加入系统（学号\/工号：([^，]+)，邮箱：([^）]+)）。$/;

const REG_SELF_DELETED =
  /^(助教|课程负责人)「([^」]+)」已自行注销（([^，]+)，([^）]+)）。$/;

const REG_ADMIN_DELETED =
  /^(助教|课程负责人)「([^」]+)」已被管理员删除（([^，]+)，([^）]+)）。$/;

const REG_NEW_APPLICATION = /^(.+) 申请了岗位「([^」]+)」，可前往该岗位处理。$/;

const REG_NEW_JOB =
  /^模块「([^」]+)」已发布，可前往浏览岗位并申请。(?: 截止日期：([^。]+)。)?$/;

function roleKey(zh: string): string {
  if (zh === "助教") return "roles.taShort";
  if (zh === "课程负责人") return "roles.moShort";
  return zh;
}

function formatIdHint(idHint: string, locale: Locale): string {
  const m = idHint.match(/^用户 ID (\d+)$/);
  if (m && locale === "en") {
    return `User ID ${m[1]}`;
  }
  return idHint;
}

export function translateNotificationTitle(title: string, locale: Locale): string {
  if (locale === "zh" || !title) return title;
  const key = TITLE_KEY[title.trim()];
  return key ? translate(locale, key) : title;
}

export function translateNotificationBody(body: string, locale: Locale): string {
  if (locale === "zh" || !body) return body;
  const s = body.trim();

  let m = s.match(REG_NEW_USER);
  if (m) {
    return translate(locale, "notifications.bodyNewUserReg", {
      role: translate(locale, roleKey(m[1])),
      name: m[2],
      sid: m[3],
      email: m[4],
    });
  }

  m = s.match(REG_SELF_DELETED);
  if (m) {
    return translate(locale, "notifications.bodyAccountSelfDeleted", {
      role: translate(locale, roleKey(m[1])),
      name: m[2],
      idHint: formatIdHint(m[3], locale),
      email: m[4],
    });
  }

  m = s.match(REG_ADMIN_DELETED);
  if (m) {
    return translate(locale, "notifications.bodyAdminDeletedUser", {
      role: translate(locale, roleKey(m[1])),
      name: m[2],
      idHint: formatIdHint(m[3], locale),
      email: m[4],
    });
  }

  m = s.match(REG_NEW_APPLICATION);
  if (m) {
    return translate(locale, "notifications.bodyNewApplication", {
      applicant: m[1],
      module: m[2],
    });
  }

  m = s.match(REG_NEW_JOB);
  if (m) {
    return translate(locale, "notifications.bodyNewJobOpen", {
      module: m[1],
      deadline: m[2]
        ? translate(locale, "notifications.deadlineSuffix", { date: m[2] })
        : "",
    });
  }

  return body;
}

export function localizeNotification(
  n: { title: string; body: string },
  locale: Locale
): { title: string; body: string } {
  return {
    title: translateNotificationTitle(n.title, locale),
    body: translateNotificationBody(n.body, locale),
  };
}
