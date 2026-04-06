package com.ebu6304.tarecruit.user;

import com.ebu6304.tarecruit.auth.Passwords;
import com.ebu6304.tarecruit.domain.UserRecord;

import java.nio.file.Path;
import java.time.Instant;
import java.util.Locale;

/**
 * Business logic around registration/login backed by JSON file storage.
 */
public final class UserService {
  private final UserDAO dao;

  public UserService() {
    this(UserDAO.getInstance());
  }

  UserService(UserDAO dao) {
    this.dao = dao;
  }

  public static UserService forPath(Path usersPath) {
    return new UserService(UserDAO.forPath(usersPath));
  }

  /**
   * Persists a new public TA account with a caller-assigned id (keeps {@code counters.json} in sync with the main app).
   */
  public UserRecord persistNewTa(int assignedUserId,
                                 String email,
                                 String plainPassword,
                                 String displayName,
                                 String studentId) {
    requireEmail(email);
    requirePassword(plainPassword);
    if (dao.findByEmail(email).isPresent()) {
      throw new IllegalArgumentException("Email already registered");
    }
    String sid = studentId != null ? studentId.strip() : "";
    if (sid.isEmpty()) {
      throw new IllegalArgumentException("student_id is required for TA");
    }

    UserRecord u = new UserRecord();
    u.id = assignedUserId;
    u.email = email.trim().toLowerCase(Locale.ROOT);
    u.password_hash = Passwords.hash(plainPassword);
    u.role = UserRole.TA.value();
    u.display_name = (displayName == null || displayName.isBlank())
        ? u.email.split("@")[0]
        : displayName.trim();
    u.student_id = sid;
    u.skills = "";
    u.cv_file_path = "";
    u.created_at = Instant.now();
    u.failed_login_attempts = 0;
    u.locked_until = null;

    dao.insert(u);
    return sanitize(u);
  }

  /** BCrypt check for integrating with session / lockout logic outside this service. */
  public boolean passwordMatches(String plainPassword, String storedHash) {
    return Passwords.verify(plainPassword, storedHash);
  }

  public UserRecord register(String email,
                             String plainPassword,
                             UserRole role,
                             String displayName,
                             String studentId) {
    requireEmail(email);
    requirePassword(plainPassword);
    if (role == null) {
      throw new IllegalArgumentException("role is required");
    }
    if (dao.findByEmail(email).isPresent()) {
      throw new IllegalArgumentException("email already exists");
    }
    if (role == UserRole.TA && (studentId == null || studentId.isBlank())) {
      throw new IllegalArgumentException("student_id is required for TA");
    }

    UserRecord u = new UserRecord();
    u.id = dao.nextUserId();
    u.email = email.trim().toLowerCase(Locale.ROOT);
    u.password_hash = Passwords.hash(plainPassword);
    u.role = role.value();
    u.display_name = (displayName == null || displayName.isBlank()) ? u.email.split("@")[0] : displayName.trim();
    u.student_id = role == UserRole.TA ? studentId.trim() : null;
    u.created_at = Instant.now();
    u.failed_login_attempts = 0;
    u.locked_until = null;

    dao.insert(u);
    return sanitize(u);
  }

  public UserRecord login(String email, String plainPassword) {
    requireEmail(email);
    requirePassword(plainPassword);
    UserRecord u = dao.findByEmail(email)
        .orElseThrow(() -> new IllegalArgumentException("invalid email or password"));
    if (!Passwords.verify(plainPassword, u.password_hash)) {
      throw new IllegalArgumentException("invalid email or password");
    }
    return sanitize(u);
  }

  private static UserRecord sanitize(UserRecord source) {
    UserRecord copy = new UserRecord();
    copy.id = source.id;
    copy.email = source.email;
    copy.role = source.role;
    copy.display_name = source.display_name;
    copy.student_id = source.student_id;
    copy.created_at = source.created_at;
    copy.failed_login_attempts = source.failed_login_attempts;
    copy.locked_until = source.locked_until;
    copy.skills = source.skills;
    copy.cv_file_path = source.cv_file_path;
    copy.profile_skills = source.profile_skills;
    copy.preferred_courses = source.preferred_courses;
    copy.languages = source.languages;
    copy.availability_json = source.availability_json;
    copy.max_weekly_hours = source.max_weekly_hours;
    copy.ta_history = source.ta_history;
    copy.certificates = source.certificates;
    copy.gpa = source.gpa;
    copy.password_hash = null;
    return copy;
  }

  private static void requireEmail(String email) {
    if (email == null || email.isBlank() || !email.contains("@")) {
      throw new IllegalArgumentException("valid email is required");
    }
  }

  private static void requirePassword(String plainPassword) {
    if (plainPassword == null || plainPassword.length() < 8) {
      throw new IllegalArgumentException("password must be at least 8 chars");
    }
    boolean hasLetter = plainPassword.chars().anyMatch(Character::isLetter);
    boolean hasDigit = plainPassword.chars().anyMatch(Character::isDigit);
    if (!hasLetter || !hasDigit) {
      throw new IllegalArgumentException("password must contain letters and digits");
    }
  }
}
