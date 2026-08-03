import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInCalendarDays, format, startOfWeek } from "date-fns";
import { safeDate, safeFormat } from "@/lib/utils";
import { Play, Square, ChevronLeft, Search, Clock, CalendarRange, CalendarCheck2, History } from "lucide-react";
import { attendanceApi } from "@/lib/api/attendance.api";
import { usersApi } from "@/lib/api/users.api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import type { AttendanceEntry } from "@/lib/api/types";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "Attendance — Cadence" }] }),
  component: AttendancePage,
});

function fmtMinutes(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${String(mm).padStart(2, "0")}m`;
}

function AttendancePage() {
  const { user, hasRole } = useAuth();
  if (!user) return null;
  if (hasRole("admin", "hr")) return <ManagementAttendanceView canClock={false} />;
  return <EmployeeAttendanceView />;
}

// ---------- Employee ----------
function EmployeeAttendanceView() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Attendance</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <ClockCard />
        <HistoryPanel userId={user!.id} title="My history" isSelf />
      </div>
    </div>
  );
}

// ---------- Admin & HR ----------
const PAGE_SIZE = 8;

function ManagementAttendanceView({ canClock }: { canClock: boolean }) {
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => usersApi.list() });
  const { data: all = [] } = useQuery({ queryKey: ["attendance", "all"], queryFn: attendanceApi.teamHistory });
  const nonAdmins = users.filter((u) => u.role !== "admin");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = users.find((u) => u.id === selectedId);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const latest = new Map<string, string>();
    for (const a of all) {
      const cur = latest.get(a.userId);
      const dt = a.lastUpdate || (a as any).date || "";
      if (!cur || dt > cur) latest.set(a.userId, dt);
    }
    return [...nonAdmins]
      .filter((u) => u.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (latest.get(b.id) ?? "").localeCompare(latest.get(a.id) ?? ""));
  }, [nonAdmins, all, search]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = useMemo(() => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sorted, page]);

  if (selected) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Attendance</h1>
        <button onClick={() => setSelectedId(null)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to employees
        </button>
        <HistoryPanel userId={selected.id} title={`${selected.name}'s attendance`} isSelf={false} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Attendance</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search employees"
            className="rounded-full bg-card pl-9 pr-4 py-2 text-sm shadow-sm border border-transparent focus:outline-none focus:border-primary/40"
          />
        </div>
      </div>

      {canClock && (
        <div className="max-w-md"><ClockCard /></div>
      )}

      <div className="bg-card rounded-2xl shadow-sm divide-y">
        <div className="px-5 py-3 text-xs text-muted-foreground">
          Click an employee to view their attendance history.
        </div>
        {paged.map((u) => {
          const empAtt = all.find((a) => a.userId === u.id);
          const dt = empAtt?.lastUpdate || (empAtt as any)?.date;
          return (
            <button
              key={u.id}
              onClick={() => setSelectedId(u.id)}
              className="w-full px-4 sm:px-5 py-4 flex items-center gap-3 sm:gap-4 hover:bg-accent/40 text-left"
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={u.avatarUrl} />
                <AvatarFallback>{u.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{u.name}</div>
                <div className="text-xs text-muted-foreground capitalize truncate">{u.role} · {u.position}</div>
              </div>
              <div className="text-xs text-muted-foreground text-right shrink-0">
                {empAtt && dt ? (
                  <>
                    <div className="truncate">Last {safeFormat(dt, "MMM d")}</div>
                    <div>{fmtMinutes(empAtt.totalMinutes ?? 0)}</div>
                  </>
                ) : "No records"}
              </div>
            </button>
          );
        })}
        {sorted.length === 0 && (
          <div className="px-5 py-8 text-center text-muted-foreground text-sm">No employees found.</div>
        )}
      </div>

      <div className="flex items-center justify-end text-sm text-muted-foreground gap-3">
        <span>
          {sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-
          {Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
        </span>
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-3 py-1 rounded-full disabled:opacity-40 hover:bg-accent"
        >
          ←
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1 rounded-full disabled:opacity-40 hover:bg-accent"
        >
          →
        </button>
      </div>
    </div>
  );
}

// ---------- Shared pieces ----------
function ClockCard() {
  const qc = useQueryClient();
  // GET /api/attendance/me — today's clock-in/out status
  const { data: todayEntry } = useQuery({
    queryKey: ["attendance", "me"],
    queryFn: () => attendanceApi.today(),
  });
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const liveMinutes = useMemo(() => {
    if (!todayEntry?.clockIn) return 0;
    const end = todayEntry.clockOut ? new Date(todayEntry.clockOut).getTime() : now;
    return Math.max(0, Math.round((end - new Date(todayEntry.clockIn).getTime()) / 60000));
  }, [todayEntry, now]);
  const clockIn = useMutation({
    mutationFn: attendanceApi.clockIn,
    onSuccess: () => { toast.success("Clocked in"); qc.invalidateQueries({ queryKey: ["attendance"] }); },
  });
  const clockOut = useMutation({
    mutationFn: attendanceApi.clockOut,
    onSuccess: () => { toast.success("Clocked out"); qc.invalidateQueries({ queryKey: ["attendance"] }); },
  });

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm text-center">
      {todayEntry?.clockIn && (
        <div
          style={{
            backgroundColor: "oklch(0.5 0.05 160 / 0.15)",
            color: "oklch(0.5 0.05 160)",
            borderColor: "oklch(0.5 0.05 160 / 0.3)",
          }}
          className="mb-4 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-semibold"
        >
          <span
            style={{ backgroundColor: "oklch(0.5 0.05 160)" }}
            className="h-2 w-2 rounded-full animate-pulse"
          />
          Already clocked in today
        </div>
      )}
      <div className="text-sm text-muted-foreground">Today</div>
      <div className="text-2xl font-bold mt-1">{format(new Date(), "EEEE, MMM d")}</div>
      <div className="mt-6 mb-4 text-5xl font-bold tabular-nums">{fmtMinutes(liveMinutes)}</div>
      <div className="text-sm text-muted-foreground mb-6">
        {todayEntry?.clockIn ? (
          <>Started {safeFormat(todayEntry.clockIn, "h:mm a")}{" "}
          {todayEntry.clockOut ? `· ended ${safeFormat(todayEntry.clockOut, "h:mm a")}` : ""}</>
        ) : "Not clocked in yet"}
      </div>
      {!todayEntry?.clockIn || (todayEntry.clockIn && todayEntry.clockOut) ? (
        <button onClick={() => clockIn.mutate()} className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90">
          <Play className="h-4 w-4" /> Clock In
        </button>
      ) : (
        <button onClick={() => clockOut.mutate()} className="inline-flex items-center gap-2 rounded-full bg-destructive text-destructive-foreground px-6 py-3 font-medium hover:bg-destructive/90">
          <Square className="h-4 w-4" /> Clock Out
        </button>
      )}
    </div>
  );
}

function HistoryPanel({ userId, title, isSelf }: { userId: string; title: string; isSelf: boolean }) {
  const { data: history = [] } = useQuery({
    queryKey: ["attendance", "history", userId],
    // Employee viewing own history → GET /api/attendance/history
    // HR/Admin viewing someone else  → GET /api/attendance/{targetId}/history
    queryFn: () => isSelf ? attendanceApi.myHistory() : attendanceApi.employeeHistory(userId),
  });
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));

  // Average hours per week (only weeks with any logged minutes)
  const avgWeeklyMinutes = useMemo(() => {
    if (sorted.length === 0) return 0;
    const buckets = new Map<string, number>();
    for (const r of sorted) {
      const d = safeDate(r.date);
      if (!d) continue;
      const ws = format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
      buckets.set(ws, (buckets.get(ws) ?? 0) + (Number(r.totalMinutes) || 0));
    }
    const totals = [...buckets.values()].filter((v) => v > 0);
    if (totals.length === 0) return 0;
    return Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
  }, [sorted]);

  const lastEntry = sorted[0];
  const weeksTracked = useMemo(() => {
    const s = new Set<string>();
    for (const r of sorted) {
      const d = safeDate(r.date);
      if (d) s.add(format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd"));
    }
    return s.size;
  }, [sorted]);

  return (
    <div className="bg-card rounded-2xl p-4 sm:p-6 shadow-sm">
      <h2 className="font-semibold mb-4">{title}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard icon={Clock} label="Avg / week" value={fmtMinutes(avgWeeklyMinutes)} accent="primary" />
        <StatCard icon={CalendarRange} label="Weeks tracked" value={String(weeksTracked)} accent="info" />
        <StatCard icon={CalendarCheck2} label="Days logged" value={String(sorted.length)} accent="success" />
        <StatCard
          icon={History}
          label="Last entry"
          value={lastEntry && safeDate(lastEntry.date) ? `${differenceInCalendarDays(new Date(), safeDate(lastEntry.date)!)}d ago` : "—"}
          accent="warning"
        />
      </div>
      <AttendanceTable rows={sorted} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent: "primary" | "info" | "success" | "warning" }) {
  const ring = {
    primary: "bg-primary/15 text-primary ring-1 ring-primary/30",
    info: "bg-info/15 text-info ring-1 ring-info/30",
    success: "bg-success/15 text-success ring-1 ring-success/30",
    warning: "bg-warning/15 text-warning ring-1 ring-warning/30",
  }[accent];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${ring}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-base font-semibold tabular-nums truncate">{value}</div>
      </div>
    </div>
  );
}

function AttendanceTable({ rows }: { rows: AttendanceEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b">
            <th className="text-left font-medium py-3">Date</th>
            <th className="text-left font-medium py-3">In</th>
            <th className="text-left font-medium py-3">Out</th>
            <th className="text-left font-medium py-3">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 30).map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="py-3">{safeFormat(r.date, "MMM d, yyyy")}</td>
              <td className="py-3">{r.clockIn ? safeFormat(r.clockIn, "h:mm a") : "—"}</td>
              <td className="py-3">{r.clockOut ? safeFormat(r.clockOut, "h:mm a") : "—"}</td>
              <td className="py-3 font-medium">{fmtMinutes(r.totalMinutes)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No attendance records yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
