package com.ebu6304.tarecruit.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** TA 收藏岗位关系记录。 */
@JsonIgnoreProperties(ignoreUnknown = true)
public final class JobFavoriteRecord {
  public int user_id;
  public int job_id;
}
