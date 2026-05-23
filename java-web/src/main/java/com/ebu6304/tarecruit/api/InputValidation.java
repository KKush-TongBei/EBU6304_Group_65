package com.ebu6304.tarecruit.api;

import java.util.regex.Pattern;

/**
 * 写入接口的集中输入校验：邮箱格式与长度、各文本字段上限、非负数值等。
 * 校验失败抛出 {@link ApiException}（HTTP 422）。密码强度由 {@link com.ebu6304.tarecruit.TaRecruitService} 与
 * {@link com.ebu6304.tarecruit.user.UserService} 另行处理。
 */
public final class InputValidation {

  /** Local + @ + domain overall length cap (characters), for UX-friendly validation errors. */
  public static final int MAX_EMAIL_LEN = 50;
  public static final int MAX_DISPLAY_NAME = 50;
  public static final int MAX_STUDENT_OR_STAFF_ID = 25;
  public static final int MAX_MODULE_NAME = 200;
  public static final int MAX_REQUIREMENTS = 20_000;
  public static final int MAX_SCHEDULE_TEXT = 5_000;
  public static final int MAX_SKILL_TAGS = 2_000;
  public static final int MAX_DEADLINE_STR = 200;
  public static final int MAX_JOB_TYPE = 128;
  public static final int MAX_TERM = 128;
  public static final int MAX_SKILLS = 5_000;
  public static final int MAX_CV_PATH = 512;
  public static final int MAX_TEMPLATE_NAME = 200;
  public static final int MAX_FREE_TEXT = 10_000;
  public static final int MAX_PROFILE_SKILL_ITEM = 200;
  public static final int MAX_GPA_STR = 32;

  private static final Pattern EMAIL_PATTERN = Pattern.compile(
      "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

  private InputValidation() {}

  /** Trimmed, non-blank email that matches a simple RFC-like subset. */
  public static String validateEmail(String email) {
    if (email == null) {
      throw new ApiException(422, "email required");
    }
    String s = email.trim();
    if (s.isEmpty()) {
      throw new ApiException(422, "email required");
    }
    if (s.length() > MAX_EMAIL_LEN) {
      throw new ApiException(422, "email: too long");
    }
    if (!EMAIL_PATTERN.matcher(s).matches()) {
      throw new ApiException(422, "email: invalid format");
    }
    return s;
  }

  public static void maxLength(String s, int max, String fieldName) {
    if (s != null && s.length() > max) {
      throw new ApiException(422, fieldName + ": max " + max + " characters");
    }
  }

  public static void nonNegativeInt(int v, String fieldName) {
    if (v < 0) {
      throw new ApiException(422, fieldName + " must be >= 0");
    }
  }

  public static double nonNegativeDouble(double v, String fieldName) {
    if (v < 0) {
      throw new ApiException(422, fieldName + " must be >= 0");
    }
    return v;
  }
}
