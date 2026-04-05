export type UserRole = "ta" | "mo" | "admin";

export interface User {
  id: number;
  email: string;
  role: UserRole;
  display_name: string;
  student_id: string | null;
  skills: string;
  cv_file_path: string;
  cv_file_id?: number;
  cv_original_name?: string;
  created_at: string;
  profile_skills?: string[];
  preferred_courses?: string;
  languages?: string;
  availability_json?: string;
  max_weekly_hours?: number;
  ta_history?: string;
  certificates?: string;
  gpa?: string;
  profile_completeness?: number;
  missing_profile_fields?: string[];
}

export type JobStatus =
  | "draft"
  | "open"
  | "screening"
  | "interview"
  | "shortlist"
  | "filled"
  | "closed"
  | "cancelled";

export type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export interface Job {
  id: number;
  module_name: string;
  requirements: string;
  deadline: string;
  skill_tags: string;
  status: JobStatus;
  assigned_hours: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  quota?: number;
  accepted_count?: number;
  job_type?: string;
  term?: string;
  schedule_text?: string;
  allow_duplicate_apply_same_type?: boolean;
  favorited?: boolean;
}

export interface ApplicationEvaluation {
  id: number;
  application_id: number;
  skill_match: number;
  course_experience: number;
  academic_background: number;
  availability_score: number;
  communication: number;
  total_note: string;
  label: string;
  decision_note: string;
  updated_by: number;
  updated_at: string;
  total_score: number;
}

export interface Application {
  id: number;
  job_id: number;
  ta_user_id: number;
  status: ApplicationStatus;
  created_at: string;
  decided_at: string | null;
  job: Job | null;
  ta_display_name: string | null;
  ta_email: string | null;
  ta_student_id: string | null;
  evaluation?: ApplicationEvaluation | null;
  evaluation_total?: number;
  shortlist_tag?: string;
  warnings?: string[];
}

export interface Notification {
  id: number;
  title: string;
  body: string;
  application_id: number | null;
  read: boolean;
  created_at: string;
  category?: string;
  link_job_id?: number | null;
  link_application_id?: number | null;
}

export interface WorkloadRow {
  ta_user_id: number;
  display_name: string;
  email: string;
  total_hours: number;
  overloaded: boolean;
}

export interface ActivityLog {
  id: number;
  actor_user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface AppSettings {
  max_ta_hours_default: number;
  notifications_enabled: boolean;
  term_start: string;
  term_end: string;
  skill_dictionary: string[];
  overload_threshold_hours: number;
  default_job_quota?: number;
  semester_label?: string;
  ai_match_weights?: Record<string, number>;
}
