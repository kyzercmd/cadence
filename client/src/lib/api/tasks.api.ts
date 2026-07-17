import { apiClient } from "./client";
import type { Task, TaskStatus } from "./types";

import { formatDateForApi } from "../utils";

function formatTaskPayload(body: Partial<Task>): Record<string, any> {
  return {
    ...body,
    dueDate: formatDateForApi(body.dueDate),
    assigneeIds: body.assigneeIds ?? (body.assignees ? body.assignees.map((a: any) => typeof a === "string" ? a : a.id) : []),
    attachments: body.attachments ?? [],
    links: body.links ?? [],
  };
}

function getAuthUserId(): string | undefined {
  try {
    const u = JSON.parse(localStorage.getItem("crm_user") || "{}");
    return u?.id;
  } catch {
    return undefined;
  }
}

function normalizeTask(raw: any, projectId?: string): Task {
  if (!raw) return raw;
  const assignees = (raw.assignees || []).map((a: any) =>
    typeof a === "string"
      ? { id: a, name: "Assigned" }
      : {
          ...a,
          id: a.id,
          name: a.name || "Assigned",
          avatarUrl: a.avatarUrl || a.avatar_url,
          position: a.position,
          spentHours: Number(a.spentHours ?? a.spent_hours ?? a.hours ?? a.totalSpentHours ?? a.total_spent_hours ?? 0),
        }
  );
  const authUserId = getAuthUserId();
  const assigneeIds = raw.assigneeIds || (assignees.length > 0 ? assignees.map((a: any) => a.id) : (authUserId && (raw.taskName || raw.projectName) ? [authUserId] : []));
  const spentHours = raw.spentHours ?? raw.totalSpentHours ?? 0;
  return {
    ...raw,
    name: raw.name || raw.taskName || "",
    projectId: raw.projectId || raw.project_id || projectId,
    projectName: raw.projectName || raw.project_name || "",
    assignees,
    assigneeIds,
    spentHours,
    totalSpentHours: spentHours,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

export const tasksApi = {
  list: async (projectId?: string): Promise<Task[]> => {
    const data = projectId
      ? await apiClient.get<any[]>(`/api/projects/${projectId}/tasks`)
      : await apiClient.get<any[]>("/api/users/me/tasks");
    return (data || []).map((t) => normalizeTask(t, projectId));
  },
  mine: async (): Promise<Task[]> => {
    const data = await apiClient.get<any[]>("/api/users/me/tasks");
    return (data || []).map((t) => normalizeTask(t));
  },
  get: async (id: string): Promise<Task> => {
    const data = await apiClient.get<any>(`/api/tasks/${id}`);
    return normalizeTask(data);
  },
  create: async (body: Partial<Task>): Promise<Task> => {
    if (!body.projectId) throw new Error("projectId is required to create a task");
    const data = await apiClient.post<any>(`/api/projects/${body.projectId}/tasks`, formatTaskPayload(body));
    return normalizeTask(data);
  },
  update: async (id: string, body: Partial<Task>): Promise<Task> => {
    const data = await apiClient.put<any>(`/api/tasks/${id}`, formatTaskPayload(body));
    return normalizeTask(data);
  },
  moveStatus: async (id: string, status: TaskStatus): Promise<Task> => {
    const data = await apiClient.patch<any>(`/api/tasks/${id}/status`, { status });
    return normalizeTask(data);
  },
  /** Set the time logged by a single user (replaces their prior entry). */
  logTime: async (id: string, userId: string, hours: number): Promise<Task> => {
    const data = await apiClient.patch<any>(`/api/tasks/${id}/time`, { hours });
    return normalizeTask(data);
  },
  remove: (id: string) => apiClient.delete<void>(`/api/tasks/${id}`),
};
