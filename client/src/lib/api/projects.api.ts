import { apiClient } from "./client";
import type { Project } from "./types";

export const projectsApi = {
  list: () => apiClient.get<Project[]>("/api/projects"),
  get: (id: string) => apiClient.get<Project>(`/api/projects/${id}`),
  create: (body: Partial<Project>) => apiClient.post<Project>("/api/projects", body),
  update: (id: string, body: Partial<Project>) =>
    apiClient.patch<Project>(`/api/projects/${id}`, body),
  remove: (id: string) => apiClient.delete<void>(`/api/projects/${id}`),
};
