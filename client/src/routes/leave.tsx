import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Check, X, Eye, MessageSquare, Search } from "lucide-react";
import { leaveApi } from "@/lib/api/leave.api";
import { usersApi } from "@/lib/api/users.api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Chip } from "@/components/ui/chip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LeaveRequest, LeaveStatus, LeaveType } from "@/lib/api/types";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";

export const Route = createFileRoute("/leave")({
  head: () => ({ meta: [{ title: "Leave — Cadence" }] }),
  component: LeavePage,
});

const TYPE_LABELS: Record<LeaveType, string> = {
  vacation: "Vacation",
  sick: "Sick Leave",
  remote: "Work remotely",
};

function LeavePage() {
  const { hasRole } = useAuth();
  if (hasRole("admin", "hr")) return <ApproverView />;
  return <UserLeaveView />;
}

// ---------- Employee ----------
function UserLeaveView() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: leaves = [] } = useQuery({
    queryKey: ["leave", "me", user?.id],
    queryFn: () => leaveApi.list({ scope: "me" }),
    enabled: !!user,
  });
  const sorted = [...leaves].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Leave Requests</h1>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Request Leave
        </button>
      </div>

      <div className="bg-card rounded-2xl shadow-sm divide-y">
        {sorted.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">No leave requests yet.</div>
        )}
        {sorted.map((l) => (
          <div key={l.id} className="flex items-center justify-between p-5 gap-4">
            <div className="min-w-0 flex-1">
              <div className="font-medium">{TYPE_LABELS[l.type]}</div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(l.startDate), "MMM d, yyyy")} – {format(new Date(l.endDate), "MMM d, yyyy")}
              </div>
              {l.reason && <div className="text-xs text-muted-foreground mt-1">"{l.reason}"</div>}
              {l.reviewerComment && (
                <div className="text-xs mt-1"><span className="text-muted-foreground">Reviewer:</span> {l.reviewerComment}</div>
              )}
            </div>
            <StatusChip status={l.status} />
          </div>
        ))}
      </div>

      <LeaveRequestDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

