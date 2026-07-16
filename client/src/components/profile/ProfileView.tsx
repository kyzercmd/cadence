import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Save, ListTodo, Loader2, Eye, CheckCircle2, FolderKanban, Clock3 } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import type { Gender, Level, Role, Task, User } from "@/lib/api/types";
import { usersApi } from "@/lib/api/users.api";
import { projectsApi } from "@/lib/api/projects.api";
import { tasksApi } from "@/lib/api/tasks.api";
import { uploadApi } from "@/lib/api/upload.api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Chip, priorityTone, statusLabel, statusTone } from "@/components/ui/chip";
import { toast } from "sonner";

type EditableField =
  | "name" | "email" | "password" | "avatarUrl" | "role" | "position"
  | "level" | "gender" | "birthday" | "company" | "location"
  | "mobile" | "skype" | "active";

const PERMS: Record<Role, EditableField[]> = {
  employee: ["avatarUrl", "location", "mobile", "skype"],
  hr: ["name", "avatarUrl", "level", "gender", "birthday", "company", "location", "mobile", "skype", "active"],
  admin: ["name", "email", "password", "avatarUrl", "role", "position", "level", "gender", "birthday", "company", "location", "mobile", "skype", "active"],
};

export interface ProfileViewProps {
  user: User;
  viewerRole: Role;
  /** When true, the viewer is editing their own profile (employee profile page). */
  isSelf: boolean;
  onUpdated?: (u: User) => void;
}

