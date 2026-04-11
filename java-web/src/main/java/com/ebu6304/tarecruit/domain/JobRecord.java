package com.ebu6304.tarecruit.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;

@JsonIgnoreProperties(ignoreUnknown = true)
public final class JobRecord {
  public int id;
  public String module_name;
  public String requirements = "";
  public String deadline = "";
  public String skill_tags = "";
  /** draft | open | screening | interview | shortlist | filled | closed | cancelled */
  public String status = "open";
  /** Weekly workload for this slot (hours per week); summed for TA capacity checks. */
  public double assigned_hours = 5.0;
  public int created_by;
  public Instant updated_at;
  public Instant created_at;
  public int quota = 1;
  /** course_ta | invigilation | event_support */
  public String job_type = "course_ta";
  public String term = "";
  public String schedule_text = "";
  public boolean allow_duplicate_apply_same_type = true;
  public boolean deadline_notification_sent = false;
}
