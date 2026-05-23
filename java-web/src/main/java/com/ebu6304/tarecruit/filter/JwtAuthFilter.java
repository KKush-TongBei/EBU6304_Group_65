package com.ebu6304.tarecruit.filter;

import com.ebu6304.tarecruit.AppJson;
import com.ebu6304.tarecruit.TaRecruitService;
import com.ebu6304.tarecruit.servlet.JsonServlet;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Map;

/**
 * JWT 认证过滤器：解析 {@code Authorization: Bearer}，校验后将用户 id 写入请求属性，供 Servlet 使用。
 * 未带 Token 的公开路径（如登录、注册）直接放行。
 */
public final class JwtAuthFilter implements Filter {
  private static final ObjectMapper M = AppJson.mapper();

  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
      throws IOException, ServletException {
    HttpServletRequest req = (HttpServletRequest) request;
    HttpServletResponse resp = (HttpServletResponse) response;
    if ("OPTIONS".equalsIgnoreCase(req.getMethod())) {
      chain.doFilter(request, response);
      return;
    }
    String path = req.getRequestURI().substring(req.getContextPath().length());
    if (isPublic(path)) {
      chain.doFilter(request, response);
      return;
    }
    String auth = req.getHeader("Authorization");
    String token = null;
    if (auth != null && auth.length() > 7 && auth.regionMatches(true, 0, "Bearer ", 0, 7)) {
      token = auth.substring(7).trim();
    }
    if (token == null || token.isEmpty()) {
      json401(resp);
      return;
    }
    TaRecruitService svc = (TaRecruitService) req.getServletContext().getAttribute(TaRecruitService.CTX_ATTR);
    if (svc == null) {
      json500(resp);
      return;
    }
    Integer uid = svc.parseUserIdFromJwt(token);
    if (uid == null) {
      json401(resp);
      return;
    }
    req.setAttribute(JsonServlet.ATTR_USER_ID, uid);
    chain.doFilter(request, response);
  }

  private static boolean isPublic(String path) {
    return "/api/health".equals(path)
        || "/api/auth/login".equals(path)
        || "/api/auth/register".equals(path)
        || "/api/auth/logout".equals(path);
  }

  private static void json401(HttpServletResponse resp) throws IOException {
    resp.setStatus(401);
    resp.setCharacterEncoding("UTF-8");
    resp.setContentType("application/json");
    M.writeValue(resp.getOutputStream(), Map.of("detail", "Not authenticated"));
  }

  private static void json500(HttpServletResponse resp) throws IOException {
    resp.setStatus(500);
    resp.setCharacterEncoding("UTF-8");
    resp.setContentType("application/json");
    M.writeValue(resp.getOutputStream(), Map.of("detail", "Service unavailable"));
  }
}
