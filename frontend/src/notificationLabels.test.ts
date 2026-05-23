import { describe, expect, it } from "vitest";
import { notificationCategoryLabel, notificationRiskStyle } from "./notificationLabels";

describe("notificationCategoryLabel", () => {
  it("returns system label when category is missing", () => {
    expect(notificationCategoryLabel(undefined, "zh")).toBe("系统");
    expect(notificationCategoryLabel(undefined, "en")).toBe("System");
  });

  it("maps known categories", () => {
    expect(notificationCategoryLabel("application", "en")).toBe("Application");
    expect(notificationCategoryLabel("workload_alert", "zh")).toBe("工时提醒");
  });

  it("returns raw category for unknown values", () => {
    expect(notificationCategoryLabel("custom_category", "en")).toBe("custom_category");
  });
});

describe("notificationRiskStyle", () => {
  it("highlights decision and workload alerts", () => {
    expect(notificationRiskStyle("decision")).toBe(true);
    expect(notificationRiskStyle("workload_alert")).toBe(true);
  });

  it("does not highlight other categories", () => {
    expect(notificationRiskStyle("application")).toBe(false);
    expect(notificationRiskStyle(undefined)).toBe(false);
  });
});
