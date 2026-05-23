package com.ebu6304.tarecruit.servlet;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

/** 健康检查：供部署与监控确认服务存活。 */
@WebServlet("/api/health")
public final class HealthServlet extends JsonServlet {
  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    try {
      writeJson(resp, 200, svc(req).health());
    } catch (Exception e) {
      handleError(resp, e);
    }
  }
}
