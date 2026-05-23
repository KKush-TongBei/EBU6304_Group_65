import { describe, expect, it } from "vitest";
import { translateApiMessage, translateDashboardRiskAlert } from "./translateApiMessage";

describe("translateApiMessage", () => {
  it("returns Chinese messages unchanged in zh mode when already localized", () => {
    expect(translateApiMessage("账号已禁用", "zh")).toBe("账号已禁用");
  });

  it("maps English backend errors to Chinese in zh mode", () => {
    expect(translateApiMessage("Data store temporarily unavailable. Please retry later.", "zh")).toBe(
      "数据存储暂时不可用，请稍后重试。"
    );
    expect(translateApiMessage("Not authenticated", "zh")).toBe("未登录");
    expect(translateApiMessage("User not found", "zh")).toBe("用户不存在");
  });

  it("maps known Chinese errors to English", () => {
    expect(translateApiMessage("账号已禁用", "en")).toBe("Account is disabled");
    expect(translateApiMessage("密码错误", "en")).toBe("Incorrect password");
  });

  it("translates account lockout messages", () => {
    expect(translateApiMessage("账号已暂时锁定，约 15 分钟后可重试", "en")).toBe(
      "Account temporarily locked. Try again in about 15 minute(s)."
    );
    expect(translateApiMessage("账号已暂时锁定，约 15 分钟后可重试", "zh")).toBe(
      "账号已暂时锁定，约 15 分钟后可重试"
    );
  });

  it("maps validation hints from the lookup table", () => {
    expect(translateApiMessage("email: invalid format", "en")).toBe("Invalid email format");
    expect(translateApiMessage("password: at least 8 characters", "en")).toBe(
      "Password must be at least 8 characters"
    );
  });

  it("prefixes unknown email and password hints in en mode", () => {
    expect(translateApiMessage("email: custom rule", "en")).toBe("Email: custom rule");
    expect(translateApiMessage("password: custom rule", "en")).toBe("Password: custom rule");
  });

  it("passes through unknown messages", () => {
    expect(translateApiMessage("custom backend detail", "en")).toBe("custom backend detail");
    expect(translateApiMessage("custom backend detail", "zh")).toBe("custom backend detail");
  });
});

describe("translateDashboardRiskAlert", () => {
  it("returns Chinese alerts unchanged in zh mode", () => {
    const msg = "部分助教每周已分配工时累计超过超负荷阈值（20 工时/周）";
    expect(translateDashboardRiskAlert(msg, "zh")).toBe(msg);
  });

  it("localizes overload risk alerts in en mode", () => {
    const msg = "部分助教每周已分配工时累计超过超负荷阈值（20 工时/周）";
    expect(translateDashboardRiskAlert(msg, "en")).toContain("20");
    expect(translateDashboardRiskAlert(msg, "en")).not.toBe(msg);
  });
});
