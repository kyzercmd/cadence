import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ListChecks, FolderKanban, Plane, Users, Search } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { projectsApi } from "@/lib/api/projects.api";
import { tasksApi } from "@/lib/api/tasks.api";
import { leaveApi } from "@/lib/api/leave.api";
import { usersApi } from "@/lib/api/users.api";
import { Chip, priorityTone, statusLabel, statusTone } from "@/components/ui/chip";
import { format, differenceInCalendarDays, isPast } from "date-fns";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Cadence" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, hasRole } = useAuth();
  const isManagement = hasRole("admin", "hr");
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.list });
  const { data: allTasks = [] } = useQuery({
    queryKey: ["tasks", "all-projects", projects.map((p) => p.id)],
    queryFn: async () => {
      const lists = await Promise.all(projects.map((p) => tasksApi.list(p.id)));
      return lists.flat();
    },
    enabled: projects.length > 0,
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.list(),
    enabled: hasRole("admin", "hr"),
  });
  const { data: pendingLeaves = [] } = useQuery({
    queryKey: ["leave", "pending"],
    queryFn: () => leaveApi.list({ status: "pending" }),
    enabled: isManagement,
  });
  const { data: myLeaves = [] } = useQuery({
    queryKey: ["leave", "me", user?.id],
    queryFn: () => leaveApi.mine(),
    enabled: !!user && !isManagement,
  });
  const { data: myTasksFromApi = [] } = useQuery({
    queryKey: ["tasks", "me", user?.id],
    queryFn: () => tasksApi.mine(),
    enabled: !!user && !isManagement,
  });

  if (!user) return null;

  // Admin & HR get a system overview
  if (isManagement) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user.name.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">Here's how your team is doing today.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Employees" value={users.length} />
          <StatCard
            icon={FolderKanban}
            label="Active projects"
            value={projects.filter((p) => p.status === "active").length}
          />
          <StatCard
            icon={ListChecks}
            label="Open tasks"
            value={allTasks.filter((t) => t.status !== "done").length}
          />
          <StatCard icon={Plane} label="Pending leave" value={pendingLeaves.length} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title="Projects">
            <div className="space-y-2">
              {projects.slice(0, 6).map((p) => {
                const inReview = allTasks.filter(
                  (t) => t.projectId === p.id && t.status === "in_review",
                ).length;
                return (
                  <Link
                    key={p.id}
                    to="/projects"
                    search={{ projectId: p.id }}
                    className="flex items-center justify-between rounded-xl border border-border/60 p-3 hover:bg-accent/40 transition gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground">{p.code}</div>
                      <div className="font-medium text-sm truncate">{p.name}</div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                      {inReview > 0 && <Chip tone="purple">{inReview} in review</Chip>}
                      <Chip tone={priorityTone(p.priority)}>{p.priority}</Chip>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Panel>

          <Panel title="Pending leave requests">
            <PendingLeavesList pendingLeaves={pendingLeaves} users={users} />
          </Panel>
        </div>
      </div>
    );
  }

  // Employee dashboard
  const myTasks = isManagement ? allTasks.filter((t) => (t.assigneeIds || []).includes(user.id)) : myTasksFromApi;
  const openMyTasks = myTasks.filter((t) => t.status !== "done");
  const upcoming = [...openMyTasks]
    .filter((t) => t.dueDate)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
    .slice(0, 6);
  const myProjects = projects.filter((p) => p.memberIds.includes(user.id) || p.leadId === user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">Here's what's on your plate today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label="My projects" value={myProjects.length} />
        <StatCard icon={ListChecks} label="Open tasks" value={openMyTasks.length} />
        <StatCard
          icon={CalendarClock}
          label="Due this week"
          value={
            openMyTasks.filter((t) => t.dueDate && differenceInCalendarDays(new Date(t.dueDate), new Date()) <= 7)
              .length
          }
        />
        <StatCard icon={Plane} label="Leave requests" value={myLeaves.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        <Panel
          title="Upcoming deadlines"
          right={
            <Link to="/projects" className="text-xs text-primary hover:underline">
              View board →
            </Link>
          }
        >
          {upcoming.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No upcoming tasks.</div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((t) => {
                const p = projects.find((x) => x.id === t.projectId);
                const days = differenceInCalendarDays(new Date(t.dueDate!), new Date());
                const overdue = isPast(new Date(t.dueDate!)) && t.status !== "done";
                return (
                  <Link
                    key={t.id}
                    to="/projects"
                    search={{
                      projectId: t.projectId || projects.find((x) => x.id === t.projectId || x.name === (t as any).projectName)?.id,
                      taskId: t.id,
                    }}
                    className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-xl border border-border/60 p-3 hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] text-muted-foreground truncate">{p?.name || (t as any).projectName || "Project"}</div>
                      <div className="font-medium text-sm truncate">{t.name || (t as any).taskName}</div>
                    </div>
                    <Chip tone={priorityTone(t.priority)}>{t.priority}</Chip>
                    <Chip tone={statusTone(t.status)}>{statusLabel(t.status)}</Chip>
                    <div
                      className={`text-xs font-medium ${overdue ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {overdue
                        ? `${Math.abs(days)}d overdue`
                        : days === 0
                          ? "Today"
                          : `${days}d left`}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel
          title="My projects"
          right={
            <Link to="/projects" className="text-xs text-primary hover:underline">
              All →
            </Link>
          }
        >
          {myProjects.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No projects assigned.
            </div>
          ) : (
            <div className="space-y-2">
              {myProjects.slice(0, 5).map((p) => {
                const inReview = allTasks.filter(
                  (t) => t.projectId === p.id && t.status === "in_review",
                ).length;
                return (
                  <Link
                    key={p.id}
                    to="/projects"
                    search={{ projectId: p.id }}
                    className="block rounded-xl border border-border/60 p-3 hover:bg-accent/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] text-muted-foreground">{p.code}</div>
                      <Chip tone={priorityTone(p.priority)}>{p.priority}</Chip>
                    </div>
                    <div className="font-medium text-sm mt-1 truncate">{p.name}</div>
                    {inReview > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">{inReview} in review</div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarClock;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground truncate">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </div>
  );
}

function Panel({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function PendingLeavesList({
  pendingLeaves,
  users,
}: {
  pendingLeaves: import("@/lib/api/types").LeaveRequest[];
  users: import("@/lib/api/types").User[];
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return pendingLeaves;
    return pendingLeaves.filter((l) => {
      const u = users.find((x) => x.id === l.userId);
      return u?.name.toLowerCase().includes(s) || u?.email.toLowerCase().includes(s);
    });
  }, [q, pendingLeaves, users]);

  if (pendingLeaves.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-8">All caught up.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search employee"
          className="w-full rounded-full pl-9 pr-3 py-2 text-sm border border-border hover:border-primary/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>
      {filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6">No matching requests.</div>
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, 6).map((l) => {
            const u = users.find((x) => x.id === l.userId);
            return (
              <Link
                key={l.id}
                to="/leave"
                className="flex items-center justify-between rounded-xl border border-border/60 p-3 hover:bg-accent/40"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{u?.name ?? l.userId}</div>
                  <div className="text-xs text-muted-foreground capitalize truncate">
                    {l.type} · {format(new Date(l.startDate), "MMM d")} –{" "}
                    {format(new Date(l.endDate), "MMM d")}
                  </div>
                </div>
                <Chip tone="warning">pending</Chip>
              </Link>
            );
          })}
          {filtered.length > 6 && (
            <div className="text-xs text-muted-foreground text-center pt-1">
              Showing 6 of {filtered.length} — refine your search to see more.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
