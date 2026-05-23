package com.ebu6304.tarecruit.servlet;

import com.ebu6304.tarecruit.AppJson;
import com.ebu6304.tarecruit.TaRecruitService;
import com.ebu6304.tarecruit.api.ApiException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * JSON API Servlet 基类：统一序列化响应、将 {@link com.ebu6304.tarecruit.api.ApiException} 映射为 HTTP 状态与 JSON body。
 */
public abstract class JsonServlet extends HttpServlet {
  protected static final ObjectMapper M = AppJson.mapper();
  public static final String ATTR_USER_ID = "taUserId";

  protected TaRecruitService svc(HttpServletRequest req) {
    return (TaRecruitService) req.getServletContext().getAttribute(TaRecruitService.CTX_ATTR);
  }

  protected int userId(HttpServletRequest req) {
    Object v = req.getAttribute(ATTR_USER_ID);
    if (v instanceof Integer i) {
      return i;
    }
    throw new ApiException(401, "Not authenticated");
  }

  protected void writeJson(HttpServletResponse resp, int status, Object body) throws IOException {
    resp.setStatus(status);
    resp.setCharacterEncoding("UTF-8");
    resp.setContentType("application/json");
    M.writeValue(resp.getOutputStream(), body);
  }

  protected void handleError(HttpServletResponse resp, Throwable t) throws IOException {
    if (t instanceof ApiException ax) {
      writeJson(resp, ax.status, Map.of("detail", ax.getMessage()));
      return;
    }
    for (Throwable c = t; c != null; c = c.getCause()) {
      if (c instanceof IOException io) {
        getServletContext().log("Data store IO failure: " + io.getMessage(), io);
        writeJson(resp, 503, Map.of("detail", "Data store temporarily unavailable. Please retry later."));
        return;
      }
    }
    getServletContext().log("Unhandled API error", t);
    writeJson(resp, 500, Map.of("detail", "Internal server error"));
  }

  @SuppressWarnings("unchecked")
  protected Map<String, Object> readMap(HttpServletRequest req) throws IOException {
    byte[] b = req.getInputStream().readAllBytes();
    if (b.length == 0) {
      return new LinkedHashMap<>();
    }
    return M.readValue(b, LinkedHashMap.class);
  }
}
