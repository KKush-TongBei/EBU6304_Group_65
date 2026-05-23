package com.ebu6304.tarecruit.servlet;

import com.ebu6304.tarecruit.TaRecruitService;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** 课程负责人（MO）端 API：发布岗位、审阅申请、评分与录用等。 */
@WebServlet("/api/mo/*")
public final class MoServlet extends JsonServlet {
  private static final Pattern JOB_ID = Pattern.compile("^/jobs/(\\d+)$");
  private static final Pattern JOB_CLOSE = Pattern.compile("^/jobs/(\\d+)/close$");
  private static final Pattern JOB_TRANSITION = Pattern.compile("^/jobs/(\\d+)/transition$");
  private static final Pattern JOB_APPS = Pattern.compile("^/jobs/(\\d+)/applications$");
  private static final Pattern JOB_BATCH = Pattern.compile("^/jobs/(\\d+)/applications/batch$");
  private static final Pattern JOB_CSV = Pattern.compile("^/jobs/(\\d+)/export\\.csv$");
  private static final Pattern APP_DECIDE = Pattern.compile("^/applications/(\\d+)$");
  private static final Pattern APP_EVAL = Pattern.compile("^/applications/(\\d+)/evaluation$");
  private static final Pattern APP_AUTO_EVAL = Pattern.compile("^/applications/(\\d+)/auto-evaluation$");
  private static final Pattern JOB_AUTO_EVAL_ALL = Pattern.compile("^/jobs/(\\d+)/applications/auto-evaluate-all$");
  private static final Pattern APP_CV = Pattern.compile("^/applications/(\\d+)/cv$");

  @Override
  protected void service(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
    String method = req.getMethod();
    if ("PATCH".equals(method)) {
      doPatch(req, resp);
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
        writeJson(resp, 200, s.moDashboard(uid));
        return;
      }
      if ("/job-templates".equals(pi)) {
        writeJson(resp, 200, s.moListJobTemplates(uid));
        return;
      }
      if ("/jobs".equals(pi)) {
        String st = req.getParameter("job_status");
        writeJson(resp, 200, s.moJobs(uid, st));
        return;
      }
      Matcher m1 = JOB_APPS.matcher(pi);
      if (m1.matches()) {
        int jid = Integer.parseInt(m1.group(1));
        String sort = req.getParameter("sort");
        String st = req.getParameter("status");
        writeJson(resp, 200, s.moJobApplicants(uid, jid, sort, st));
        return;
      }
      Matcher m2 = JOB_CSV.matcher(pi);
      if (m2.matches()) {
        int jobId = Integer.parseInt(m2.group(1));
        String csv = s.moExportJobCsv(uid, jobId);
        resp.setStatus(200);
        resp.setCharacterEncoding(StandardCharsets.UTF_8.name());
        resp.setContentType("text/csv; charset=UTF-8");
        resp.setHeader("Content-Disposition", "attachment; filename=\"job_" + jobId + "_applicants.csv\"");
        resp.getOutputStream().write(csv.getBytes(StandardCharsets.UTF_8));
        return;
      }
      Matcher mcv = APP_CV.matcher(pi);
      if (mcv.matches()) {
        int appId = Integer.parseInt(mcv.group(1));
        byte[] bytes = s.moDownloadApplicantCv(uid, appId);
        resp.setStatus(200);
        resp.setContentType("application/octet-stream");
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
      int uid = userId(req);
      String pi = req.getPathInfo();
      if (pi == null) {
        resp.sendError(HttpServletResponse.SC_NOT_FOUND);
        return;
      }
      if ("/jobs".equals(pi)) {
        writeJson(resp, 200, s.moCreateJob(uid, readMap(req)));
        return;
      }
      if ("/job-templates".equals(pi)) {
        writeJson(resp, 200, s.moSaveJobTemplate(uid, readMap(req)));
        return;
      }
      Matcher mc = JOB_CLOSE.matcher(pi);
      if (mc.matches()) {
        writeJson(resp, 200, s.moCloseJob(uid, Integer.parseInt(mc.group(1))));
        return;
      }
      Matcher mt = JOB_TRANSITION.matcher(pi);
      if (mt.matches()) {
        writeJson(resp, 200, s.moTransitionJob(uid, Integer.parseInt(mt.group(1)), readMap(req)));
        return;
      }
      Matcher mb = JOB_BATCH.matcher(pi);
      if (mb.matches()) {
        writeJson(resp, 200, s.moBatchApplicationDecision(uid, Integer.parseInt(mb.group(1)), readMap(req)));
        return;
      }
      Matcher me = APP_EVAL.matcher(pi);
      if (me.matches()) {
        writeJson(resp, 200, s.moSaveEvaluation(uid, Integer.parseInt(me.group(1)), readMap(req)));
        return;
      }
      Matcher mae = APP_AUTO_EVAL.matcher(pi);
      if (mae.matches()) {
        writeJson(resp, 200, s.autoEvaluateApplication(uid, Integer.parseInt(mae.group(1))));
        return;
      }
      Matcher mjae = JOB_AUTO_EVAL_ALL.matcher(pi);
      if (mjae.matches()) {
        writeJson(resp, 200, s.autoEvaluateJobApplications(uid, Integer.parseInt(mjae.group(1))));
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
      Matcher mj = JOB_ID.matcher(pi);
      if (mj.matches()) {
        writeJson(resp, 200, s.moDeleteJob(uid, Integer.parseInt(mj.group(1))));
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
      Matcher mj = JOB_ID.matcher(pi);
      if (mj.matches()) {
        writeJson(resp, 200, s.moUpdateJob(uid, Integer.parseInt(mj.group(1)), readMap(req)));
        return;
      }
      Matcher ma = APP_DECIDE.matcher(pi);
      if (ma.matches()) {
        Map<String, Object> body = readMap(req);
        writeJson(resp, 200, s.moDecideApplication(uid, Integer.parseInt(ma.group(1)), body));
        return;
      }
      resp.sendError(HttpServletResponse.SC_NOT_FOUND);
    } catch (Exception e) {
      handleError(resp, e);
    }
  }
}