// Mock request router. Each branch maps to a future REST endpoint.
// Replace this file with a real backend by setting VITE_API_BASE_URL.

import type { ApiRequest } from "../client";
import type {
  AttendanceEntry,
  AuthSession,
  LeaveRequest,
  LeaveStatus,
  Notification,
  Project,
  Task,
  TaskStatus,
  User,
} from "../types";
import { db } from "./store";

let nextId = 10_000;
const id = (prefix: string) => `${prefix}_${++nextId}`;

function currentUser(token: string | null): User {
  // tokens look like "mock-token-<userId>"
  const uid = token?.startsWith("mock-token-") ? token.slice("mock-token-".length) : "u_me";
  return db.users.find((u) => u.id === uid) ?? db.users[0];
}

function ok<T>(value: T): T {
  // return a structured clone so callers can mutate freely
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Translate the real backend routes the API modules call into the legacy
 * mock paths this handler was originally written against. Keeps the mock
 * usable without duplicating every branch.
 */
function normalizeRequest(req: ApiRequest, meId: string): ApiRequest {
  let { method, path, body, query } = req;
  if (path.startsWith("/api/")) path = path.slice(4);

  // Users
  if (path === "/users/me" && method === "GET") return { method: "GET", path: "/auth/me" };
  if (path === "/users/me" && method === "PATCH") return { method: "PATCH", path: `/users/${meId}`, body };
  if (path === "/admin/employee" && method === "POST") return { method: "POST", path: "/users", body };
  const adminUsr = path.match(/^\/admin\/users\/(.+)$/);
  if (adminUsr) return { method, path: `/users/${adminUsr[1]}`, body };

  // Attendance
  if (path === "/attendance/history" && method === "GET")
    return { method: "GET", path: "/attendance", query: { userId: meId } };
  if (path === "/attendance/employees" && method === "GET")
    return { method: "GET", path: "/attendance/all" };
  if (path === "/attendance/me" && method === "GET")
    return { method: "GET", path: "/attendance", query: { userId: meId } };
  const attHist = path.match(/^\/attendance\/(.+)\/history$/);
  if (attHist) return { method: "GET", path: "/attendance", query: { userId: attHist[1] } };

  // Leave
  if (path === "/leave/me" && method === "GET") return { method, path: "/leave", query: { userId: meId } };
  if (path === "/leave/pending" && method === "GET") return { method, path: "/leave", query: { status: "pending" } };
  if (path === "/leave/all" && method === "GET") return { method, path: "/leave" };
  const leaveReview = path.match(/^\/leave\/(.+)\/review$/);
  if (leaveReview && method === "PATCH") {
    const b = (body ?? {}) as { status?: string; comment?: string };
    const action = b.status === "rejected" ? "reject" : "approve";
    return { method: "POST", path: `/leave/${leaveReview[1]}/${action}`, body: { comment: b.comment } };
  }

  // Tasks
  const projTasks = path.match(/^\/projects\/(.+)\/tasks$/);
  if (projTasks && method === "GET") return { method, path: "/tasks", query: { projectId: projTasks[1] } };
  if (projTasks && method === "POST")
    return { method: "POST", path: "/tasks", body: { ...(body as object), projectId: projTasks[1] } };
  if (path === "/users/me/tasks" && method === "GET") return { method: "GET", path: "/tasks" };
  const taskStatus = path.match(/^\/tasks\/(.+)\/status$/);
  if (taskStatus && method === "PATCH") return { method: "PATCH", path: `/tasks/${taskStatus[1]}`, body };
  const taskTime = path.match(/^\/tasks\/(.+)\/time$/);
  if (taskTime && method === "PATCH") return { method: "POST", path: `/tasks/${taskTime[1]}/log-time`, body };
  const taskPut = path.match(/^\/tasks\/(.+)$/);
  if (taskPut && method === "PUT") return { method: "PATCH", path, body };

  // Notifications
  const notifRead = path.match(/^\/notifications\/(.+)\/read$/);
  if (notifRead && method === "PATCH") return { method: "POST", path: "/notifications/mark-all-read" };
  if (path === "/notifications/read-all" && method === "PATCH")
    return { method: "POST", path: "/notifications/mark-all-read" };

  return { method, path, body, query };
}

export function mockHandle<T>(req: ApiRequest, token: string | null): T {
  const me = currentUser(token);
  const norm = normalizeRequest(req, me.id);
  const { method, path, body, query } = norm;

  // -------- AUTH --------
  if (method === "POST" && path === "/auth/login") {
    const b = body as { email: string; password: string };
    const user = db.users.find((u) => u.email.toLowerCase() === b.email.toLowerCase());
    if (!user) throw new Error("No account with that email");
    const expected = db.passwords[user.email.toLowerCase()];
    if (expected && expected !== b.password) {
      throw new Error("Incorrect password");
    }
    const session: AuthSession = {
      token: `mock-token-${user.id}`,
      refreshToken: `mock-refresh-${user.id}`,
      user: ok(user),
    };
    return session as T;
  }
  if (method === "POST" && path === "/auth/logout") return undefined as T;
  if (method === "GET" && path === "/auth/me") return ok(me) as T;
  if (method === "POST" && path === "/auth/refresh") {
    return { token: `mock-token-${me.id}`, refreshToken: `mock-refresh-${me.id}`, user: ok(me) } as T;
  }

  // -------- USERS --------
  if (method === "GET" && path === "/users") {
    const q = (query?.q as string | undefined)?.toLowerCase();
    const level = query?.level as string | undefined;
    let list = db.users.filter((u) => u.active);
    if (q) list = list.filter((u) => u.name.toLowerCase().includes(q) || u.position.toLowerCase().includes(q));
    if (level) list = list.filter((u) => u.level === level);
    return ok(list) as T;
  }
  const userMatch = path.match(/^\/users\/(.+)$/);
  if (userMatch) {
    const uid = userMatch[1];
    const user = db.users.find((u) => u.id === uid);
    if (!user) throw new Error("User not found");
    if (method === "GET") return ok(user) as T;
    if (method === "PATCH") {
      const patch = body as Partial<User> & { password?: string };
      if (patch.password) {
        db.passwords[(patch.email ?? user.email).toLowerCase()] = patch.password;
      }
      const { password: _pw, ...rest } = patch;
      Object.assign(user, rest);
      return ok(user) as T;
    }
    if (method === "DELETE") {
      user.active = false;
      return ok(user) as T;
    }
  }
  if (method === "POST" && path === "/users") {
    const b = body as Partial<User> & { password?: string };
    const u: User = {
      id: id("u"),
      name: b.name ?? "New Employee",
      email: b.email ?? `new${nextId}@cadence.io`,
      avatarUrl: b.avatarUrl ?? `https://i.pravatar.cc/120?u=${nextId}`,
      role: b.role ?? "employee",
      position: b.position ?? "Employee",
      level: b.level ?? "Junior",
      gender: b.gender ?? "Male",
      birthday: b.birthday ?? "1995-01-01",
      company: "Cadence",
      location: b.location ?? "NYC, New York, USA",
      mobile: b.mobile ?? "",
      skype: b.skype ?? "",
      active: true,
    };
    db.users.push(u);
    if (b.password) db.passwords[u.email.toLowerCase()] = b.password;
    return ok(u) as T;
  }

  // -------- PROJECTS --------
  if (method === "GET" && path === "/projects") return ok(db.projects) as T;
  const projMatch = path.match(/^\/projects\/(.+)$/);
  if (projMatch) {
    const pid = projMatch[1];
    const proj = db.projects.find((p) => p.id === pid);
    if (!proj) throw new Error("Project not found");
    if (method === "GET") return ok(proj) as T;
    if (method === "PATCH") {
      Object.assign(proj, body as Partial<Project>);
      return ok(proj) as T;
    }
    if (method === "DELETE") {
      const idx = db.projects.findIndex((p) => p.id === pid);
      if (idx >= 0) db.projects.splice(idx, 1);
      for (let i = db.tasks.length - 1; i >= 0; i--) {
        if (db.tasks[i].projectId === pid) db.tasks.splice(i, 1);
      }
      return undefined as T;
    }
  }
  if (method === "POST" && path === "/projects") {
    const b = body as Partial<Project>;
    const p: Project = {
      id: id("p"),
      code: b.code && b.code.trim()
        ? b.code.trim()
        : `PN${String(Math.floor(Math.random() * 9_000_000) + 1_000_000)}`,
      name: b.name ?? "New Project",
      description: b.description ?? "",
      status: "active",
      priority: b.priority ?? "medium",
      leadId: b.leadId ?? me.id,
      memberIds: b.memberIds ?? [me.id],
      createdAt: new Date().toISOString(),
      iconColor: b.iconColor ?? "primary",
      startDate: b.startDate,
      deadline: b.deadline,
      imageUrl: b.imageUrl,
    };
    db.projects.push(p);
    return ok(p) as T;
  }

  // -------- TASKS --------
  if (method === "GET" && path === "/tasks") {
    const pid = query?.projectId as string | undefined;
    const list = pid ? db.tasks.filter((t) => t.projectId === pid) : db.tasks;
    return ok(list) as T;
  }
  const taskMatch = path.match(/^\/tasks\/(.+)$/);
  if (taskMatch) {
    const tid = taskMatch[1];
    const t = db.tasks.find((x) => x.id === tid);
    if (!t) throw new Error("Task not found");
    if (method === "GET") return ok(t) as T;
    if (method === "PATCH") {
      Object.assign(t, body as Partial<Task>);
      return ok(t) as T;
    }
    if (method === "DELETE") {
      db.tasks.splice(db.tasks.indexOf(t), 1);
      return undefined as T;
    }
  }
  // log-time: per-user time entry
  const logTimeMatch = path.match(/^\/tasks\/(.+)\/log-time$/);
  if (logTimeMatch && method === "POST") {
    const t = db.tasks.find((x) => x.id === logTimeMatch[1]);
    if (!t) throw new Error("Task not found");
    const b = body as { userId: string; hours: number };
    t.timeByUser = { ...(t.timeByUser ?? {}), [b.userId]: Math.max(0, b.hours) };
    t.spentHours = Object.values(t.timeByUser).reduce((a, v) => a + v, 0);
    return ok(t) as T;
  }
  if (method === "POST" && path === "/tasks") {
    const b = body as Partial<Task>;
    const t: Task = {
      id: id("t"),
      projectId: b.projectId!,
      name: b.name ?? "New Task",
      description: b.description,
      status: (b.status as TaskStatus) ?? "todo",
      priority: b.priority ?? "medium",
      assigneeIds: b.assigneeIds ?? [],
      estimateHours: b.estimateHours ?? 2,
      spentHours: 0,
      timeByUser: {},
      dueDate: b.dueDate,
      attachments: b.attachments,
      links: b.links,
      createdAt: new Date().toISOString(),
    };
    db.tasks.push(t);
    return ok(t) as T;
  }

  // -------- ATTENDANCE --------
  if (method === "GET" && path === "/attendance") {
    const uid = (query?.userId as string | undefined) ?? me.id;
    return ok(db.attendance.filter((a) => a.userId === uid)) as T;
  }
  if (method === "GET" && path === "/attendance/all") {
    return ok(db.attendance) as T;
  }
  if (method === "POST" && path === "/attendance/clock-in") {
    const today = new Date().toISOString().slice(0, 10);
    let entry = db.attendance.find((a) => a.userId === me.id && a.date === today);
    if (!entry) {
      entry = {
        id: id("a"),
        userId: me.id,
        date: today,
        clockIn: new Date().toISOString(),
        totalMinutes: 0,
      };
      db.attendance.unshift(entry);
    } else if (!entry.clockIn) {
      entry.clockIn = new Date().toISOString();
    }
    return ok(entry) as T;
  }
  if (method === "POST" && path === "/attendance/clock-out") {
    const today = new Date().toISOString().slice(0, 10);
    const entry = db.attendance.find((a) => a.userId === me.id && a.date === today);
    if (entry?.clockIn) {
      entry.clockOut = new Date().toISOString();
      entry.totalMinutes = Math.max(
        0,
        Math.round((new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / 60000),
      );
    }
    return ok(entry as AttendanceEntry) as T;
  }
  const attMatch = path.match(/^\/attendance\/(.+)$/);
  if (attMatch && method === "PATCH") {
    const entry = db.attendance.find((a) => a.id === attMatch[1]);
    if (!entry) throw new Error("Attendance not found");
    Object.assign(entry, body as Partial<AttendanceEntry>);
    return ok(entry) as T;
  }

  // -------- LEAVE --------
  if (method === "GET" && path === "/leave") {
    const uid = query?.userId as string | undefined;
    const status = query?.status as LeaveStatus | undefined;
    let list = db.leaveRequests;
    if (uid) list = list.filter((l) => l.userId === uid);
    if (status) list = list.filter((l) => l.status === status);
    return ok(list) as T;
  }
  if (method === "POST" && path === "/leave") {
    const b = body as Partial<LeaveRequest>;
    const l: LeaveRequest = {
      id: id("l"),
      userId: me.id,
      type: b.type ?? "vacation",
      startDate: b.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: b.endDate ?? new Date().toISOString().slice(0, 10),
      reason: b.reason ?? "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    db.leaveRequests.unshift(l);
    db.notifications.unshift({
      id: id("n"),
      userId: me.id,
      title: "Leave request submitted",
      body: `${me.name} submitted a ${l.type} request.`,
      createdAt: new Date().toISOString(),
      read: false,
    });
    return ok(l) as T;
  }
  const leaveMatch = path.match(/^\/leave\/(.+)\/(approve|reject)$/);
  if (leaveMatch && method === "POST") {
    const l = db.leaveRequests.find((x) => x.id === leaveMatch[1]);
    if (!l) throw new Error("Leave not found");
    l.status = leaveMatch[2] === "approve" ? "approved" : "rejected";
    l.reviewerId = me.id;
    l.reviewerComment = (body as { comment?: string } | undefined)?.comment;
    db.notifications.unshift({
      id: id("n"),
      userId: l.userId,
      title: `Leave ${l.status}`,
      body: `Your ${l.type} request was ${l.status}.`,
      createdAt: new Date().toISOString(),
      read: false,
    });
    return ok(l) as T;
  }

  // -------- NOTIFICATIONS --------
  if (method === "GET" && path === "/notifications") {
    return ok(db.notifications.filter((n) => n.userId === me.id)) as T;
  }
  if (method === "POST" && path === "/notifications/mark-all-read") {
    db.notifications.forEach((n) => {
      if (n.userId === me.id) n.read = true;
    });
    return undefined as T;
  }

  // -------- SEARCH --------
  if (method === "GET" && path === "/search") {
    const q = ((query?.q as string | undefined) ?? "").trim().toLowerCase();
    if (!q) return ok([]) as T;
    const results: Array<{ id: string; title: string; subtitle: string; type: string; url: string }> = [];
    const seen = new Set<string>();
    const push = (r: { id: string; title: string; subtitle: string; type: string; url: string }) => {
      const key = `${r.type}:${r.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      results.push(r);
    };
    let uc = 0;
    for (const u of db.users) {
      if (uc >= 5) break;
      if (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) {
        push({ id: u.id, title: u.name, subtitle: u.email, type: "user", url: `/employees/${u.id}` });
        uc++;
      }
    }
    let tc = 0;
    for (const t of db.tasks) {
      if (tc >= 5) break;
      if (t.name.toLowerCase().includes(q)) {
        push({ id: t.id, title: t.name, subtitle: String(t.status), type: "task", url: `/projects/${t.projectId}` });
        tc++;
      }
    }
    let pc = 0;
    for (const p of db.projects) {
      if (pc >= 5) break;
      if (p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)) {
        push({ id: p.id, title: p.name, subtitle: p.status, type: "project", url: `/projects/${p.id}` });
        pc++;
      }
    }
    return ok(results) as T;
  }

  throw new Error(`Mock route not handled: ${method} ${path}`);
}

// helper export for stats
export function statsFor(userId: string): { activeProjects: number; vacationDaysUsed: number } {
  const activeProjects = db.projects.filter(
    (p) => p.memberIds.includes(userId) && p.status === "active",
  ).length;
  const vacationDaysUsed = db.leaveRequests
    .filter((l) => l.userId === userId && l.status === "approved" && l.type === "vacation")
    .reduce((sum, l) => {
      const days =
        (new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) /
          (1000 * 60 * 60 * 24) +
        1;
      return sum + Math.max(1, Math.round(days));
    }, 0);
  return { activeProjects, vacationDaysUsed };
}
