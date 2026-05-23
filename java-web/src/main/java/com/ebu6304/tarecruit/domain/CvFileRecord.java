package com.ebu6304.tarecruit.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;

/** 已上传简历文件元数据（路径、原名、上传者等）。 */
@JsonIgnoreProperties(ignoreUnknown = true)
public final class CvFileRecord {
  public int id;
  public int user_id;
  public String stored_name;
  public String original_name;
  public String content_type;
  public long size_bytes;
  public int version = 1;
  public Instant created_at;
}
