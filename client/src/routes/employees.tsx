import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter, Plus, MoreVertical, Search } from "lucide-react";
import { cn, formatDateForInput } from "@/lib/utils";
import { usersApi } from "@/lib/api/users.api";
import type { Level, Role, User } from "@/lib/api/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Chip, levelTone } from "@/components/ui/chip";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const Route = createFileRoute("/employees")({
  head: () => ({ meta: [{ title: "Employees — Cadence" }] }),
  component: EmployeesPage,
});

const PAGE_SIZE = 8;

function EmployeesPage() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [levelFilter, setLevelFilter] = useState<Level | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [addOpen, setAddOpen] = useState(false);

  const canManage = hasRole("admin", "hr");
  const isAdmin = hasRole("admin");

  useEffect(() => {
    if (!canManage) navigate({ to: "/" });
  }, [canManage, navigate]);

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.list(),
    enabled: canManage,
  });

  const filtered = useMemo(
    () =>
      users
        .filter((u) => {
          if (
            search &&
            !u.name.toLowerCase().includes(search.toLowerCase()) &&
            !u.email.toLowerCase().includes(search.toLowerCase())
          ) {
            return false;
          }
          if (levelFilter !== "all" && u.level?.toLowerCase() !== levelFilter.toLowerCase()) {
            return false;
          }
          return true;
        })
        .sort((a, b) => {
          const aActive = a.active !== false;
          const bActive = b.active !== false;
          if (aActive !== bActive) return aActive ? -1 : 1;
          return a.name.localeCompare(b.name);
        }),
    [users, search, levelFilter],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  if (!canManage) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          Employees <span className="text-muted-foreground font-medium">({filtered.length})</span>
        </h1>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search"
              className="h-10 rounded-full bg-card pl-9 pr-4 text-sm shadow-sm border border-transparent focus:outline-none focus:border-primary/40 w-40"
            />
          </div>
          <Select
            value={levelFilter}
            onValueChange={(v) => {
              setLevelFilter(v as Level | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-10 rounded-full bg-card shadow-sm border-0 px-3 gap-1 w-[130px]">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="Junior">Junior</SelectItem>
              <SelectItem value="Middle">Middle</SelectItem>
              <SelectItem value="Senior">Senior</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <button
              onClick={() => setAddOpen(true)}
              className="h-10 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 text-sm font-medium shadow-sm hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Add Employee
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {paged.map((u) => (
          <EmployeeRow
            key={u.id}
            user={u}
            onOpen={() => navigate({ to: "/employee/$id", params: { id: u.id } })}
            canDeactivate={isAdmin}
          />
        ))}
        {paged.length === 0 && (
          <div className="bg-card rounded-2xl p-10 text-center text-sm text-muted-foreground shadow-sm">
            No employees found.
          </div>
        )}
      </div>

      <div className="flex items-center justify-end text-sm text-muted-foreground gap-3">
        <span>
          {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-
          {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
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

      {isAdmin && (
        <EmployeeDialog open={addOpen} onOpenChange={setAddOpen} mode="create" isAdmin={isAdmin} />
      )}
    </div>
  );
}

function EmployeeRow({
  user,
  onOpen,
  canDeactivate,
}: {
  user: User;
  onOpen: () => void;
  canDeactivate: boolean;
}) {
  const qc = useQueryClient();
  const deactivate = useMutation({
    mutationFn: () => usersApi.deactivate(user.id),
    onSuccess: () => {
      toast.success(`${user.name} deactivated`);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
  const isInactive = user.active === false;
  return (
    <div
      onClick={onOpen}
      className={cn(
        "rounded-2xl px-4 sm:px-5 py-4 shadow-sm grid grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] items-center gap-3 sm:gap-4 cursor-pointer transition",
        isInactive
          ? "bg-destructive/5 border border-destructive/25 hover:bg-destructive/10 opacity-90"
          : "bg-card hover:bg-accent/30",
      )}
    >
      <Avatar
        className={cn("h-11 w-11 shrink-0", isInactive && "ring-2 ring-destructive/60 opacity-80")}
      >
        <AvatarImage src={user.avatarUrl} />
        <AvatarFallback>{user.name[0]}</AvatarFallback>
      </Avatar>

      <div className="min-w-0">
        <div className="font-medium truncate flex items-center gap-2">
          <span className={cn(isInactive && "text-muted-foreground")}>{user.name}</span>
          {isInactive && (
            <Chip tone="destructive" className="shrink-0 text-[10px] px-2 py-0.5">
              Inactive
            </Chip>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">{user.email}</div>
      </div>

      <div className="hidden sm:block min-w-0">
        <div className="text-xs text-muted-foreground">Role</div>
        <div className="text-sm capitalize truncate">{user.role}</div>
      </div>

      <div className="hidden sm:block min-w-0">
        <div className="text-xs text-muted-foreground">Position</div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm truncate">{user.position}</span>
          <Chip tone={levelTone(user.level)} className="shrink-0">
            {user.level}
          </Chip>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 rounded-full bg-accent flex items-center justify-center hover:bg-accent/70">
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpen}>View profile</DropdownMenuItem>
            {canDeactivate && user.active && (
              <DropdownMenuItem onClick={() => deactivate.mutate()} className="text-destructive">
                Deactivate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

interface EmployeeDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: User;
  isAdmin?: boolean;
}

function EmployeeDialog({ open, onOpenChange, mode, initial, isAdmin }: EmployeeDialogProps) {
  const qc = useQueryClient();
  const empty: Partial<User> & { password?: string } = {
    name: "",
    email: "",
    position: "",
    level: "Junior",
    gender: "Male",
    birthday: "1995-01-01",
    role: "employee",
    mobile: "",
    skype: "",
    location: "",
    password: "",
  };
  const [form, setForm] = useState<Partial<User> & { password?: string }>(empty);

  useEffect(() => {
    if (open)
      setForm(
        initial
          ? { ...initial, birthday: formatDateForInput(initial.birthday), password: "" }
          : empty,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const create = useMutation({
    mutationFn: () => usersApi.create(form),
    onSuccess: () => {
      toast.success("Employee added");
      qc.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
  });
  const update = useMutation({
    // Admin uses PATCH /api/admin/users/{id}; HR uses PATCH /api/users/{id}
    mutationFn: () => {
      const payload = { ...form };
      if (!payload.password || !payload.password.trim()) delete payload.password;
      return isAdmin
        ? usersApi.adminUpdate(initial!.id, payload)
        : usersApi.update(initial!.id, payload);
    },
    onSuccess: () => {
      toast.success("Employee updated");
      qc.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Employee" : "Edit Employee"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          <Input
            label="Full name *"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
          />
          <Input
            label="Email (login) *"
            type="email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
          />
          <Input
            label={
              mode === "create"
                ? "Password (login) *"
                : "New password (Optional - leave blank to keep)"
            }
            type="text"
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
          />
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Role</label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            label="Position (Optional)"
            value={form.position}
            onChange={(v) => setForm({ ...form, position: v })}
          />
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Level</label>
            <Select
              value={form.level}
              onValueChange={(v) => setForm({ ...form, level: v as Level })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Junior">Junior</SelectItem>
                <SelectItem value="Middle">Middle</SelectItem>
                <SelectItem value="Senior">Senior</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Gender</label>
            <Select
              value={form.gender}
              onValueChange={(v) => setForm({ ...form, gender: v as "Male" | "Female" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            label="Birthday (Optional)"
            type="date"
            value={form.birthday}
            onChange={(v) => setForm({ ...form, birthday: v })}
          />
          <Input
            label="Mobile (Optional)"
            value={form.mobile}
            onChange={(v) => setForm({ ...form, mobile: v })}
          />
          <Input
            label="Skype (Optional)"
            value={form.skype}
            onChange={(v) => setForm({ ...form, skype: v })}
          />
          <Input
            label="Location (Optional)"
            value={form.location}
            onChange={(v) => setForm({ ...form, location: v })}
          />
        </div>
        <DialogFooter>
          <button
            onClick={() => (mode === "create" ? create.mutate() : update.mutate())}
            disabled={
              !form.name?.trim() ||
              !form.email?.trim() ||
              (mode === "create" && !form.password?.trim()) ||
              (mode === "create" ? create.isPending : update.isPending)
            }
            className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {mode === "create" ? "Add Employee" : "Save changes"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:border-primary"
      />
    </div>
  );
}
