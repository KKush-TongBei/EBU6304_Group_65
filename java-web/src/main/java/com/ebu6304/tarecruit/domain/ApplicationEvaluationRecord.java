package com.ebu6304.tarecruit.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;

/** MO 对某条申请的结构化评分/评语。 */
@JsonIgnoreProperties(ignoreUnknown = true)
public final class ApplicationEvaluationRecord {
  public int id;
  public int application_id;
  public int job_id;
  public int skill_match = 0;
  public int course_experience = 0;
  public int academic_background = 0;
  public int availability_score = 0;
  public int communication = 0;
  public String total_note = "";
  public String label = "";
  public String decision_note = "";
  public int updated_by;
  public Instant updated_at;
}
