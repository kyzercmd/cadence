import { apiClient } from "./client";
import type { LeaveRequest, LeaveStatus } from "./types";

export const leaveApi = {
  list: (params?: { userId?: string; status?: LeaveStatus; scope?: "me" | "pending" | "all" }) => {
    if (params?.scope === "me" || params?.userId === "me") {
      return apiClient.get<LeaveRequest[]>("/api/leave/me");
    }
    if (params?.status === "pending" || params?.scope === "pending") {
      return apiClient.get<LeaveRequest[]>("/api/leave/pending");
    }
    return apiClient.get<LeaveRequest[]>("/api/leave/all");
  },
  mine: () => apiClient.get<LeaveRequest[]>("/api/leave/me"),
  pending: () => apiClient.get<LeaveRequest[]>("/api/leave/pending"),
  all: () => apiClient.get<LeaveRequest[]>("/api/leave/all"),
  submit: (body: Partial<LeaveRequest>) => apiClient.post<LeaveRequest>("/api/leave", body),
  approve: (id: string, comment?: string) =>
    apiClient.patch<LeaveRequest>(`/api/leave/${id}/review`, { status: "approved", comment }),
  reject: (id: string, comment?: string) =>
    apiClient.patch<LeaveRequest>(`/api/leave/${id}/review`, { status: "rejected", comment }),
};
