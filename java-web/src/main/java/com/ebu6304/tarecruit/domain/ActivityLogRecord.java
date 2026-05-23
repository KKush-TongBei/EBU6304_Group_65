package com.ebu6304.tarecruit.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;
import java.util.Map;

/** 活动审计日志：对应 {@code activity_logs.json} 中单条记录（登录、管理操作等）。 */
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
