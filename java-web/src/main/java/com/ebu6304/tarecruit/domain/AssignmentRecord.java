package com.ebu6304.tarecruit.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;

/** 录用/指派记录：对应 {@code assignments.json} 中单条记录。 */
@JsonIgnoreProperties(ignoreUnknown = true)
public final class AssignmentRecord {
  public int id;
  public int ta_user_id;
  public int job_id;
  public int application_id;
  /** Weekly hours for this assignment (same semantics as {@link JobRecord#assigned_hours}). */
  public double assigned_hours;
  public String term = "2025-2026-1";
  public Instant created_at;
}
