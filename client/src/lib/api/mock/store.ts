// In-memory mock data store. Seeded with realistic data so screens look
// good on first load. Includes three fixed demo accounts (admin, HR,
// employee) plus extra users.

import type {
  AttendanceEntry,
  LeaveRequest,
  Notification,
  Project,
  Task,
  User,
} from "../types";

const FIRST_NAMES_M = ["Evan", "James", "Thomas", "Liam", "Noah", "Oliver", "Ethan", "Lucas", "Henry", "Mason", "Logan", "Jacob", "Jack", "Daniel"];
const FIRST_NAMES_F = ["Lenora", "Winnie", "Emily", "Sallie", "Kathryn", "Ava", "Mia", "Sophia", "Isabella", "Charlotte", "Amelia", "Harper", "Evelyn", "Abigail"];
const LAST_NAMES = ["Yates", "Fowler", "McGuire", "Williamson", "Tyler", "Schneider", "Long", "Guerrero", "Parker", "Bennett", "Reed", "Cooper", "Bailey", "Murphy", "Rivera", "Cox", "Howard", "Ward", "Torres", "Peterson"];
const POSITIONS = ["UI/UX Designer", "iOS Developer", "Android Developer", "Copywriter", "Sales Manager", "Frontend Developer", "Backend Developer", "QA Engineer", "Product Manager", "DevOps Engineer"];
const LEVELS = ["Junior", "Middle", "Senior"] as const;
const LOCATIONS = ["NYC, New York, USA", "San Francisco, CA, USA", "Austin, TX, USA", "Seattle, WA, USA", "Boston, MA, USA"];

function pick<T>(arr: readonly T[], i: number): T { return arr[i % arr.length]; }
function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
const r = rng(7);

