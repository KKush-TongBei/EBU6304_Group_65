package com.ebu6304.tarecruit.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public final class Counters {
  public int userSeq = 1;
  public int jobSeq = 1;
  public int applicationSeq = 1;
  public int assignmentSeq = 1;
  public int notificationSeq = 1;
  public int activityLogSeq = 1;
  public int evaluationSeq = 1;
  public int cvFileSeq = 1;
}
