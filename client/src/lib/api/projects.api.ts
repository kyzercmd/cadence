import { apiClient } from "./client";
import type { Project } from "./types";
import { formatDateForApi } from "../utils";

function formatProjectPayload(body: Partial<Project>): Record<string, any> {
  return {
    ...body,
    startDate: formatDateForApi(body.startDate),
    deadline: formatDateForApi(body.deadline),
    memberIds: body.memberIds ?? [],
    status: body.status ?? "active",
  };
}

export const projectsApi = {
  list: () => apiClient.get<Project[]>("/api/projects"),
  get: (id: string) => apiClient.get<Project>(`/api/projects/${id}`),
  create: (body: Partial<Project>) => apiClient.post<Project>("/api/projects", formatProjectPayload(body)),
  update: (id: string, body: Partial<Project>) =>
    apiClient.put<Project>(`/api/projects/${id}`, formatProjectPayload(body)),
  remove: (id: string) => apiClient.delete<void>(`/api/projects/${id}`),
};
