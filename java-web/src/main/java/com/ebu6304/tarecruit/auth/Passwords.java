package com.ebu6304.tarecruit.auth;

import org.mindrot.jbcrypt.BCrypt;

public final class Passwords {
  private Passwords() {}

  public static String hash(String plain) {
    return BCrypt.hashpw(plain, BCrypt.gensalt());
  }

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
