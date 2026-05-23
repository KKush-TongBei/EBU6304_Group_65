import { describe, expect, it } from "vitest";
import {
  localizeNotification,
  translateNotificationBody,
  translateNotificationTitle,
} from "./translateNotification";

describe("translateNotificationTitle", () => {
  it("returns Chinese titles unchanged in zh mode", () => {
    expect(translateNotificationTitle("新用户注册", "zh")).toBe("新用户注册");
  });

  it("maps known titles to English", () => {
    expect(translateNotificationTitle("新用户注册", "en")).toBe("New user registration");
    expect(translateNotificationTitle("新岗位开放申请", "en")).toBe("New job posted");
  });
});

describe("translateNotificationBody", () => {
  it("translates new user registration body", () => {
    const body =
      "助教「Alice Zhang」已通过公开注册加入系统（学号/工号：S12345，邮箱：a@example.com）。";
    const en = translateNotificationBody(body, "en");
    expect(en).toContain("Alice Zhang");
    expect(en).toContain("S12345");
    expect(en).toContain("a@example.com");
  });

  it("translates new application body", () => {
    const body = "Bob Lee 申请了岗位「CS101 Lab TA」，可前往该岗位处理。";
    const en = translateNotificationBody(body, "en");
    expect(en).toContain("Bob Lee");
    expect(en).toContain("CS101 Lab TA");
  });

  it("returns unknown body unchanged in en mode", () => {
    expect(translateNotificationBody("自定义通知正文", "en")).toBe("自定义通知正文");
  });
});

describe("localizeNotification", () => {
  it("localizes both title and body", () => {
    const result = localizeNotification(
      {
        title: "新申请",
        body: "Bob Lee 申请了岗位「CS101 Lab TA」，可前往该岗位处理。",
      },
      "en"
    );
    expect(result.title).toBe("New application");
    expect(result.body).toContain("Bob Lee");
  });
});