function makeBirthday(idx: number) {
  const year = 1985 + Math.floor(r() * 18);
  const month = Math.floor(r() * 12) + 1;
  const day = Math.floor(r() * 27) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ---- Three fixed demo users ----
const DEMO_USERS: User[] = [
  {
    id: "u_admin",
    name: "Alex Morgan",
    email: "admin@cadence.io",
    avatarUrl: "https://i.pravatar.cc/120?img=15",
    role: "admin",
    position: "Operations Admin",
    level: "Senior",
    gender: "Male",
    birthday: "1988-03-12",
    company: "Cadence",
    location: "NYC, New York, USA",
    mobile: "+1 675 348 23-10",
    skype: "alex.morgan",
    active: true,
  },
  {
    id: "u_hr",
    name: "Evan Yates",
    email: "hr@cadence.io",
    avatarUrl: "https://i.pravatar.cc/120?img=12",
    role: "hr",
    position: "HR Manager",
    level: "Senior",
    gender: "Male",
    birthday: "1990-05-19",
    company: "Cadence",
    location: "San Francisco, CA, USA",
    mobile: "+1 415 555 12-34",
    skype: "evan.yates",
    active: true,
  },
  {
    id: "u_employee",
    name: "Sallie Long",
    email: "employee@cadence.io",
    avatarUrl: "https://i.pravatar.cc/120?img=47",
    role: "employee",
    position: "UI/UX Designer",
    level: "Middle",
    gender: "Female",
    birthday: "1996-09-04",
    company: "Cadence",
    location: "Austin, TX, USA",
    mobile: "+1 512 555 88-22",
    skype: "sallie.long",
    active: true,
  },
];

const EXTRA_USERS: User[] = Array.from({ length: 16 }, (_, i) => {
  const gender: "Male" | "Female" = i % 2 === 0 ? "Male" : "Female";
  const first = gender === "Male" ? pick(FIRST_NAMES_M, i + 2) : pick(FIRST_NAMES_F, i + 2);
  const last = pick(LAST_NAMES, i + 3);
  const name = `${first} ${last}`;
  const role: User["role"] = i === 0 ? "hr" : "employee";
  return {
    id: `u_${i + 1}`,
    name,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@cadence.io`,
    avatarUrl: `https://i.pravatar.cc/120?img=${(i % 60) + 20}`,
    role,
    position: role === "hr" ? "HR Specialist" : pick(POSITIONS, i),
    level: LEVELS[i % 3],
    gender,
    birthday: makeBirthday(i),
    company: "Cadence",
    location: pick(LOCATIONS, i),
    mobile: `+1 ${Math.floor(200 + r() * 700)} ${Math.floor(100 + r() * 800)} ${Math.floor(10 + r() * 80)}-${Math.floor(10 + r() * 80)}`,
    skype: `${first.toLowerCase()}${Math.floor(1000 + r() * 9000)}`,
    active: true,
  };
});

export const users: User[] = [...DEMO_USERS, ...EXTRA_USERS];

// mock password store (frontend only) — empty password also works in handler
export const passwords: Record<string, string> = {
  "admin@cadence.io": "admin",
  "hr@cadence.io": "hr",
  "employee@cadence.io": "employee",
};

const hrIds = users.filter((u) => u.role === "hr").map((u) => u.id);
const employeeIds = users.filter((u) => u.role === "employee").map((u) => u.id);

const PROJECT_SEEDS: Array<Omit<Project, "id" | "createdAt" | "memberIds" | "leadId">> = [
  { code: "PN0001265", name: "Medical App (iOS native)", description: "Native iOS healthcare app for doctors and patients.", status: "active", priority: "high", iconColor: "info" },
  { code: "PN0001221", name: "Food Delivery Service", description: "Cross-platform food delivery platform.", status: "active", priority: "medium", iconColor: "warning" },
  { code: "PN0001290", name: "Internal Project", description: "Internal tooling for the design department.", status: "active", priority: "low", iconColor: "primary" },
  { code: "PN0001245", name: "Fortune website", description: "Marketing website redesign.", status: "active", priority: "medium", iconColor: "purple" },
  { code: "PN0001248", name: "Planner App", description: "Personal task planner mobile app.", status: "active", priority: "low", iconColor: "success" },
  { code: "PN0001249", name: "Time tracker", description: "Time tracking dashboard.", status: "active", priority: "medium", iconColor: "info" },
];

export const projects: Project[] = PROJECT_SEEDS.map((p, i) => ({
  ...p,
  id: `p_${i + 1}`,
  createdAt: `2024-${String((i % 12) + 1).padStart(2, "0")}-12T10:00:00Z`,
  leadId: hrIds[i % Math.max(1, hrIds.length)] ?? "u_admin",
  memberIds: ["u_employee", ...employeeIds.slice(0, 5)],
  startDate: `2024-${String((i % 12) + 1).padStart(2, "0")}-01`,
  deadline: `2026-${String((i % 12) + 1).padStart(2, "0")}-28`,
}));

const TASK_NAMES = ["Research", "Mind Map", "UX sketches", "UX Login + Registration", "UI Login + Registration", "UI for other screens", "Animation for buttons", "Preloader", "Design QA", "Handoff to devs"];
const STATUSES = ["todo", "in_progress", "in_review", "done"] as const;

function dueOffset(i: number) {
  const d = new Date();
  d.setDate(d.getDate() + ((i % 14) - 3));
  return d.toISOString().slice(0, 10);
}

export const tasks: Task[] = projects.flatMap((p, pi) =>
  TASK_NAMES.map((name, ti) => {
    const pool = [
      "u_employee", "u_hr", "u_employee",
      ...employeeIds,
    ];
    const primary = pool[(ti + pi) % pool.length];
    const second = pool[(ti + pi + 2) % pool.length];
    const assigneeIds = ti % 3 === 0 && second !== primary ? [primary, second] : [primary];
    const timeByUser: Record<string, number> = {};
    assigneeIds.forEach((uid, idx) => { timeByUser[uid] = (ti + idx) % 4; });
    const spentHours = Object.values(timeByUser).reduce((a, b) => a + b, 0);
    return {
      id: `t_${pi}_${ti}`,
      projectId: p.id,
      name,
      status: STATUSES[(ti + pi) % 4],
      priority: (["low", "medium", "high"] as const)[(ti + pi) % 3],
      assigneeIds,
      estimateHours: 2 + ((ti * 3) % 10),
      spentHours,
      timeByUser,
      dueDate: dueOffset(ti + pi),
      createdAt: "2024-01-15T09:00:00Z",
    };
  }),
);

function todayMinus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// seed attendance for the demo employee + hr + a few extras
const ATTENDANCE_USER_IDS = ["u_employee", "u_hr", ...employeeIds.slice(0, 6)];
export const attendance: AttendanceEntry[] = ATTENDANCE_USER_IDS.flatMap((uid, ui) =>
  Array.from({ length: 8 }, (_, i) => ({
    id: `a_${uid}_${i}`,
    userId: uid,
    date: todayMinus(i + 1 + (ui % 2)),
    clockIn: `${todayMinus(i + 1 + (ui % 2))}T09:${String(Math.floor(r() * 30)).padStart(2, "0")}:00Z`,
    clockOut: `${todayMinus(i + 1 + (ui % 2))}T18:${String(Math.floor(r() * 40)).padStart(2, "0")}:00Z`,
    totalMinutes: 8 * 60 + Math.floor(r() * 60),
  })),
);

export const leaveRequests: LeaveRequest[] = [
  {
    id: "l_1",
    userId: "u_employee",
    type: "vacation",
    startDate: todayMinus(-7),
    endDate: todayMinus(-12),
    reason: "Family trip",
    status: "pending",
    createdAt: new Date().toISOString(),
  },
  {
    id: "l_2",
    userId: employeeIds[2] ?? "u_employee",
    type: "sick",
    startDate: todayMinus(2),
    endDate: todayMinus(1),
    reason: "Flu",
    status: "approved",
    reviewerId: "u_admin",
    createdAt: new Date().toISOString(),
  },
  {
    id: "l_3",
    userId: employeeIds[3] ?? "u_employee",
    type: "remote",
    startDate: todayMinus(-3),
    endDate: todayMinus(-3),
    reason: "Working from home",
    status: "pending",
    createdAt: new Date().toISOString(),
  },
];

export const notifications: Notification[] = [
  { id: "n_1", userId: "u_admin", title: "Leave request submitted", body: "Sallie Long submitted a vacation request.", createdAt: new Date().toISOString(), read: false },
  { id: "n_2", userId: "u_hr", title: "Leave request submitted", body: "An employee submitted a leave request.", createdAt: new Date().toISOString(), read: false },
  { id: "n_3", userId: "u_employee", title: "Project updated", body: "Medical App moved to In Review.", createdAt: new Date().toISOString(), read: true },
];

export const db = {
  users,
  projects,
  tasks,
  attendance,
  leaveRequests,
  notifications,
  passwords,
};
