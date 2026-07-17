import { apiClient } from "./client";
import type { AttendanceEntry, EmployeeLatestAttendance } from "./types";

export const attendanceApi = {
  /** GET /api/attendance/me — today's clock-in/out status for the logged-in user */
  today: () => apiClient.get<AttendanceEntry>("/api/attendance/me"),

  /** GET /api/attendance/history — personal attendance history for the logged-in user */
  myHistory: () => apiClient.get<AttendanceEntry[]>("/api/attendance/history"),

  /** GET /api/attendance/{targetId}/history — an employee's history (HR/Admin only) */
  employeeHistory: (targetId: string) =>
    apiClient.get<AttendanceEntry[]>(`/api/attendance/${targetId}/history`),

  /** GET /api/attendance/employees — latest attendance for all employees (HR/Admin only) */
  teamHistory: () => apiClient.get<EmployeeLatestAttendance[]>("/api/attendance/employees"),

  /** POST /api/attendance/clock-in */
  clockIn: () => apiClient.post<AttendanceEntry>("/api/attendance/clock-in"),

  /** POST /api/attendance/clock-out */
  clockOut: () => apiClient.post<AttendanceEntry>("/api/attendance/clock-out"),
};
