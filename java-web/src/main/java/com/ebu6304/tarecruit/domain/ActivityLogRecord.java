package com.ebu6304.tarecruit.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public final class ActivityLogRecord {
  public int id;
  public Integer actor_user_id;
  public String action;
  public String entity_type = "";
  public Integer entity_id;
  public Map<String, Object> payload;
  public Instant created_at;
}
