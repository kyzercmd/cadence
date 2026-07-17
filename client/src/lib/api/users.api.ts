import { apiClient } from "./client";
import type { Level, User } from "./types";

export interface ListUsersParams {
  q?: string;
  level?: Level;
}

import { formatDateForApi } from "../utils";

function formatUserPayload(body: Partial<User> & { password?: string }): Record<string, any> {
  const payload: Record<string, any> = {
    ...body,
    birthday: formatDateForApi(body.birthday),
  };
  if (!payload.password || (typeof payload.password === "string" && !payload.password.trim())) {
    delete payload.password;
  }
  return payload;
}

export const usersApi = {
  list: (params?: ListUsersParams) =>
    apiClient.get<User[]>("/api/users", params as Record<string, unknown> | undefined),
  get: (id: string) => apiClient.get<User>(`/api/users/${id}`),
  me: () => apiClient.get<User>("/api/users/me"),
  updateSelf: (body: Partial<User>) => apiClient.patch<User>("/api/users/me", formatUserPayload(body)),
  create: (body: Partial<User>) => apiClient.post<User>("/api/admin/employee", formatUserPayload(body)),
  update: (id: string, body: Partial<User>) => apiClient.patch<User>(`/api/users/${id}`, formatUserPayload(body)),
  adminUpdate: (id: string, body: Partial<User>) =>
    apiClient.patch<User>(`/api/admin/users/${id}`, formatUserPayload(body)),
  deactivate: (id: string) =>
    apiClient.patch<User>(`/api/admin/users/${id}`, { active: false } as Partial<User>),
};
