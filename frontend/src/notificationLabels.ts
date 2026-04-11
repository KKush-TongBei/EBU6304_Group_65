/** Human-readable labels for in-app notification categories (API stores English slugs). */
export function notificationCategoryLabel(category?: string): string {
  if (!category) {
    return "系统";
  }
  switch (category) {
    case "workload_alert":
      return "工时提醒";
    case "decision":
      return "申请结果";
    case "application":
      return "申请动态";
    case "job":
      return "岗位";
    case "job_closed":
      return "岗位关闭";
    case "deadline":
      return "截止提醒";
    case "profile":
      return "资料";
    case "system":
      return "系统";
    default:
      return category;
  }
}

/** Highlight row (amber) for decisions and workload warnings. */
export function notificationRiskStyle(category?: string): boolean {
  return category === "decision" || category === "workload_alert";
}
