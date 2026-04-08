package com.ebu6304.tarecruit.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;

@JsonIgnoreProperties(ignoreUnknown = true)
public final class ApplicationRecord {
  public int id;
  public int job_id;
  public int ta_user_id;
  public String status = "pending";
  public Instant created_at;
  public Instant decided_at;
  /** shortlist tag for MO workflow */
  public String shortlist_tag = "";
}
