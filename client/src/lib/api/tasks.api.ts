import { apiClient } from "./client";
import type { Task, TaskStatus } from "./types";

export const tasksApi = {
  list: (projectId?: string) =>
    projectId
      ? apiClient.get<Task[]>(`/api/projects/${projectId}/tasks`)
      : apiClient.get<Task[]>("/api/users/me/tasks"),
  mine: () => apiClient.get<Task[]>("/api/users/me/tasks"),
  get: (id: string) => apiClient.get<Task>(`/api/tasks/${id}`),
  create: (body: Partial<Task>) => {
    if (!body.projectId) throw new Error("projectId is required to create a task");
    return apiClient.post<Task>(`/api/projects/${body.projectId}/tasks`, body);
  },
  update: (id: string, body: Partial<Task>) => apiClient.put<Task>(`/api/tasks/${id}`, body),
  moveStatus: (id: string, status: TaskStatus) =>
    apiClient.patch<Task>(`/api/tasks/${id}/status`, { status }),
  /** Set the time logged by a single user (replaces their prior entry). */
  logTime: (id: string, userId: string, hours: number) =>
    apiClient.patch<Task>(`/api/tasks/${id}/time`, { userId, hours }),
  remove: (id: string) => apiClient.delete<void>(`/api/tasks/${id}`),
};
