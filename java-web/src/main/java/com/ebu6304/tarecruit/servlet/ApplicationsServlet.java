package com.ebu6304.tarecruit.servlet;

import com.ebu6304.tarecruit.TaRecruitService;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@WebServlet("/api/applications/*")
public final class ApplicationsServlet extends JsonServlet {
  private static final Pattern WITHDRAW = Pattern.compile("^/(\\d+)/withdraw$");

  @Override
  protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    try {
      TaRecruitService s = svc(req);
      String pi = req.getPathInfo();
      if (pi == null) {
        resp.sendError(HttpServletResponse.SC_NOT_FOUND);
        return;
      }
      Matcher m = WITHDRAW.matcher(pi);
      if (m.matches()) {
        writeJson(resp, 200, s.withdrawApplication(userId(req), Integer.parseInt(m.group(1))));
        return;
      }
      resp.sendError(HttpServletResponse.SC_NOT_FOUND);
    } catch (Exception e) {
      handleError(resp, e);
    }
  }
}
