package com.ebu6304.tarecruit.filter;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

/** 单页应用回退：非 API、非静态资源路径转发到 {@code index.html}，支持前端路由。 */
public final class SpaFallbackFilter implements Filter {
  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
      throws IOException, ServletException {
    HttpServletRequest req = (HttpServletRequest) request;
    HttpServletResponse resp = (HttpServletResponse) response;
    if (!"GET".equalsIgnoreCase(req.getMethod())) {
      chain.doFilter(request, response);
      return;
    }
    String path = req.getRequestURI().substring(req.getContextPath().length());
    if (path.startsWith("/api")) {
      chain.doFilter(request, response);
      return;
    }
    if (path.contains(".")) {
      chain.doFilter(request, response);
      return;
    }
    try {
      if (req.getServletContext().getResource(path) != null) {
        chain.doFilter(request, response);
        return;
      }
    } catch (Exception ignored) {
      // fall through to SPA
    }
    req.getRequestDispatcher("/index.html").forward(req, resp);
  }
}