// ---------- Approver (HR / Admin) ----------
function ApproverView() {
  const qc = useQueryClient();
  // GET /api/leave/pending — pending requests for the Pending tab
  const { data: pendingLeaves = [] } = useQuery({ queryKey: ["leave", "pending"], queryFn: () => leaveApi.pending() });
  // GET /api/leave/all — full history for the History tab
  const { data: allLeaves = [] } = useQuery({ queryKey: ["leave", "all"], queryFn: () => leaveApi.all() });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => usersApi.list() });
  const [viewing, setViewing] = useState<LeaveRequest | null>(null);
  const [search, setSearch] = useState("");

  const approve = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) => leaveApi.approve(id, comment),
    onSuccess: () => { toast.success("Approved"); qc.invalidateQueries({ queryKey: ["leave"] }); setViewing(null); },
  });
  const reject = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) => leaveApi.reject(id, comment),
    onSuccess: () => { toast.success("Rejected"); qc.invalidateQueries({ queryKey: ["leave"] }); setViewing(null); },
  });

  const matchesSearch = (l: LeaveRequest) => {
    if (!search.trim()) return true;
    const u = users.find((x) => x.id === l.userId);
    return (u?.name ?? "").toLowerCase().includes(search.toLowerCase());
  };
  const pending = pendingLeaves.filter(matchesSearch);
  const history = allLeaves.filter((l) => l.status !== "pending" && matchesSearch(l)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Leave Management</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees"
            className="rounded-full bg-card pl-9 pr-4 py-2 text-sm shadow-sm border border-transparent focus:outline-none focus:border-primary/40"
          />
        </div>
      </div>


      <Tabs defaultValue="pending">
        <TabsList className="bg-accent/50 p-1 rounded-full">
          <TabsTrigger value="pending" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">
            History ({history.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {pending.length === 0 && (
            <div className="bg-card rounded-2xl p-10 text-center text-sm text-muted-foreground shadow-sm">
              All caught up — no pending requests.
            </div>
          )}
          {pending.map((l) => {
            const u = users.find((x) => x.id === l.userId);
            return (
              <div key={l.id} className="bg-card rounded-2xl p-5 shadow-sm flex flex-wrap items-center gap-4">
                <Avatar className="h-10 w-10"><AvatarImage src={u?.avatarUrl} /><AvatarFallback>{u?.name?.[0]}</AvatarFallback></Avatar>
                <div className="min-w-[180px]">
                  <div className="font-medium">{u?.name ?? l.userId}</div>
                  <div className="text-xs text-muted-foreground">{u?.position}</div>
                </div>
                <div className="min-w-[180px]">
                  <div className="text-xs text-muted-foreground">Period</div>
                  <div className="text-sm">
                    {format(new Date(l.startDate), "MMM d")} – {format(new Date(l.endDate), "MMM d, yyyy")}
                  </div>
                </div>
                <Chip tone="info">{TYPE_LABELS[l.type]}</Chip>
                <div className="ml-auto">
                  <button
                    onClick={() => setViewing(l)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
                  >
                    <Eye className="h-4 w-4" /> View Details
                  </button>
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="history" className="space-y-2 mt-4">
          {history.length === 0 && (
            <div className="bg-card rounded-2xl p-10 text-center text-sm text-muted-foreground shadow-sm">No history yet.</div>
          )}
          {history.map((l) => {
            const u = users.find((x) => x.id === l.userId);
            return (
              <button
                key={l.id}
                onClick={() => setViewing(l)}
                className="w-full text-left bg-card rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:bg-accent/30"
              >
                <Avatar className="h-9 w-9"><AvatarImage src={u?.avatarUrl} /><AvatarFallback>{u?.name?.[0]}</AvatarFallback></Avatar>
                <div className="min-w-[180px]">
                  <div className="font-medium text-sm">{u?.name}</div>
                  <div className="text-xs text-muted-foreground">{TYPE_LABELS[l.type]}</div>
                </div>
                <div className="flex-1 text-xs text-muted-foreground">
                  {format(new Date(l.startDate), "MMM d")} – {format(new Date(l.endDate), "MMM d, yyyy")}
                </div>
                <StatusChip status={l.status} />
              </button>
            );
          })}
        </TabsContent>
      </Tabs>

      {viewing && (
        <LeaveDetailsDialog
          leave={viewing}
          user={users.find((u) => u.id === viewing.userId)}
          onClose={() => setViewing(null)}
          onApprove={(c) => approve.mutate({ id: viewing.id, comment: c })}
          onReject={(c) => reject.mutate({ id: viewing.id, comment: c })}
        />
      )}
    </div>
  );
}

function LeaveDetailsDialog({
  leave, user, onClose, onApprove, onReject,
}: {
  leave: LeaveRequest;
  user?: { name: string; email: string; position: string; avatarUrl: string } | undefined;
  onClose: () => void;
  onApprove: (comment?: string) => void;
  onReject: (comment?: string) => void;
}) {
  const [comment, setComment] = useState("");
  const isPending = leave.status === "pending";
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Leave Request Details</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12"><AvatarImage src={user?.avatarUrl} /><AvatarFallback>{user?.name?.[0]}</AvatarFallback></Avatar>
            <div>
              <div className="font-semibold">{user?.name}</div>
              <div className="text-xs text-muted-foreground">{user?.position} · {user?.email}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Info label="Type" value={TYPE_LABELS[leave.type]} />
            <Info label="Status"><StatusChip status={leave.status} /></Info>
            <Info label="Start" value={format(new Date(leave.startDate), "MMM d, yyyy")} />
            <Info label="End" value={format(new Date(leave.endDate), "MMM d, yyyy")} />
          </div>
          {leave.reason && (
            <Info label="Employee comment" value={leave.reason} />
          )}
          {leave.reviewerComment && (
            <Info label="Reviewer comment" value={leave.reviewerComment} />
          )}
          {isPending && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Add comment (optional)</label>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
                className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm" />
            </div>
          )}
        </div>
        {isPending ? (
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => onReject(comment || undefined)}
              className="inline-flex items-center gap-1 rounded-full bg-destructive/15 text-destructive px-4 py-2 text-sm font-medium hover:bg-destructive/25"
            >
              <X className="h-4 w-4" /> Reject
            </button>
            <button
              onClick={() => onApprove(comment || undefined)}
              className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
            >
              <Check className="h-4 w-4" /> Approve
            </button>
          </div>
        ) : (
          <div className="flex justify-end">
            <button onClick={onClose} className="rounded-full bg-card border px-4 py-2 text-sm">Close</button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {children ?? <div className="text-sm font-medium">{value}</div>}
    </div>
  );
}

function StatusChip({ status }: { status: LeaveStatus }) {
  return (
    <Chip tone={status === "approved" ? "success" : status === "rejected" ? "destructive" : "warning"}>
      {status}
    </Chip>
  );
}

// ---------- Leave request modal (Vacation / Sick / Work remotely + calendar) ----------
function LeaveRequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [type, setType] = useState<LeaveType>("vacation");
  const [range, setRange] = useState<DateRange | undefined>();
  const [comment, setComment] = useState("");

  const submit = useMutation({
    mutationFn: () => {
      if (!range?.from) throw new Error("Pick a date");
      const start = range.from.toISOString().slice(0, 10);
      const end = (range.to ?? range.from).toISOString().slice(0, 10);
      return leaveApi.submit({ type, startDate: start, endDate: end, reason: comment });
    },
    onSuccess: () => {
      toast.success("Leave request sent.");
      qc.invalidateQueries({ queryKey: ["leave"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      onOpenChange(false);
      setComment(""); setRange(undefined); setType("vacation");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const options: { value: LeaveType; label: string }[] = [
    { value: "vacation", label: "Vacation" },
    { value: "sick", label: "Sick Leave" },
    { value: "remote", label: "Work remotely" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Request Type</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {options.map((o) => {
              const active = type === o.value;
              return (
                <button
                  key={o.value}
                  onClick={() => setType(o.value)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                    active ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40"
                  }`}
                >
                  <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${active ? "border-primary" : "border-muted-foreground"}`}>
                    {active && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </span>
                  {o.label}
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-border bg-card p-2 flex justify-center">
            <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={1} />
          </div>

          <div className="rounded-xl border border-border bg-card p-3 flex items-start gap-2">
            <MessageSquare className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your comment (Optional)"
              rows={2}
              className="flex-1 text-sm bg-transparent focus:outline-none resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button
            onClick={() => submit.mutate()}
            disabled={!range?.from}
            className="rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            Send Request
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
