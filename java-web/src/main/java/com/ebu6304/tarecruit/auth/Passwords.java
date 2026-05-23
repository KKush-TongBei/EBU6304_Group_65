package com.ebu6304.tarecruit.auth;

import org.mindrot.jbcrypt.BCrypt;

/**
 * 密码单向哈希工具：使用 BCrypt 对明文加盐哈希，注册时写入 {@code password_hash}，登录时用 {@link #verify} 校验。
 * 不保存明文密码，也不可从哈希还原明文。
 */
public final class Passwords {
  private Passwords() {}

  /** 对明文密码加盐并生成 BCrypt 哈希字符串。 */
  public static String hash(String plain) {
    return BCrypt.hashpw(plain, BCrypt.gensalt());
  }

  /** 校验明文与已存哈希是否匹配（哈希损坏或格式错误时返回 false）。 */
  public static boolean verify(String plain, String hash) {
    if (hash == null || hash.isEmpty()) {
      return false;
    }
    try {
      return BCrypt.checkpw(plain, hash);
    } catch (IllegalArgumentException e) {
      return false;
    }
  }
}
