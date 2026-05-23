import { describe, expect, it } from "vitest";
import { routerBasename, withAppBase } from "./appBase";

describe("withAppBase", () => {
  it("prefixes absolute paths with the vite base", () => {
    expect(withAppBase("/login")).toBe("/ta-recruit/login");
  });

  it("normalizes relative paths", () => {
    expect(withAppBase("notifications")).toBe("/ta-recruit/notifications");
  });
});

describe("routerBasename", () => {
  it("returns basename without trailing slash", () => {
    expect(routerBasename()).toBe("/ta-recruit");
  });
});
