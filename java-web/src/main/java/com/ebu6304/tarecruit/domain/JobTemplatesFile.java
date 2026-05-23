package com.ebu6304.tarecruit.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 岗位描述模板集合：对应 {@code job_templates.json} 根结构。 */
@JsonIgnoreProperties(ignoreUnknown = true)
public final class JobTemplatesFile {
  public List<Map<String, Object>> built_ins = new ArrayList<>();
  /** Each entry: mo_user_id, name, plus same keys as job fields */
  public List<Map<String, Object>> saved = new ArrayList<>();

  public static JobTemplatesFile defaults() {
    JobTemplatesFile f = new JobTemplatesFile();
    f.built_ins.add(builtin(
        "lab_ta",
        "Lab TA",
        "Laboratory support for programming modules.",
        "Python, Java, debugging, lab safety",
        6.0,
        3));
    f.built_ins.add(builtin(
        "marker",
        "Exam Marker",
        "Marking coursework and exams.",
        "Attention to detail, rubric use, fairness",
        8.0,
        2));
    f.built_ins.add(builtin(
        "invigilator",
        "Invigilator",
        "Exam invigilation sessions.",
        "Punctuality, exam regulations",
        4.0,
        4));
    f.built_ins.add(builtin(
        "event_support",
        "Event Support",
        "Open days and school events.",
        "Communication, teamwork",
        5.0,
        5));
    return f;
  }

  private static Map<String, Object> builtin(
      String id, String moduleName, String requirements, String skillTags, double hours, int quota) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", id);
    m.put("module_name", moduleName);
    m.put("requirements", requirements);
    m.put("skill_tags", skillTags);
    m.put("assigned_hours", hours);
    m.put("quota", quota);
    m.put("job_type", "course_ta");
    m.put("term", "");
    m.put("schedule_text", "As arranged by module organiser.");
    m.put("allow_duplicate_apply_same_type", true);
    return m;
  }
}
