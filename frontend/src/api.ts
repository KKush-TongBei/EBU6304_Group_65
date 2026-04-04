import type {
  ActivityLog,
  Application,
  Job,
  Notification,
  User,
  UserRole,
  WorkloadRow,
} from "./types";

const TOKEN_KEY = "ta_recruit_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
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

  const res = await fetch(path, {
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
      role: UserRole;
      display_name?: string;
      student_id?: string;
    }) =>
      request<{ access_token: string }>("/api/auth/register", {
        method: "POST",
        json: body,
      }),
    me: () => request<User>("/api/auth/me"),
  },
  jobs: {
    list: (params: { q?: string; skill?: string; status?: string }) => {
      const sp = new URLSearchParams();
      if (params.q) sp.set("q", params.q);
      if (params.skill) sp.set("skill", params.skill);
      if (params.status) sp.set("status", params.status);
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
    profile: () => request<User>("/api/ta/profile"),
    updateProfile: (body: Record<string, string | undefined>) =>
      request<User>("/api/ta/profile", { method: "PATCH", json: body }),
    myApplications: () => request<Application[]>("/api/ta/applications"),
  },
  notifications: {
    list: () => request<Notification[]>("/api/notifications"),
    markRead: (ids?: number[]) =>
      request<{ ok: boolean }>("/api/notifications/mark-read", {
        method: "POST",
        json: { notification_ids: ids ?? null },
      }),
  },
  mo: {
    myJobs: () => request<Job[]>("/api/mo/jobs"),
    createJob: (body: {
      module_name: string;
      requirements?: string;
      deadline?: string;
      skill_tags?: string;
      assigned_hours?: number;
    }) => request<Job>("/api/mo/jobs", { method: "POST", json: body }),
    updateJob: (id: number, body: Record<string, unknown>) =>
      request<Job>(`/api/mo/jobs/${id}`, { method: "PATCH", json: body }),
    closeJob: (id: number) =>
      request<Job>(`/api/mo/jobs/${id}/close`, { method: "POST" }),
    applicants: (jobId: number) =>
      request<Application[]>(`/api/mo/jobs/${jobId}/applications`),
    decide: (applicationId: number, status: "accepted" | "rejected") =>
      request<Application>(`/api/mo/applications/${applicationId}`, {
        method: "PATCH",
        json: { status },
      }),
    exportCsvUrl: (jobId: number) => `/api/mo/jobs/${jobId}/export.csv`,
  },
  admin: {
    workload: (maxHours?: number) => {
      const q = maxHours != null ? `?max_hours=${maxHours}` : "";
      return request<WorkloadRow[]>(`/api/admin/workload${q}`);
    },
    exportWorkloadUrl: () => "/api/admin/workload/export.csv",
    activityLogs: (skip = 0, limit = 100) =>
      request<ActivityLog[]>(`/api/admin/activity-logs?skip=${skip}&limit=${limit}`),
  },
};

export function downloadWithAuth(url: string, filename: string) {
  const token = getToken();
  fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    .then((r) => {
      if (!r.ok) throw new Error("Download failed");
      return r.blob();
    })
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch(() => alert("导出失败"));
}
