import { apiClient } from "./client";
import type { Level, User } from "./types";

export interface ListUsersParams {
  q?: string;
  level?: Level;
}

export const usersApi = {
  list: (params?: ListUsersParams) =>
    apiClient.get<User[]>("/api/users", params as Record<string, unknown> | undefined),
  get: (id: string) => apiClient.get<User>(`/api/users/${id}`),
  me: () => apiClient.get<User>("/api/users/me"),
  updateSelf: (body: Partial<User>) => apiClient.patch<User>("/api/users/me", body),
  create: (body: Partial<User>) => apiClient.post<User>("/api/admin/employee", body),
  update: (id: string, body: Partial<User>) => apiClient.patch<User>(`/api/users/${id}`, body),
  adminUpdate: (id: string, body: Partial<User>) =>
    apiClient.patch<User>(`/api/admin/users/${id}`, body),
  deactivate: (id: string) =>
    apiClient.patch<User>(`/api/admin/users/${id}`, { active: false } as Partial<User>),
};
