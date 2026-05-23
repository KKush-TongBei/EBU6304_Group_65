package com.ebu6304.tarecruit.user;

import java.util.Locale;

/** 系统角色：助教（TA）、课程负责人（MO）、管理员（admin）。 */
public enum UserRole {
  TA("ta"),
  MO("mo"),
  ADMIN("admin");

  private final String value;

  UserRole(String value) {
    this.value = value;
  }

  public String value() {
    return value;
  }

  public static UserRole fromString(String raw) {
    if (raw == null || raw.isBlank()) {
      throw new IllegalArgumentException("role is required");
    }
    String normalized = raw.trim().toLowerCase(Locale.ROOT);
    for (UserRole r : values()) {
      if (r.value.equals(normalized)) {
        return r;
      }
    }
    throw new IllegalArgumentException("unsupported role: " + raw);
  }
}
