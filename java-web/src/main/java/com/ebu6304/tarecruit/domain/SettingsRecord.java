package com.ebu6304.tarecruit.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 系统设置快照：对应 {@code settings.json}。 */
@JsonIgnoreProperties(ignoreUnknown = true)
public final class SettingsRecord {
  public double max_ta_hours_default = 20.0;
  public boolean notifications_enabled = true;
  public String term_start = "";
  public String term_end = "";
  public List<String> skill_dictionary = new ArrayList<>();
  /** Max recommended weekly hours per TA before overload (same unit as job assigned_hours). */
  public double overload_threshold_hours = 20.0;
  /** Default quota when MO omits quota on new jobs */
  public int default_job_quota = 1;
  /** Shown in dashboards / suggested default term label */
  public String semester_label = "";
  public Map<String, Double> ai_match_weights = new LinkedHashMap<>();
}
