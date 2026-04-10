package com.ebu6304.tarecruit;

import com.ebu6304.tarecruit.auth.JwtHelper;
import jakarta.servlet.ServletContext;
import jakarta.servlet.ServletContextEvent;
import jakarta.servlet.ServletContextListener;
import jakarta.servlet.annotation.WebListener;

import java.io.IOException;
import java.nio.file.Path;

@WebListener
public final class TaRecruitBootstrap implements ServletContextListener {
  /**
   * 与 README 演示账号一致：仅在当前数据里尚无任何 {@code admin} 用户时由 {@link TaRecruitService#ensureSeedAdmin}
   * 写入。生产环境请优先在数据中预置管理员，或同时设置 {@code TA_SEED_ADMIN_EMAIL} 与
   * {@code TA_SEED_ADMIN_PASSWORD} 覆盖（勿只设其一）。
   */
  private static final String README_DEMO_ADMIN_EMAIL = "zyx1678162910@gmail.com";
  private static final String README_DEMO_ADMIN_PASSWORD = "admin123456";

  @Override
  public void contextInitialized(ServletContextEvent sce) {
    ServletContext ctx = sce.getServletContext();
    try {
      Path dataDir = resolveDataDir(ctx);
      String secret = resolveSecret(ctx);
      double maxHours = resolveMaxHours(ctx);
      JwtHelper jwt = new JwtHelper(secret, 60 * 24);
      TaRecruitService svc = new TaRecruitService(dataDir, jwt, maxHours);
      svc.initEmptyFiles();
      String seedEmail = System.getenv("TA_SEED_ADMIN_EMAIL");
      String seedPassword = System.getenv("TA_SEED_ADMIN_PASSWORD");
      if (seedEmail != null && !seedEmail.isBlank() && seedPassword != null && !seedPassword.isBlank()) {
        svc.ensureSeedAdmin(seedEmail.trim(), seedPassword);
      } else {
        svc.ensureSeedAdmin(README_DEMO_ADMIN_EMAIL, README_DEMO_ADMIN_PASSWORD);
      }
      ctx.setAttribute(TaRecruitService.CTX_ATTR, svc);
    } catch (IOException e) {
      throw new IllegalStateException("Failed to init TA data directory", e);
    }
  }

  private static Path resolveDataDir(ServletContext ctx) {
    String p = ctx.getInitParameter("dataDir");
    if (p != null && !p.isBlank()) {
      return Path.of(p.trim()).toAbsolutePath().normalize();
    }
    p = System.getProperty("ta.data.dir");
    if (p != null && !p.isBlank()) {
      return Path.of(p.trim()).toAbsolutePath().normalize();
    }
    p = System.getenv("TA_DATA_DIR");
    if (p != null && !p.isBlank()) {
      return Path.of(p.trim()).toAbsolutePath().normalize();
    }
    return Path.of(System.getProperty("user.dir"), "data").toAbsolutePath().normalize();
  }

  private static String resolveSecret(ServletContext ctx) {
    String s = ctx.getInitParameter("secretKey");
    if (s != null && !s.isBlank()) {
      return s.trim();
    }
    s = System.getenv("TA_JWT_SECRET");
    if (s != null && !s.isBlank()) {
      return s.trim();
    }
    s = System.getenv("SECRET_KEY");
    if (s != null && !s.isBlank()) {
      return s.trim();
    }
    return "change-me-in-production-use-long-random-string";
  }

  private static double resolveMaxHours(ServletContext ctx) {
    String p = ctx.getInitParameter("maxTaHoursDefault");
    if (p != null && !p.isBlank()) {
      try {
        return Double.parseDouble(p.trim());
      } catch (NumberFormatException ignored) {
        // fall through
      }
    }
    String e = System.getenv("MAX_TA_HOURS_DEFAULT");
    if (e != null && !e.isBlank()) {
      try {
        return Double.parseDouble(e.trim());
      } catch (NumberFormatException ignored) {
        // fall through
      }
    }
    return 20.0;
  }
}
