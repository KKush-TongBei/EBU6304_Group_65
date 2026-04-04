export type UserRole = "ta" | "mo" | "admin";

export interface User {
  id: number;
  email: string;
  role: UserRole;
  display_name: string;
  student_id: string | null;
  skills: string;
  cv_file_path: string;
  created_at: string;
}

export type JobStatus = "open" | "closed";
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
}

export interface Notification {
  id: number;
  title: string;
  body: string;
  application_id: number | null;
  read: boolean;
  created_at: string;
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
