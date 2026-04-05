package com.ebu6304.tarecruit.servlet;

import com.ebu6304.tarecruit.TaRecruitService;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@WebServlet(urlPatterns = {"/api/jobs", "/api/jobs/*"})
public final class JobsServlet extends JsonServlet {
  private static final Pattern APPLY = Pattern.compile("^/(\\d+)/apply$");

  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    try {
      TaRecruitService s = svc(req);
      String pi = req.getPathInfo();
      if (pi == null || pi.isEmpty() || "/".equals(pi)) {
        String q = req.getParameter("q");
        String skill = req.getParameter("skill");
        String status = req.getParameter("status");
        String sort = req.getParameter("sort");
        String fo = req.getParameter("favorites_only");
        String uo = req.getParameter("unapplied_only");
        Boolean favoritesOnly = fo != null ? Boolean.parseBoolean(fo) : null;
        Boolean unappliedOnly = uo != null ? Boolean.parseBoolean(uo) : null;
        writeJson(resp, 200, s.listJobs(userId(req), q, skill, status, sort, favoritesOnly, unappliedOnly));
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
      if (pi == null) {
        resp.sendError(HttpServletResponse.SC_NOT_FOUND);
        return;
      }
      Matcher m = APPLY.matcher(pi);
      if (m.matches()) {
        int jobId = Integer.parseInt(m.group(1));
        writeJson(resp, 200, s.applyJob(userId(req), jobId));
        return;
      }
      resp.sendError(HttpServletResponse.SC_NOT_FOUND);
    } catch (Exception e) {
      handleError(resp, e);
    }
  }
}
