package com.ebu6304.tarecruit.servlet;

import com.ebu6304.tarecruit.TaRecruitService;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Map;

@WebServlet(urlPatterns = {
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/logout",
    "/api/auth/me",
    "/api/auth/delete-account"})
/** 认证相关 API：注册、登录、当前用户、改密、注销账号等。 */
public final class AuthServlet extends JsonServlet {
  @Override
  protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    try {
      TaRecruitService s = svc(req);
      String path = req.getServletPath();
      if (path.endsWith("/logout")) {
        writeJson(resp, 200, Map.of("ok", true));
        return;
      }
      Map<String, Object> body = readMap(req);
      if (path.endsWith("/delete-account")) {
        writeJson(resp, 200, s.deleteOwnAccount(userId(req), body));
        return;
      }
      if (path.endsWith("/login")) {
        Map<String, Object> partial = s.login(body);
        int uid = ((Number) partial.get("_uid")).intValue();
        writeJson(resp, 200, s.fillToken(partial, uid));
        return;
      }
      if (path.endsWith("/register")) {
        Map<String, Object> partial = s.register(body);
        int uid = ((Number) partial.get("_uid")).intValue();
        writeJson(resp, 200, s.fillToken(partial, uid));
        return;
      }
      resp.sendError(HttpServletResponse.SC_NOT_FOUND);
    } catch (Exception e) {
      handleError(resp, e);
    }
  }

  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    try {
      if (req.getServletPath().endsWith("/me")) {
        writeJson(resp, 200, svc(req).me(userId(req)));
        return;
      }
      resp.sendError(HttpServletResponse.SC_NOT_FOUND);
    } catch (Exception e) {
      handleError(resp, e);
    }
  }
}
