package com.ebu6304.tarecruit.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

/**
 * JWT 签发与校验：登录成功后生成 Bearer Token（subject 为用户 id），过滤器据此识别当前用户。
 */
public final class JwtHelper {
  private final SecretKey key;
  private final long expireMinutes;

  public JwtHelper(String secret, long expireMinutes) {
    byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
    if (bytes.length < 32) {
      byte[] padded = new byte[32];
      System.arraycopy(bytes, 0, padded, 0, Math.min(bytes.length, 32));
      for (int i = bytes.length; i < 32; i++) {
        padded[i] = (byte) i;
      }
      bytes = padded;
    }
    this.key = Keys.hmacShaKeyFor(bytes);
    this.expireMinutes = expireMinutes;
  }

  public String createForUserId(int userId) {
    Instant now = Instant.now();
    Instant exp = now.plusSeconds(expireMinutes * 60);
    return Jwts.builder()
        .subject(String.valueOf(userId))
        .issuedAt(Date.from(now))
        .expiration(Date.from(exp))
        .signWith(key)
        .compact();
  }

  public Integer parseUserId(String token) {
    if (token == null || token.isEmpty()) {
      return null;
    }
    try {
      Claims c = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
      String sub = c.getSubject();
      if (sub == null) {
        return null;
      }
      return Integer.parseInt(sub);
    } catch (Exception e) {
      return null;
    }
  }
}
