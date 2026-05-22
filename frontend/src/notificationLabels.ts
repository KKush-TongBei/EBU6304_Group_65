import type { Locale } from "./locales";
import { translate } from "./locales";

/** Human-readable labels for in-app notification categories (API stores English slugs). */
export function notificationCategoryLabel(category: string | undefined, locale: Locale): string {
  if (!category) {
    return translate(locale, "notifications.categorySystem");
  }
  switch (category) {
    case "workload_alert":
      return translate(locale, "notifications.categoryWorkload");
    case "decision":
      return translate(locale, "notifications.categoryDecision");
    case "application":
      return translate(locale, "notifications.categoryApplication");
    case "job":
      return translate(locale, "notifications.categoryJob");
    case "job_closed":
      return translate(locale, "notifications.categoryJobClosed");
    case "deadline":
      return translate(locale, "notifications.categoryDeadline");
    case "profile":
      return translate(locale, "notifications.categoryProfile");
    case "system":
      return translate(locale, "notifications.categorySystem");
    default:
      return category;
  }
}

/** Highlight row (amber) for decisions and workload warnings. */
export function notificationRiskStyle(category?: string): boolean {
  return category === "decision" || category === "workload_alert";
}
