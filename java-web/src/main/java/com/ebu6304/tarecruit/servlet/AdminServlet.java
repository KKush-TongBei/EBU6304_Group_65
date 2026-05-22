package com.ebu6304.tarecruit.servlet;

import com.ebu6304.tarecruit.TaRecruitService;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@WebServlet("/api/admin/*")
public final class AdminServlet extends JsonServlet {
  private static final Pattern USER_ID = Pattern.compile("^/users/(\\d+)$");

  @Override
  protected void service(HttpServletRequest req, HttpServletResponse resp)
      throws jakarta.servlet.ServletException, IOException {
    String method = req.getMethod();
    if ("PATCH".equals(method)) {
      doPatch(req, resp);
      return;
    }
    if ("DELETE".equals(method)) {
      doDelete(req, resp);
      return;
    }
    super.service(req, resp);
  }

  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    try {
      TaRecruitService s = svc(req);
      int uid = userId(req);
      String pi = req.getPathInfo();
      if (pi == null) {
        resp.sendError(HttpServletResponse.SC_NOT_FOUND);
        return;
      }
      if ("/dashboard".equals(pi)) {
        writeJson(resp, 200, s.adminDashboard(uid));
        return;
      }
      if ("/settings".equals(pi)) {
        writeJson(resp, 200, s.adminGetSettings(uid));
        return;
      }
      if ("/workload".equals(pi)) {
        String mh = req.getParameter("max_hours");
        Double cap = null;
        if (mh != null && !mh.isBlank()) {
          cap = Double.parseDouble(mh.trim());
        }
        writeJson(resp, 200, s.adminWorkload(uid, cap));
        return;
      }
      if ("/workload/export.csv".equals(pi)) {
        String csv = s.adminWorkloadExportCsv(uid);
        resp.setStatus(200);
        resp.setCharacterEncoding(StandardCharsets.UTF_8.name());
        resp.setContentType("text/csv; charset=UTF-8");
        resp.setHeader("Content-Disposition", "attachment; filename=\"ta_workload.csv\"");
        resp.getOutputStream().write(csv.getBytes(StandardCharsets.UTF_8));
        return;
      }
      if ("/activity-logs".equals(pi)) {
        int skip = parseInt(req.getParameter("skip"), 0);
        int limit = parseInt(req.getParameter("limit"), 100);
        limit = Math.min(Math.max(limit, 1), 500);
        skip = Math.max(skip, 0);
        Integer actor = parseIntegerOrNull(req.getParameter("actor_user_id"));
        writeJson(resp, 200, s.adminActivityLogs(uid, skip, limit, actor,
            req.getParameter("action"), req.getParameter("from"), req.getParameter("to"),
            req.getParameter("entity_type")));
        return;
      }
      if ("/activity-logs/export.csv".equals(pi)) {
        Integer actor = parseIntegerOrNull(req.getParameter("actor_user_id"));
        String csv = s.adminActivityLogsExportCsv(uid, actor,
            req.getParameter("action"), req.getParameter("from"), req.getParameter("to"),
            req.getParameter("entity_type"));
        resp.setStatus(200);
        resp.setCharacterEncoding(StandardCharsets.UTF_8.name());
        resp.setContentType("text/csv; charset=UTF-8");
        resp.setHeader("Content-Disposition", "attachment; filename=\"activity_logs.csv\"");
        resp.getOutputStream().write(csv.getBytes(StandardCharsets.UTF_8));
        return;
      }
      if ("/users".equals(pi)) {
        int skip = parseInt(req.getParameter("skip"), 0);
        int limit = parseInt(req.getParameter("limit"), 50);
        limit = Math.min(Math.max(limit, 1), 200);
        skip = Math.max(skip, 0);
        writeJson(resp, 200, s.adminListUsers(uid, req.getParameter("role"), req.getParameter("q"), skip, limit));
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
      int uid = userId(req);
      String pi = req.getPathInfo();
      if ("/users".equals(pi)) {
        writeJson(resp, 200, s.adminCreateUser(uid, readMap(req)));
        return;
      }
      resp.sendError(HttpServletResponse.SC_NOT_FOUND);
    } catch (Exception e) {
      handleError(resp, e);
    }
  }

  protected void doPatch(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    try {
      TaRecruitService s = svc(req);
      int uid = userId(req);
      String pi = req.getPathInfo();
      if (pi == null) {
        resp.sendError(HttpServletResponse.SC_NOT_FOUND);
        return;
      }
      if ("/settings".equals(pi)) {
        writeJson(resp, 200, s.adminPatchSettings(uid, readMap(req)));
        return;
      }
      Matcher userMatcher = USER_ID.matcher(pi);
      if (userMatcher.matches()) {
        int targetId = Integer.parseInt(userMatcher.group(1));
        writeJson(resp, 200, s.adminPatchUser(uid, targetId, readMap(req)));
        return;
      }
      resp.sendError(HttpServletResponse.SC_NOT_FOUND);
    } catch (Exception e) {
      handleError(resp, e);
    }
  }

  @Override
  protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    try {
      TaRecruitService s = svc(req);
      int uid = userId(req);
      String pi = req.getPathInfo();
      if (pi == null) {
        resp.sendError(HttpServletResponse.SC_NOT_FOUND);
        return;
      }
      Matcher userMatcher = USER_ID.matcher(pi);
      if (userMatcher.matches()) {
        int targetId = Integer.parseInt(userMatcher.group(1));
        writeJson(resp, 200, s.adminDeleteUser(uid, targetId));
        return;
      }
      resp.sendError(HttpServletResponse.SC_NOT_FOUND);
    } catch (Exception e) {
      handleError(resp, e);
    }
  }

  private static int parseInt(String s, int def) {
    if (s == null || s.isBlank()) {
      return def;
    }
    try {
      return Integer.parseInt(s.trim());
    } catch (NumberFormatException e) {
      return def;
    }
  }

  private static Integer parseIntegerOrNull(String s) {
    if (s == null || s.isBlank()) {
      return null;
    }
    try {
      return Integer.parseInt(s.trim());
    } catch (NumberFormatException e) {
      return null;
    }
  }
}
