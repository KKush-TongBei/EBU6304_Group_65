package com.ebu6304.tarecruit.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;

@JsonIgnoreProperties(ignoreUnknown = true)
public final class NotificationRecord {
  public int id;
  public int user_id;
  public String title;
  public String body = "";
  public Integer application_id;
  public boolean read;
  public Instant created_at;
  /** decision | deadline | profile | job_closed | workload_alert | system */
  public String category = "system";
  public Integer link_job_id;
  public Integer link_application_id;
}
