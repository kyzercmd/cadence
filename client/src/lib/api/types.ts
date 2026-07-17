// Shared DTOs for the CRM API. Keep this file framework-agnostic so the
// same types work against the mock adapter and a future real backend.

export type Role = "admin" | "hr" | "employee";
export type Level = "Junior" | "Middle" | "Senior";
export type Gender = "Male" | "Female";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: Role;
  position: string;
  level: Level;
  gender?: Gender;
  birthday?: string; // ISO
  company?: string;
  location?: string;
  mobile?: string;
  skype?: string;
  active: boolean;
}

export interface UserListResponse {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: Role;
  position: string;
  level: Level;
  active: boolean;
}

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type Priority = "low" | "medium" | "high";

export interface Project {
  id: string;
  code: string; // PN0001245
  name: string;
  description: string;
  status: "active" | "completed" | string;
  priority: Priority;
  leadId?: string;
  memberIds: string[];
  createdAt: string;
  iconColor?: string;
  startDate?: string;
  deadline?: string;
  imageUrl?: string;
}

export interface Assignee {
  id: string;
  name: string;
  avatarUrl?: string;
  avatar_url?: string;
  position?: string;
  spentHours?: number;
}

export interface Task {
  id: string;
  projectId?: string;
  projectName?: string;
  name: string;
  taskName?: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assigneeIds?: string[];
  assignees?: Assignee[];
  estimateHours: number;
  spentHours?: number;
  totalSpentHours?: number;
  timeByUser?: Record<string, number>;
  dueDate?: string;
  createdAt?: string;
  attachments?: string[]; // data URLs / filenames
  links?: string[];
}

export interface AttendanceEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  clockIn?: string; // ISO datetime
  clockOut?: string;
  totalMinutes: number;
}

export interface EmployeeLatestAttendance {
  userId: string;
  name: string;
  avatar_url: string;
  role: Role;
  position: string;
  lastUpdate?: string;
  totalMinutes?: number;
}

export type LeaveType = "vacation" | "sick" | "remote";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: string;
  userId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  reviewerId?: string;
  reviewerComment?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface AuthSession {
  token: string;
  refreshToken: string;
  user: User;
}
