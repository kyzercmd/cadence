import { apiClient } from "./client";
import type { AttendanceEntry } from "./types";

export const attendanceApi = {
  myHistory: (userId?: string) =>
    userId
      ? apiClient.get<AttendanceEntry[]>(`/api/attendance/${userId}/history`)
      : apiClient.get<AttendanceEntry[]>("/api/attendance/history"),
  teamHistory: () => apiClient.get<AttendanceEntry[]>("/api/attendance/employees"),
  today: () => apiClient.get<AttendanceEntry>("/api/attendance/me"),
  clockIn: () => apiClient.post<AttendanceEntry>("/api/attendance/clock-in"),
  clockOut: () => apiClient.post<AttendanceEntry>("/api/attendance/clock-out"),
};
