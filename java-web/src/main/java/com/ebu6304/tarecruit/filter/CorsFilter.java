package com.ebu6304.tarecruit.filter;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

/** 跨域 CORS 响应头：允许前端开发服务器或部署域名调用 API。 */
public final class CorsFilter implements Filter {
  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
      throws IOException, ServletException {
    HttpServletRequest req = (HttpServletRequest) request;
    HttpServletResponse resp = (HttpServletResponse) response;
    String origin = req.getHeader("Origin");
    if (origin != null && !origin.isBlank()) {
      resp.setHeader("Access-Control-Allow-Origin", origin);
      resp.addHeader("Vary", "Origin");
      resp.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      resp.setHeader("Access-Control-Allow-Origin", "*");
    }
    resp.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
    resp.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
    resp.setHeader("Access-Control-Max-Age", "3600");
    if ("OPTIONS".equalsIgnoreCase(req.getMethod())) {
      resp.setStatus(HttpServletResponse.SC_NO_CONTENT);
      return;
    }
    chain.doFilter(request, response);
  }
}
