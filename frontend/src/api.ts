import { withAppBase } from "./appBase";
import type {
  ActivityLog,
  Application,
  AppSettings,
  Job,
  Notification,
  User,
  UserRole,
  WorkloadRow,
} from "./types";

const TOKEN_KEY = "ta_recruit_token";

export function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ?? "";
  if (path.startsWith("http")) return path;
  return `${base}${path}`;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** 与 {@link request} 一致：带 Token 的请求若 401 则清会话并跳转登录（用于裸 fetch 场景）。 */
export function handleUnauthorizedRedirect(apiPath: string, status: number, hadBearerToken: boolean): void {
  if (status !== 401 || !hadBearerToken) return;
  if (apiPath.includes("/api/auth/login") || apiPath.includes("/api/auth/register")) return;
  setToken(null);
  sessionStorage.setItem("ta_session_expired", "1");
  window.location.assign(withAppBase("/login?reason=session"));
}

async function request<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(apiUrl(path), {
    ...options,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      if (j.detail) detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch {
      /* ignore */
    }
    handleUnauthorizedRedirect(path, res.status, Boolean(token));
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type");
  if (ct?.includes("application/json")) return res.json() as Promise<T>;
  return (await res.text()) as T;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ access_token: string }>("/api/auth/login", {
        method: "POST",
        json: { email, password },
      }),
    register: (body: {
      email: string;
      password: string;
      display_name?: string;
      student_id?: string;
      role: "TA" | "MO";
    }) =>
      request<{ access_token: string }>("/api/auth/register", {
        method: "POST",
        json: body,
      }),
    logout: () =>
      request<{ ok: boolean }>("/api/auth/logout", {
        method: "POST",
      }),
    me: () => request<User>("/api/auth/me"),
  },
  jobs: {
    list: (params: {
      q?: string;
      skill?: string;
      status?: string;
      sort?: string;
      favorites_only?: boolean;
      unapplied_only?: boolean;
    }) => {
      const sp = new URLSearchParams();
      if (params.q) sp.set("q", params.q);
      if (params.skill) sp.set("skill", params.skill);
      if (params.status) sp.set("status", params.status);
      if (params.sort) sp.set("sort", params.sort);
      if (params.favorites_only) sp.set("favorites_only", "true");
      if (params.unapplied_only) sp.set("unapplied_only", "true");
      const q = sp.toString();
      return request<Job[]>(`/api/jobs${q ? `?${q}` : ""}`);
    },
    apply: (jobId: number) =>
      request<Application>(`/api/jobs/${jobId}/apply`, { method: "POST" }),
  },
  applications: {
    withdraw: (id: number) =>
      request<Application>(`/api/applications/${id}/withdraw`, { method: "POST" }),
  },
  ta: {
    dashboard: () => request<Record<string, unknown>>("/api/ta/dashboard"),
    profile: () => request<User>("/api/ta/profile"),
    updateProfile: (body: Record<string, unknown>) =>
      request<User>("/api/ta/profile", { method: "PATCH", json: body }),
    myApplications: () => request<Application[]>("/api/ta/applications"),
    toggleFavorite: (jobId: number) =>
      request<{ favorited: boolean }>(`/api/ta/jobs/${jobId}/favorite`, { method: "POST" }),
    uploadCv: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const token = getToken();
      const res = await fetch(apiUrl("/api/ta/cv"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        let detail = res.statusText;
        try {
          const j = await res.json();
          if (j.detail) detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
        } catch {
          /* ignore */
        }
        handleUnauthorizedRedirect("/api/ta/cv", res.status, Boolean(token));
        throw new Error(detail);
      }
      return res.json() as Promise<{ file_id: number; stored_name: string }>;
    },
    cvDownloadUrl: (fileId: number) => `/api/ta/cv/${fileId}`,
  },
  notifications: {
    summary: () => request<{ unread_count: number }>("/api/notifications/summary"),
    list: (params?: { unread_only?: boolean; since_days?: number }) => {
      const sp = new URLSearchParams();
      if (params?.unread_only) sp.set("unread_only", "true");
      if (params?.since_days != null) sp.set("since_days", String(params.since_days));
      const q = sp.toString();
      return request<Notification[]>(`/api/notifications${q ? `?${q}` : ""}`);
    },
    markRead: (ids?: number[]) =>
      request<{ ok: boolean }>("/api/notifications/mark-read", {
        method: "POST",
        json: { notification_ids: ids ?? null },
      }),
  },
  mo: {
    dashboard: () => request<Record<string, unknown>>("/api/mo/dashboard"),
    myJobs: (jobStatus?: string) => {
      const q = jobStatus ? `?job_status=${encodeURIComponent(jobStatus)}` : "";
      return request<Job[]>(`/api/mo/jobs${q}`);
    },
    jobTemplates: () => request<Record<string, unknown>[]>("/api/mo/job-templates"),
    saveJobTemplate: (body: Record<string, unknown>) =>
      request<Record<string, unknown>>("/api/mo/job-templates", { method: "POST", json: body }),
    createJob: (body: Record<string, unknown>) =>
      request<Job>("/api/mo/jobs", { method: "POST", json: body }),
    updateJob: (id: number, body: Record<string, unknown>) =>
      request<Job>(`/api/mo/jobs/${id}`, { method: "PATCH", json: body }),
    transitionJob: (id: number, to: string) =>
      request<Job>(`/api/mo/jobs/${id}/transition`, { method: "POST", json: { to } }),
    closeJob: (id: number) =>
      request<Job>(`/api/mo/jobs/${id}/close`, { method: "POST" }),
    applicants: (jobId: number, params?: { sort?: string; status?: string }) => {
      const sp = new URLSearchParams();
      if (params?.sort) sp.set("sort", params.sort);
      if (params?.status) sp.set("status", params.status);
      const q = sp.toString();
      return request<Application[]>(`/api/mo/jobs/${jobId}/applications${q ? `?${q}` : ""}`);
    },
    batchDecide: (jobId: number, application_ids: number[], status: "interviewing" | "accepted" | "rejected") =>
      request<{ updated: number; errors: string[] }>(`/api/mo/jobs/${jobId}/applications/batch`, {
        method: "POST",
        json: { application_ids, status },
      }),
    saveEvaluation: (applicationId: number, body: Record<string, unknown>) =>
      request<Record<string, unknown>>(`/api/mo/applications/${applicationId}/evaluation`, {
        method: "POST",
        json: body,
      }),
    decide: (applicationId: number, status: "interviewing" | "accepted" | "rejected") =>
      request<Application & { warnings?: string[] }>(`/api/mo/applications/${applicationId}`, {
        method: "PATCH",
        json: { status },
      }),
    exportCsvUrl: (jobId: number) => `/api/mo/jobs/${jobId}/export.csv`,
    applicantCvDownloadUrl: (applicationId: number) => `/api/mo/applications/${applicationId}/cv`,
  },
  admin: {
    dashboard: () => request<Record<string, unknown>>("/api/admin/dashboard"),
    settings: () => request<AppSettings>("/api/admin/settings"),
    patchSettings: (body: Record<string, unknown>) =>
      request<AppSettings>("/api/admin/settings", { method: "PATCH", json: body }),
    createUser: (body: {
      email: string;
      password: string;
      role: UserRole;
      display_name?: string;
      student_id?: string;
    }) => request<User>("/api/admin/users", { method: "POST", json: body }),
    workload: (maxHours?: number) => {
      const q = maxHours != null ? `?max_hours=${maxHours}` : "";
      return request<WorkloadRow[]>(`/api/admin/workload${q}`);
    },
    exportWorkloadUrl: () => "/api/admin/workload/export.csv",
    activityLogs: (params?: {
      skip?: number;
      limit?: number;
      actor_user_id?: number;
      action?: string;
      from?: string;
      to?: string;
      entity_type?: string;
    }) => {
      const sp = new URLSearchParams();
      if (params?.skip != null) sp.set("skip", String(params.skip));
      if (params?.limit != null) sp.set("limit", String(params.limit));
      if (params?.actor_user_id != null) sp.set("actor_user_id", String(params.actor_user_id));
      if (params?.action) sp.set("action", params.action);
      if (params?.from) sp.set("from", params.from);
      if (params?.to) sp.set("to", params.to);
      if (params?.entity_type) sp.set("entity_type", params.entity_type);
      const q = sp.toString();
      return request<ActivityLog[]>(`/api/admin/activity-logs${q ? `?${q}` : ""}`);
    },
    exportActivityLogsUrl: (params?: {
      actor_user_id?: number;
      action?: string;
      from?: string;
      to?: string;
      entity_type?: string;
    }) => {
      const sp = new URLSearchParams();
      if (params?.actor_user_id != null) sp.set("actor_user_id", String(params.actor_user_id));
      if (params?.action) sp.set("action", params.action);
      if (params?.from) sp.set("from", params.from);
      if (params?.to) sp.set("to", params.to);
      if (params?.entity_type) sp.set("entity_type", params.entity_type);
      const q = sp.toString();
      return `/api/admin/activity-logs/export.csv${q ? `?${q}` : ""}`;
    },
  },
};

export async function downloadWithAuth(url: string, filename: string): Promise<void> {
  const token = getToken();
  const res = await fetch(apiUrl(url), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let detail = "下载失败";
    try {
      const j = await res.json();
      if (j.detail) detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch {
      detail = res.statusText || detail;
    }
    handleUnauthorizedRedirect(url, res.status, Boolean(token));
    throw new Error(detail);
  }
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
