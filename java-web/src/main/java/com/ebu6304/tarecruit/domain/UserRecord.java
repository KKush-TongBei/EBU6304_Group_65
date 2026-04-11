package com.ebu6304.tarecruit.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public final class UserRecord {
  public int id;
  public String email;
  public String password_hash;
  public String role;
  public String display_name = "";
  public String student_id;
  public String skills = "";
  public String cv_file_path = "";
  public Instant created_at;
  public int failed_login_attempts = 0;
  public Instant locked_until;
  /** Incremented each time an account is locked after repeated failed logins; drives escalating lock duration. */
  public int lockout_count = 0;
  /** Structured profile (TA) */
  public List<String> profile_skills = new ArrayList<>();
  public String preferred_courses = "";
  public String languages = "";
  /** JSON string or free-text availability windows */
  public String availability_json = "";
  public double max_weekly_hours = 0;
  public String ta_history = "";
  public String certificates = "";
  public String gpa = "";
}