export function ProfileView({ user, viewerRole, isSelf, onUpdated }: ProfileViewProps) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<User & { password?: string }>({ ...user, password: "" });

  useEffect(() => { setForm({ ...user, password: "" }); }, [user.id]); // eslint-disable-line

  // Employees can only edit themselves; if not self, they can't edit anything
  const editable: EditableField[] = isSelf || viewerRole !== "employee" ? PERMS[viewerRole] : [];
  const can = (f: EditableField) => editable.includes(f);

  const save = useMutation({
    mutationFn: () => {
      const patch: Partial<User> & { password?: string } = {};
      for (const f of editable) {
        // @ts-expect-error - dynamic key
        patch[f] = form[f];
      }
      return usersApi.update(user.id, patch);
    },
    onSuccess: (u) => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["users"] });
      onUpdated?.(u);
    },
  });

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const { url } = await uploadApi.upload(f);
      setForm((p) => ({ ...p, avatarUrl: url }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  const anyEditable = editable.length > 0;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="info">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="bg-accent/50 p-1 rounded-full">
            <TabsTrigger value="info" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">Profile</TabsTrigger>
            <TabsTrigger value="projects" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">Projects</TabsTrigger>
            <TabsTrigger value="activity" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">Activity</TabsTrigger>
          </TabsList>
          {anyEditable && (
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-primary/90 disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> {save.isPending ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>

        <TabsContent value="info" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            <div className="bg-card rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <Avatar className="h-28 w-28">
                    <AvatarImage src={form.avatarUrl} />
                    <AvatarFallback>{form.name[0]}</AvatarFallback>
                  </Avatar>
                  {can("avatarUrl") && (
                    <>
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="absolute -right-1 -bottom-1 rounded-full bg-primary p-2 text-primary-foreground shadow hover:bg-primary/90"
                        title="Change picture"
                      >
                        <Camera className="h-3.5 w-3.5" />
                      </button>
                      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
                    </>
                  )}
                </div>
                <h2 className="mt-3 font-semibold text-lg">{form.name}</h2>
                <p className="text-sm text-muted-foreground">{form.position}</p>
                <p className="text-xs text-muted-foreground mt-1 capitalize">{form.role}</p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent/60 px-3 py-1 text-xs">
                  <span className={`h-2 w-2 rounded-full ${form.active ? "bg-success" : "bg-destructive"}`} />
                  <span className={form.active ? "text-foreground" : "text-destructive font-medium"}>
                    {form.active ? "Active" : "Deactivated"}
                  </span>
                </div>
                {can("active") && (
                  form.active ? (
                    <button
                      onClick={() => setForm({ ...form, active: false })}
                      className="mt-3 inline-flex items-center gap-2 rounded-full bg-destructive text-destructive-foreground px-4 py-2 text-xs font-semibold shadow-sm hover:bg-destructive/90"
                    >
                      Deactivate account
                    </button>
                  ) : (
                    <button
                      onClick={() => setForm({ ...form, active: true })}
                      className="mt-3 inline-flex items-center gap-2 rounded-full bg-success text-success-foreground px-4 py-2 text-xs font-semibold shadow-sm hover:bg-success/90"
                    >
                      Activate account
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="bg-card rounded-2xl p-6 shadow-sm space-y-6">
              <Section title="Main info">
                <RWText label="Full name" value={form.name} editable={can("name")} onChange={(v) => setForm({ ...form, name: v })} />
                <RWText label="Position" value={form.position} editable={can("position")} onChange={(v) => setForm({ ...form, position: v })} />
                <RWText label="Company" value={form.company} editable={can("company")} onChange={(v) => setForm({ ...form, company: v })} />
                <RWText label="Location" value={form.location} editable={can("location")} onChange={(v) => setForm({ ...form, location: v })} />
                <RWText label="Birthday" type="date" value={form.birthday} editable={can("birthday")} onChange={(v) => setForm({ ...form, birthday: v })} />
                <RWSelect label="Level" value={form.level} editable={can("level")}
                  options={["Junior", "Middle", "Senior"]}
                  onChange={(v) => setForm({ ...form, level: v as Level })} />
                <RWSelect label="Gender" value={form.gender} editable={can("gender")}
                  options={["Male", "Female"]}
                  onChange={(v) => setForm({ ...form, gender: v as Gender })} />
                {can("role") && (
                  <RWSelect label="Role" value={form.role} editable
                    options={["employee", "hr", "admin"]}
                    onChange={(v) => setForm({ ...form, role: v as Role })} />
                )}
              </Section>

              <Section title="Contact info">
                <RWText label="Email" type="email" value={form.email} editable={can("email")} onChange={(v) => setForm({ ...form, email: v })} />
                <RWText label="Mobile number" value={form.mobile} editable={can("mobile")} onChange={(v) => setForm({ ...form, mobile: v })} />
                <RWText label="Skype" value={form.skype} editable={can("skype")} onChange={(v) => setForm({ ...form, skype: v })} />
                {can("password") && (
                  <RWText label="Set new password" value={form.password ?? ""} type="text" editable
                    onChange={(v) => setForm({ ...form, password: v })} />
                )}
              </Section>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="mt-5">
          <ProjectsTab user={user} />
        </TabsContent>

        <TabsContent value="activity" className="mt-5">
          <ActivityTab user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-semibold mb-3">{title}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function RWText({
  label, value, onChange, type = "text", editable,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; editable: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      {editable ? (
        <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:border-primary" />
      ) : (
        <div className="w-full rounded-xl border border-border/60 bg-muted/50 px-3 py-2 text-sm text-foreground/70 truncate">{value || "—"}</div>
      )}
    </div>
  );
}

function RWSelect({
  label, value, onChange, options, editable,
}: { label: string; value: string; onChange: (v: string) => void; options: string[]; editable: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      {editable ? (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {options.map((o) => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}
          </SelectContent>
        </Select>
      ) : (
        <div className="w-full rounded-xl border border-border/60 bg-muted/50 px-3 py-2 text-sm text-foreground/70 capitalize truncate">{value || "—"}</div>
      )}
    </div>
  );
}

function ProjectsTab({ user }: { user: User }) {
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.list });
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => tasksApi.list() });
  const mine = projects.filter((p) => p.memberIds.includes(user.id) || p.leadId === user.id);

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm">
      <div className="text-sm font-semibold mb-3">Assigned projects ({mine.length})</div>
      {mine.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-10">Not assigned to any project.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mine.map((p) => {
            const open = tasks.filter((t) => t.projectId === p.id && t.assigneeIds.includes(user.id) && t.status !== "done").length;
            const overdue = p.deadline && isPast(parseISO(p.deadline)) && p.status !== "completed";
            return (
              <div key={p.id} className="rounded-xl border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-muted-foreground">{p.code}</div>
                  <Chip tone={priorityTone(p.priority)}>{p.priority}</Chip>
                </div>
                <div className="font-medium text-sm mt-1">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</div>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{open} open task{open === 1 ? "" : "s"}</span>
                  {p.deadline && (
                    <span className={overdue ? "text-destructive font-medium" : ""}>
                      Due {format(parseISO(p.deadline), "MMM d")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ActivityTab({ user }: { user: User }) {
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: () => tasksApi.list() });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.list });
  const mine = tasks.filter((t) => t.assigneeIds.includes(user.id));

  const stats = useMemo(() => ({
    todo: mine.filter((t) => t.status === "todo").length,
    in_progress: mine.filter((t) => t.status === "in_progress").length,
    in_review: mine.filter((t) => t.status === "in_review").length,
    done: mine.filter((t) => t.status === "done").length,
  }), [mine]);

  const sorted = [...mine].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={ListTodo} label="To-Do" value={stats.todo} tone="muted" />
        <Stat icon={Loader2} label="In Progress" value={stats.in_progress} tone="primary" />
        <Stat icon={Eye} label="In Review" value={stats.in_review} tone="warning" />
        <Stat icon={CheckCircle2} label="Done" value={stats.done} tone="success" />
      </div>
      <div className="bg-card rounded-2xl p-6 shadow-sm">
        <div className="text-sm font-semibold mb-3 flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-primary" /> Task activity ({mine.length})
        </div>
        {sorted.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-10">No task activity yet.</div>
        ) : (
          <div className="divide-y">
            {sorted.map((t: Task) => {
              const p = projects.find((x) => x.id === t.projectId);
              return (
                <div key={t.id} className="py-3 flex items-center gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-muted-foreground">{p?.code}</div>
                    <div className="text-sm font-medium truncate">{t.name}</div>
                  </div>
                  <Chip tone={priorityTone(t.priority)}>{t.priority}</Chip>
                  <Chip tone={statusTone(t.status)}>{statusLabel(t.status)}</Chip>
                  <div className="text-xs text-muted-foreground tabular-nums flex items-center gap-1">
                    <Clock3 className="h-3 w-3" />{t.spentHours}h / {t.estimateHours}h
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone: "muted" | "primary" | "warning" | "success" }) {
  const style = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/15 text-primary",
    warning: "bg-warning/15 text-warning",
    success: "bg-success/15 text-success",
  }[tone];
  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${style}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground truncate">{label}</div>
        <div className="text-2xl font-bold leading-none">{value}</div>
      </div>
    </div>
  );
}
