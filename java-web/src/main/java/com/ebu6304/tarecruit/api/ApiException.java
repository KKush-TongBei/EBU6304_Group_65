package com.ebu6304.tarecruit.api;

public final class ApiException extends RuntimeException {
  public final int status;

  public ApiException(int status, String detail) {
    super(detail);
    this.status = status;
  }
}
