package com.ebu6304.tarecruit.servlet;

import com.ebu6304.tarecruit.TaRecruitService;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Part;

import java.io.IOException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@WebServlet("/api/ta/*")
@MultipartConfig(maxFileSize = 5_242_880L, maxRequestSize = 5_500_000L)
public final class TaServlet extends JsonServlet {
  private static final Pattern JOB_FAV = Pattern.compile("^/jobs/(\\d+)/favorite$");
  private static final Pattern CV_DOWNLOAD = Pattern.compile("^/cv/(\\d+)$");

  @Override
  protected void service(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
    if ("PATCH".equals(req.getMethod())) {
      doPatch(req, resp);
      return;
    }
    super.service(req, resp);
  }

  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
    try {
      TaRecruitService s = svc(req);
      String pi = req.getPathInfo();
      if ("/dashboard".equals(pi)) {
        writeJson(resp, 200, s.taDashboard(userId(req)));
        return;
      }
      if ("/applications".equals(pi)) {
        writeJson(resp, 200, s.taApplications(userId(req)));
        return;
      }
      if ("/profile".equals(pi)) {
        writeJson(resp, 200, s.taGetProfile(userId(req)));
        return;
      }
      Matcher m = CV_DOWNLOAD.matcher(pi != null ? pi : "");
      if (m.matches()) {
        int fileId = Integer.parseInt(m.group(1));
        byte[] bytes = s.taDownloadCv(userId(req), fileId);
        String ct = "application/octet-stream";
        resp.setStatus(200);
        resp.setContentType(ct);
        resp.getOutputStream().write(bytes);
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
      if ("/cv".equals(pi)) {
        Part part = req.getPart("file");
        if (part == null) {
          resp.sendError(HttpServletResponse.SC_BAD_REQUEST);
          return;
        }
        String name = part.getSubmittedFileName() != null ? part.getSubmittedFileName() : "cv.bin";
        byte[] data = part.getInputStream().readAllBytes();
        writeJson(resp, 200, s.taRegisterCv(userId(req), name, part.getContentType(), data.length, data));
        return;
      }
      Matcher m = JOB_FAV.matcher(pi != null ? pi : "");
      if (m.matches()) {
        writeJson(resp, 200, s.taToggleFavorite(userId(req), Integer.parseInt(m.group(1))));
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
      String pi = req.getPathInfo();
      if ("/profile".equals(pi)) {
        writeJson(resp, 200, s.taPatchProfile(userId(req), readMap(req)));
        return;
      }
      resp.sendError(HttpServletResponse.SC_NOT_FOUND);
    } catch (Exception e) {
      handleError(resp, e);
    }
  }
}
