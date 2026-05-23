package com.ebu6304.tarecruit.api;

/**
 * 业务层可预期的 HTTP 错误：携带状态码与 {@code detail} 文案，由 Servlet 统一转为 JSON 响应。
 */
public final class ApiException extends RuntimeException {
  public final int status;

  public ApiException(int status, String detail) {
    super(detail);
    this.status = status;
  }
}
