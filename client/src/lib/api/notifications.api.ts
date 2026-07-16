import { apiClient } from "./client";
import type { Notification } from "./types";

export const notificationsApi = {
  list: () => apiClient.get<Notification[]>("/api/notifications"),
  markRead: (id: string) => apiClient.patch<void>(`/api/notifications/${id}/read`),
  markAllRead: () => apiClient.patch<void>("/api/notifications/read-all"),
};
