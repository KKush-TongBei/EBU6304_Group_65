import { describe, expect, it } from "vitest";
import { getStoredLocale, LOCALE_STORAGE_KEY, translate } from "./index";

describe("getStoredLocale", () => {
  it("defaults to zh when storage is empty", () => {
    expect(getStoredLocale()).toBe("zh");
  });

  it("reads en from localStorage", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "en");
    expect(getStoredLocale()).toBe("en");
  });

  it("falls back to zh for invalid values", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "fr");
    expect(getStoredLocale()).toBe("zh");
  });
});

describe("translate", () => {
  it("returns Chinese strings", () => {
    expect(translate("zh", "common.backHome")).toBe("返回首页");
  });

  it("returns English strings", () => {
    expect(translate("en", "common.backHome")).toBe("Back to home");
  });

  it("interpolates template params", () => {
    expect(translate("en", "common.fileTooBig", { max: 5, current: "6.00" })).toContain("5");
    expect(translate("en", "common.fileTooBig", { max: 5, current: "6.00" })).toContain("6.00");
  });
});
