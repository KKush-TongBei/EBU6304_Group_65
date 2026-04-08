package com.ebu6304.tarecruit.servlet;

import com.ebu6304.tarecruit.TaRecruitService;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

@WebServlet(urlPatterns = {"/api/notifications", "/api/notifications/*"})
public final class NotificationsServlet extends JsonServlet {
  private static Integer parseSinceDays(String p) {
    if (p == null || p.isBlank()) {
      return null;
    }
    try {
      int n = Integer.parseInt(p.trim());
      return n > 0 ? n : null;
    } catch (NumberFormatException e) {
      return null;
    }
  }
  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    try {
      TaRecruitService s = svc(req);
      String pi = req.getPathInfo();
      if ("/summary".equals(pi)) {
        writeJson(resp, 200, s.notificationsSummary(userId(req)));
        return;
      }
      if (pi == null || pi.isEmpty() || "/".equals(pi)) {
        boolean unreadOnly = Boolean.parseBoolean(req.getParameter("unread_only"));
        Integer sinceDays = parseSinceDays(req.getParameter("since_days"));
        writeJson(resp, 200, s.notificationsList(userId(req), unreadOnly, sinceDays));
        return;
      }
      resp.sendError(HttpServletResponse.SC_NOT_FOUND);
    } catch (Exception e) {
      handleError(resp, e);
    }
  }

  @Override
  protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    try {
      TaRecruitService s = svc(req);
      String pi = req.getPathInfo();
      if ("/mark-read".equals(pi)) {
        writeJson(resp, 200, s.notificationsMarkRead(userId(req), readMap(req)));
        return;
      }
      resp.sendError(HttpServletResponse.SC_NOT_FOUND);
    } catch (Exception e) {
      handleError(resp, e);
    }
  }
}
