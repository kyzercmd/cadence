import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  Plus,
  Filter,
  ChevronLeft,
  ChevronDown,
  Pencil,
  Image as ImageIcon,
  X,
  Paperclip,
  Link2,
  Calendar as CalendarIcon,
  Clock,
  Check,
  Search,
  Users,
  Trash2,
} from "lucide-react";
import { safeFormat, isOverdue, formatDateForInput, normalizeExternalUrl } from "@/lib/utils";
import { projectsApi } from "@/lib/api/projects.api";
import { tasksApi } from "@/lib/api/tasks.api";
import { usersApi } from "@/lib/api/users.api";
import { uploadApi } from "@/lib/api/upload.api";
import type { Priority, Project, Task, TaskStatus, User } from "@/lib/api/types";
import { Chip, priorityTone } from "@/components/ui/chip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type ProjectSearch = {
  projectId?: string;
  taskId?: string;
};

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projects — Cadence" }] }),
  validateSearch: (search: Record<string, unknown>): ProjectSearch => ({
    projectId: search.projectId as string | undefined,
    taskId: search.taskId as string | undefined,
  }),
  component: ProjectsPage,
});

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To-Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "in_review", label: "In Review" },
  { id: "done", label: "Done" },
];

function ProjectsPage() {
  const { hasRole, user } = useAuth();
  const qc = useQueryClient();
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.list });
  const canListUsers = hasRole("admin", "hr");
  const { data: rawUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.list(),
    enabled: canListUsers,
  });

  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const activeId = search.projectId || null;
  const selectedTaskId = search.taskId || null;

  const setActiveId = (id: string | null) => {
    navigate({ search: { projectId: id || undefined, taskId: undefined } });
  };
  const setSelectedTaskId = (id: string | null) => {
    navigate({ search: (prev) => ({ ...prev, taskId: id || undefined }) });
  };

  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");

  useEffect(() => {
    if (!activeId && projects[0]) setActiveId(projects[0].id);
  }, [projects, activeId]);

  useEffect(() => {
    setFilterPriority("all");
    setFilterAssignee("all");
  }, [activeId]);

  const selected = projects.find((p) => p.id === activeId);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", selected?.id],
    queryFn: () => tasksApi.list(selected!.id),
    enabled: !!selected,
  });

  const { data: detailedTask } = useQuery({
    queryKey: ["task", selectedTaskId],
    queryFn: () => tasksApi.get(selectedTaskId!),
    enabled: !!selectedTaskId,
  });

  const users = useMemo(() => {
    if (rawUsers.length > 0) return rawUsers;
    const map = new Map<string, any>();
    if (user)
      map.set(user.id, {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        position: user.position || user.role,
        email: user.email,
      });
    for (const t of tasks) {
      for (const a of t.assignees || []) {
        if (!a.id) continue;
        if (!map.has(a.id)) {
          map.set(a.id, {
            id: a.id,
            name: a.name || "Assigned",
            avatarUrl: a.avatarUrl || a.avatar_url,
            position: a.position || "",
          });
        } else {
          const cur = map.get(a.id);
          if (!cur.avatarUrl && (a.avatarUrl || a.avatar_url))
            cur.avatarUrl = a.avatarUrl || a.avatar_url;
        }
      }
    }
    return Array.from(map.values()) as User[];
  }, [rawUsers, tasks, user]);

  const projectFilterUsers = useMemo(() => {
    const validIds = new Set<string>();
    if (selected?.leadId) validIds.add(selected.leadId);
    if (selected?.memberIds) {
      for (const id of selected.memberIds) validIds.add(id);
    }
    for (const t of tasks) {
      for (const id of t.assigneeIds || []) validIds.add(id);
      for (const a of t.assignees || []) if (a.id) validIds.add(a.id);
    }
    if (user && validIds.size === 0) validIds.add(user.id);

    return users.filter((u) => validIds.has(u.id));
  }, [users, selected, tasks, user]);

  const selectedTaskFromList = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const selectedTask = detailedTask || selectedTaskFromList;

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterAssignee !== "all" && !(t.assigneeIds || []).includes(filterAssignee)) return false;
      return true;
    });
  }, [tasks, filterPriority, filterAssignee]);

  // (removed unused `now` variable)
  const isBacklog = (t: Task) => !!t.dueDate && t.status !== "done" && isOverdue(t.dueDate);

  const byColumn = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], in_review: [], done: [] };
    for (const t of filteredTasks) {
      if (isBacklog(t)) continue;
      map[t.status].push(t);
    }
    return map;
  }, [filteredTasks]);

  const backlog = useMemo(() => filteredTasks.filter(isBacklog), [filteredTasks]);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const move = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      tasksApi.moveStatus(taskId, status),
    onMutate: async ({ taskId, status }) => {
      await qc.cancelQueries({ queryKey: ["tasks", selected?.id] });
      const prev = qc.getQueryData<Task[]>(["tasks", selected?.id]);
      qc.setQueryData<Task[]>(["tasks", selected?.id], (old) =>
        (old ?? []).map((t) => (t.id === taskId ? { ...t, status } : t)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks", selected?.id], ctx.prev);
      toast.error("Failed to move task");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks", selected?.id] }),
  });

  const deleteProject = useMutation({
    mutationFn: (id: string) => projectsApi.remove(id),
    onSuccess: () => {
      toast.success("Project deleted");
      qc.invalidateQueries({ queryKey: ["projects"] });
      setDeleteConfirmOpen(false);
      setEditOpen(false);
      setActiveId(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete project"),
  });

  function onDragStart(e: DragStartEvent) {
    const t = filteredTasks.find((x) => x.id === e.active.id);
    if (t) setActiveTask(t);
  }
  function onDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const taskId = String(e.active.id);
    const overId = e.over?.id as TaskStatus | undefined;
    if (!overId) return;
    const task = filteredTasks.find((t) => t.id === taskId);
    if (!task || task.status === overId) return;
    move.mutate({ taskId, status: overId });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">
          {selectedTask ? (
            <span className="flex items-center gap-2">
              <button
                onClick={() => setSelectedTaskId(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                Projects
              </button>
              <span className="text-muted-foreground">/</span>
              <span>Task details</span>
            </span>
          ) : (
            "Projects"
          )}
        </h1>
        <div className="flex items-center gap-2">
          {selected && (
            <button
              onClick={() => setAddTaskOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Add Task
            </button>
          )}
          {hasRole("admin", "hr") && (
            <button
              onClick={() => setAddProjectOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-card text-foreground px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-accent"
            >
              <Plus className="h-4 w-4" /> Add Project
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Project list */}
        <div className="bg-card rounded-2xl p-3 shadow-sm space-y-1 h-fit max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
          <div className="px-3 py-2 text-sm font-semibold">Current Projects</div>
          {projects.map((p) => {
            const isSelected = selected?.id === p.id;
            const overdue = p.deadline && isOverdue(p.deadline) && p.status !== "completed";
            return (
              <div
                key={p.id}
                className={`rounded-xl transition ${isSelected ? "bg-accent/60 ring-1 ring-primary/40" : "hover:bg-accent/40"}`}
              >
                <button
                  onClick={() => setActiveId(p.id)}
                  className="w-full text-left px-3 py-3 flex items-center gap-2"
                >
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt=""
                      className="h-8 w-8 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-muted-foreground truncate">{p.code}</div>
                    <div className="font-medium text-sm truncate">{p.name}</div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isSelected ? "rotate-180" : ""}`}
                  />
                </button>
                {isSelected && (
                  <div className="px-3 pb-3 space-y-2">
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {p.description}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Chip tone={priorityTone(p.priority)}>{p.priority}</Chip>
                      {p.status === "completed" && <Chip tone="success">completed</Chip>}
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {p.startDate && (
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="h-3 w-3" />
                          <span>Start {safeFormat(p.startDate, "MMM d, yyyy")}</span>
                        </div>
                      )}
                      {p.deadline && (
                        <div
                          className={`flex items-center gap-1.5 ${overdue ? "text-destructive font-medium" : ""}`}
                        >
                          <CalendarIcon className="h-3 w-3" />
                          <span>Deadline {safeFormat(p.deadline, "MMM d, yyyy")}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{p.memberIds.length} members</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {projects.length === 0 && (
            <div className="px-3 py-6 text-sm text-muted-foreground text-center">
              No projects yet.
            </div>
          )}
        </div>

        {/* Main area */}
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          {!selected ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Select a project to view its board.
            </div>
          ) : selectedTask ? (
            <TaskDetails
              task={selectedTask}
              users={users}
              project={selected}
              onBack={() => setSelectedTaskId(null)}
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  {selected.imageUrl && (
                    <img
                      src={selected.imageUrl}
                      alt=""
                      className="h-10 w-10 rounded-xl object-cover"
                    />
                  )}
                  <div>
                    <div className="text-[11px] text-muted-foreground">{selected.code}</div>
                    <h2 className="font-semibold text-lg">{selected.name}</h2>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  {selected.deadline && (
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" /> Due{" "}
                      {safeFormat(selected.deadline, "MMM d, yyyy")}
                    </span>
                  )}
                  <Chip tone={priorityTone(selected.priority)}>{selected.priority}</Chip>
                  {hasRole("admin", "hr") && (
                    <>
                      <button
                        onClick={() => setEditOpen((v) => !v)}
                        className={`rounded-full p-2 shadow-sm border transition ${editOpen ? "bg-primary/10 text-primary border-primary/30" : "bg-card hover:bg-accent text-muted-foreground border-border"}`}
                        title="Edit project"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmOpen(true)}
                        className="rounded-full bg-card p-2 shadow-sm hover:bg-destructive/10 hover:text-destructive border border-border"
                        title="Delete project"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </>
                  )}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="rounded-full bg-card p-2 shadow-sm hover:bg-accent border border-border">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64 p-4 space-y-3">
                      <div className="text-sm font-semibold">Filter tasks</div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Priority</label>
                        <Select
                          value={filterPriority}
                          onValueChange={(v) => setFilterPriority(v as Priority | "all")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All priorities</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Assignee</label>
                        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All assignees</SelectItem>
                            {projectFilterUsers.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <button
                        onClick={() => {
                          setFilterPriority("all");
                          setFilterAssignee("all");
                        }}
                        className="w-full text-xs text-primary hover:underline"
                      >
                        Reset filters
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {editOpen && hasRole("admin", "hr") && (
                <ProjectEditPanel
                  project={selected}
                  users={users}
                  onClose={() => setEditOpen(false)}
                />
              )}

              <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                    {COLUMNS.map((col) => (
                      <ColumnHeader
                        key={col.id}
                        status={col.id}
                        label={col.label}
                        count={byColumn[col.id].length}
                      />
                    ))}
                  </div>

                  <div className="rounded-xl bg-accent/30 p-2">
                    <div className="text-center text-xs font-semibold text-muted-foreground mb-3">
                      Active Tasks ({COLUMNS.reduce((s, c) => s + byColumn[c.id].length, 0)})
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
                      {COLUMNS.map((col) => (
                        <Column
                          key={col.id}
                          status={col.id}
                          tasks={byColumn[col.id]}
                          users={users}
                          onSelect={(id) => setSelectedTaskId(id)}
                          project={selected}
                        />
                      ))}
                    </div>
                  </div>

                  <BacklogSection
                    tasks={backlog}
                    users={users}
                    onSelect={(id) => setSelectedTaskId(id)}
                    project={selected}
                  />
                </div>
                <DragOverlay>
                  {activeTask ? (
                    <TaskCard task={activeTask} users={users} project={selected} dragging />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </>
          )}
        </div>
      </div>

      {hasRole("admin", "hr") && (
        <AddProjectDialog open={addProjectOpen} onOpenChange={setAddProjectOpen} users={users} />
      )}
      {hasRole("admin", "hr") && selected && (
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete project?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <span className="font-medium">{selected.name}</span>{" "}
                and all its tasks. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteProject.mutate(selected.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteProject.isPending ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {selected && (
        <AddTaskDialog
          open={addTaskOpen}
          onOpenChange={setAddTaskOpen}
          project={selected}
          users={users}
        />
      )}
    </div>
  );
}

function ProjectEditPanel({
  project,
  users: propUsers,
  onClose,
}: {
  project: Project;
  users?: User[];
  onClose: () => void;
}) {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const { data: fetchedUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.list(),
    enabled: !propUsers && hasRole("admin", "hr"),
  });
  const users = propUsers || fetchedUsers;
  const [name, setName] = useState(project.name);
  const [code, setCode] = useState(project.code);
  const [startDate, setStartDate] = useState(formatDateForInput(project.startDate));
  const [deadline, setDeadline] = useState(formatDateForInput(project.deadline));
  const [priority, setPriority] = useState<Priority>(project.priority);
  const [status, setStatus] = useState<string>(project.status || "active");
  const [description, setDescription] = useState(project.description ?? "");
  const [imageUrl, setImageUrl] = useState<string | undefined>(project.imageUrl);
  const [selected, setSelected] = useState<string[]>(project.memberIds || []);
  const [search, setSearch] = useState("");
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(project.name);
    setCode(project.code);
    setStartDate(formatDateForInput(project.startDate));
    setDeadline(formatDateForInput(project.deadline));
    setPriority(project.priority);
    setStatus(project.status || "active");
    setDescription(project.description ?? "");
    setImageUrl(project.imageUrl);
    setSelected(project.memberIds || []);
  }, [project]);

  const save = useMutation({
    mutationFn: () =>
      projectsApi.update(project.id, {
        name,
        code,
        description,
        priority,
        status,
        startDate: startDate || undefined,
        deadline: deadline || undefined,
        imageUrl,
        memberIds: selected,
      }),
    onSuccess: () => {
      toast.success("Project updated");
      qc.invalidateQueries({ queryKey: ["projects"] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be < 5 MB");
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadApi.upload(file);
      setImageUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-border bg-card/70 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">Edit project</div>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-5">
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_160px] gap-3">
            <Field label="Project Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Project Code">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled
                className="w-full rounded-xl border border-input bg-accent/30 px-3 py-2 text-sm font-mono tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Deadline">
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Priority">
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Members">
              <Popover open={memberDropdownOpen} onOpenChange={setMemberDropdownOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm flex items-center justify-between hover:bg-accent/40 transition text-left"
                  >
                    <span className="truncate">
                      {selected.length === 0
                        ? "Select members..."
                        : `${selected.length} member${selected.length === 1 ? "" : "s"}`}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-72 p-3 space-y-2.5 shadow-xl rounded-2xl border bg-popover z-50"
                  align="start"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Manage Project Members
                    </span>
                    {selected.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelected([])}
                        className="text-xs text-destructive hover:underline"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search employees..."
                      className="w-full rounded-xl border border-input bg-card pl-8 pr-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                    {users
                      .filter(
                        (u) =>
                          u.name.toLowerCase().includes(search.toLowerCase()) ||
                          u.email.toLowerCase().includes(search.toLowerCase()) ||
                          u.position.toLowerCase().includes(search.toLowerCase()),
                      )
                      .slice(0, 20)
                      .map((u) => {
                        const isSelected = selected.includes(u.id);
                        return (
                          <button
                            type="button"
                            key={u.id}
                            onClick={() =>
                              setSelected((p) =>
                                p.includes(u.id) ? p.filter((x) => x !== u.id) : [...p, u.id],
                              )
                            }
                            className={`w-full flex items-center gap-2 rounded-xl border p-2 text-left transition ${
                              isSelected
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-transparent hover:bg-accent/50"
                            }`}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={u.avatarUrl} />
                              <AvatarFallback>{u.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">{u.name}</div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {u.position}
                              </div>
                            </div>
                            {isSelected && (
                              <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                                <Check className="h-2.5 w-2.5" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </PopoverContent>
              </Popover>
            </Field>
          </div>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm"
            />
          </Field>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Project Image</label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full aspect-square rounded-2xl border-2 border-dashed border-border bg-accent/20 flex flex-col items-center justify-center gap-2 hover:bg-accent/40 transition relative overflow-hidden"
          >
            {imageUrl ? (
              <>
                <img
                  src={imageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageUrl(undefined);
                  }}
                  className="absolute top-2 right-2 rounded-full bg-card p-1 shadow"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <>
                <div className="h-10 w-10 rounded-xl bg-card flex items-center justify-center">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-xs font-medium">
                  {uploading ? "Uploading…" : "Click to upload"}
                </div>
              </>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <button
          onClick={() => save.mutate()}
          disabled={!name.trim() || save.isPending}
          className="rounded-xl bg-primary text-primary-foreground px-5 py-2 text-sm font-medium disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function ColumnHeader({
  status,
  label,
  count,
}: {
  status: TaskStatus;
  label: string;
  count: number;
}) {
  const dotColor = {
    todo: "bg-muted-foreground/40",
    in_progress: "bg-primary",
    in_review: "bg-warning",
    done: "bg-success",
  }[status];

  return (
    <div className="rounded-full bg-card border border-border px-2 py-1.5 text-xs font-medium flex items-center justify-center gap-1.5">
      <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
      <span className="truncate">{label}</span>
      <span className="text-muted-foreground shrink-0">({count})</span>
    </div>
  );
}

function Column({
  status,
  tasks,
  users,
  onSelect,
  project,
}: {
  status: TaskStatus;
  tasks: Task[];
  users: User[];
  onSelect: (id: string) => void;
  project: Project;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl min-h-[160px] p-1 transition ${isOver ? "bg-primary/5 ring-2 ring-primary/30" : ""}`}
    >
      <div className="space-y-2">
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            users={users}
            project={project}
            onSelect={() => onSelect(t.id)}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-10 rounded-xl bg-card/50">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}

function BacklogSection({
  tasks,
  users,
  onSelect,
  project,
}: {
  tasks: Task[];
  users: User[];
  onSelect: (id: string) => void;
  project: Project;
}) {
  return (
    <div className="rounded-xl bg-accent/30 p-2">
      <div className="text-center text-xs font-semibold text-muted-foreground mb-3">
        Backlog ({tasks.length}) <span className="opacity-70">— overdue & not done</span>
      </div>
      {tasks.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-10 rounded-xl bg-card/50">
          No backlog tasks
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              users={users}
              project={project}
              onSelect={() => onSelect(t.id)}
              overdue
            />
          ))}
        </div>
      )}
    </div>
  );
}

function taskCode(project: Project, task: Task) {
  const suffix = task.id.slice(-2).toUpperCase();
  return `${project.code}-${task.id.slice(2, 5).toUpperCase()}-${suffix}`;
}

function getAssigneeSpentHours(a: any, task: any, totalAssignees: number): number {
  if (!a) return 0;
  const direct =
    a.spentHours ??
    a.spent_hours ??
    a.totalSpentHours ??
    a.total_spent_hours ??
    a.hours ??
    a.spentTime ??
    a.spent_time;
  if (direct !== undefined && direct !== null) {
    const num = Number(direct);
    if (!isNaN(num)) return num;
  }
  if (a.id && task) {
    const fromMap =
      task.timeByUser?.[a.id] ??
      task.time_by_user?.[a.id] ??
      task.spentHoursByUser?.[a.id] ??
      task.spent_hours_by_user?.[a.id] ??
      task.assigneeHours?.[a.id] ??
      task.assignee_hours?.[a.id];
    if (fromMap !== undefined && fromMap !== null) {
      const num = Number(fromMap);
      if (!isNaN(num)) return num;
    }
  }
  if (totalAssignees === 1 && task) {
    const total = Number(
      task.spentHours ?? task.spent_hours ?? task.totalSpentHours ?? task.total_spent_hours ?? 0,
    );
    if (!isNaN(total)) return total;
  }
  return 0;
}

function TaskCard({
  task,
  users,
  project,
  dragging = false,
  onSelect,
  overdue,
}: {
  task: Task;
  users: User[];
  project: Project;
  dragging?: boolean;
  onSelect?: () => void;
  overdue?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  const assignees = (
    task.assignees && task.assignees.length > 0
      ? task.assignees.map((a: any) => {
          const u = users.find((x) => x.id === a.id);
          const sh = getAssigneeSpentHours(a, task, task.assignees!.length);
          return u
            ? { ...u, ...a, spentHours: sh, spent_hours: sh }
            : {
                ...a,
                id: a.id,
                name: a.name,
                avatarUrl: a.avatarUrl || a.avatar_url,
                position: a.position,
                spentHours: sh,
                spent_hours: sh,
              };
        })
      : (task.assigneeIds || [])
          .map((id) => {
            const u = users.find((u) => u.id === id);
            if (!u) return null;
            const sh = getAssigneeSpentHours(u, task, (task.assigneeIds || []).length);
            return { ...u, spentHours: sh, spent_hours: sh };
          })
          .filter(Boolean)
  ) as any[];
  return (
    <div
      ref={setNodeRef}
      className={`bg-card rounded-xl border ${overdue ? "border-destructive/40" : "border-border/60"} p-2.5 ${
        isDragging && !dragging ? "opacity-30" : ""
      } ${dragging ? "shadow-lg" : "shadow-sm"} cursor-pointer hover:ring-1 hover:ring-primary/30 transition`}
      onClick={(e) => {
        if (!isDragging) onSelect?.();
        e.stopPropagation();
      }}
    >
      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
        <div className="text-[10px] text-muted-foreground">{taskCode(project, task)}</div>
        <div className="text-sm font-medium mb-2 mt-0.5">{task.name}</div>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent/60 px-2 py-0.5">{task.estimateHours}h</span>
          <Chip tone={priorityTone(task.priority)}>↑ {task.priority}</Chip>
        </div>
        <div className="flex -space-x-1.5">
          {assignees.slice(0, 3).map((a) => (
            <Avatar key={a.id} className="h-6 w-6 ring-2 ring-card" title={a.name}>
              <AvatarImage src={a.avatarUrl || a.avatar_url} />
              <AvatarFallback>{(a.name || "?")[0]}</AvatarFallback>
            </Avatar>
          ))}
          {assignees.length > 3 && (
            <span className="h-6 min-w-6 px-1 rounded-full bg-accent text-[10px] flex items-center justify-center ring-2 ring-card">
              +{assignees.length - 3}
            </span>
          )}
          {assignees.length === 0 && (
            <Avatar className="h-6 w-6">
              <AvatarFallback>?</AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- Task Details ----------------

function TaskDetails({
  task,
  users,
  project,
  onBack,
}: {
  task: Task;
  users: User[];
  project: Project;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [editing, setEditing] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);

  // Local edit state
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task.assigneeIds || []);
  const [estimateHours, setEstimateHours] = useState(task.estimateHours);
  const [dueDate, setDueDate] = useState(formatDateForInput(task.dueDate));
  const [attachments, setAttachments] = useState<string[]>(task.attachments ?? []);
  const [links, setLinks] = useState<string[]>(task.links ?? []);

  useEffect(() => {
    setName(task.name);
    setDescription(task.description ?? "");
    setStatus(task.status);
    setPriority(task.priority);
    setAssigneeIds(task.assigneeIds || []);
    setEstimateHours(task.estimateHours);
    setDueDate(formatDateForInput(task.dueDate));
    setAttachments(task.attachments ?? []);
    setLinks(task.links ?? []);
    setEditing(false);
  }, [task]);

  const update = useMutation({
    mutationFn: (patch: Partial<Task>) => tasksApi.update(task.id, patch),
    onSuccess: () => {
      toast.success("Task updated");
      qc.invalidateQueries({ queryKey: ["tasks", project.id] });
      qc.invalidateQueries({ queryKey: ["task", task.id] });
    },
  });

  const moveStatus = useMutation({
    mutationFn: (status: TaskStatus) => tasksApi.moveStatus(task.id, status),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["tasks", project.id] });
      qc.invalidateQueries({ queryKey: ["task", task.id] });
    },
  });

  const logTime = useMutation({
    mutationFn: ({ userId, hours }: { userId: string; hours: number }) =>
      tasksApi.logTime(task.id, userId, hours),
    onSuccess: () => {
      toast.success("Time logged");
      qc.invalidateQueries({ queryKey: ["tasks", project.id] });
      qc.invalidateQueries({ queryKey: ["task", task.id] });
    },
  });

  const assignees = (
    task.assignees && task.assignees.length > 0
      ? task.assignees.map((a: any) => {
          const u = users.find((x) => x.id === a.id);
          const sh = getAssigneeSpentHours(a, task, task.assignees!.length);
          return u
            ? { ...u, ...a, spentHours: sh, spent_hours: sh }
            : {
                ...a,
                id: a.id,
                name: a.name,
                avatarUrl: a.avatarUrl || a.avatar_url,
                position: a.position,
                spentHours: sh,
                spent_hours: sh,
              };
        })
      : (task.assigneeIds || [])
          .map((id) => {
            const u = users.find((u) => u.id === id);
            if (!u) return null;
            const sh = getAssigneeSpentHours(u, task, (task.assigneeIds || []).length);
            return { ...u, spentHours: sh, spent_hours: sh };
          })
          .filter(Boolean)
  ) as any[];
  const overdue = task.dueDate && isOverdue(task.dueDate) && task.status !== "done";
  const isAssignee = !!me && (task.assigneeIds || []).includes(me.id);
  const myLogged =
    (me && assignees.find((a: any) => a.id === me.id)?.spentHours) ??
    (me && getAssigneeSpentHours({ id: me.id }, task, assignees.length)) ??
    Number(task.spentHours ?? (task as any).spent_hours ?? 0);

  function saveEdits() {
    if (!name.trim()) {
      toast.error("Task name is required");
      return;
    }
    update.mutate({
      name,
      description,
      status,
      priority,
      assigneeIds,
      estimateHours,
      dueDate: dueDate || undefined,
      attachments,
      links,
    });
    setEditing(false);
  }

  function toggleAssignee(id: string) {
    setAssigneeIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back to board
        </button>
        <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-muted-foreground">{taskCode(project, task)}</div>
              {editing ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full text-lg font-semibold rounded-lg border border-input px-3 py-1.5"
                />
              ) : (
                <h2 className="text-lg font-semibold mt-1">{task.name}</h2>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={editing ? status : task.status}
                onValueChange={(v) => {
                  if (editing) {
                    setStatus(v as TaskStatus);
                  } else {
                    moveStatus.mutate(v as TaskStatus);
                  }
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To-Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
              <button
                onClick={() => (editing ? saveEdits() : setEditing(true))}
                disabled={editing && (!name.trim() || update.isPending)}
                className={`rounded-lg border p-2 disabled:opacity-50 transition ${editing ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90" : "bg-card border-border hover:bg-accent"}`}
                title={editing ? "Save" : "Edit"}
              >
                {editing ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          {editing ? (
            <div className="space-y-3">
              <Field label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Estimate (hours)">
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={estimateHours}
                    onChange={(e) => setEstimateHours(Number(e.target.value))}
                    className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Deadline">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Priority">
                  <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Assignees (Optional)">
                <Popover open={assigneeDropdownOpen} onOpenChange={setAssigneeDropdownOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm flex items-center justify-between hover:bg-accent/40 transition text-left"
                    >
                      <span className="truncate">
                        {assigneeIds.length === 0
                          ? "Select assignees..."
                          : `${assigneeIds.length} assignee${assigneeIds.length === 1 ? "" : "s"}`}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-72 p-3 space-y-2.5 shadow-xl rounded-2xl border bg-popover z-50"
                    align="start"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Manage Assignees
                      </span>
                      {assigneeIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setAssigneeIds([])}
                          className="text-xs text-destructive hover:underline"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        value={assigneeSearch}
                        onChange={(e) => setAssigneeSearch(e.target.value)}
                        placeholder="Search users..."
                        className="w-full rounded-xl border border-input bg-card pl-8 pr-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                      {users
                        .filter(
                          (u) =>
                            u.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                            u.email.toLowerCase().includes(assigneeSearch.toLowerCase()),
                        )
                        .map((u) => {
                          const sel = assigneeIds.includes(u.id);
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => toggleAssignee(u.id)}
                              className={`w-full flex items-center gap-2 rounded-lg p-1.5 text-left transition ${sel ? "bg-primary/10" : "hover:bg-accent/40"}`}
                            >
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={u.avatarUrl} />
                                <AvatarFallback>{u.name[0]}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm flex-1 truncate">{u.name}</span>
                              {sel && <Check className="h-4 w-4 text-primary" />}
                            </button>
                          );
                        })}
                      {users.filter(
                        (u) =>
                          u.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                          u.email.toLowerCase().includes(assigneeSearch.toLowerCase()),
                      ).length === 0 && (
                        <div className="text-center py-4 text-xs text-muted-foreground">
                          No users found.
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </Field>
              <AttachmentsLinksEditor
                attachments={attachments}
                setAttachments={setAttachments}
                links={links}
                setLinks={setLinks}
              />
            </div>
          ) : (
            <>
              {task.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">
                  {task.description}
                </p>
              )}
              <div className="text-xs font-medium mb-2">Attachments & Links</div>
              {(task.attachments?.length ?? 0) === 0 && (task.links?.length ?? 0) === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-accent/20 py-8 px-4 text-center">
                  <Paperclip className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
                  <div className="text-sm text-muted-foreground">No attachments yet</div>
                  <button
                    onClick={() => setEditing(true)}
                    className="text-sm text-primary hover:underline mt-1"
                  >
                    Click to add attachments
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {task.attachments?.map((a, i) => (
                    <a
                      key={i}
                      href={a}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm text-primary hover:underline truncate"
                    >
                      📎 Attachment {i + 1}
                    </a>
                  ))}
                  {task.links?.map((l, i) => (
                    <a
                      key={i}
                      href={normalizeExternalUrl(l)}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm text-primary hover:underline truncate"
                    >
                      🔗 {l}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right sidebar — task info */}
      <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm space-y-4 h-fit">
        <h3 className="font-semibold">Task Info</h3>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Assignees ({assignees.length})</div>
          {assignees.length === 0 ? (
            <div className="text-sm text-muted-foreground">Unassigned</div>
          ) : (
            <div className="space-y-1.5">
              {assignees.map((a) => (
                <div key={a.id} className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={a.avatarUrl || a.avatar_url} />
                    <AvatarFallback>{(a.name || "?")[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{a.name}</div>
                    {a.position && (
                      <div className="text-[11px] text-muted-foreground">{a.position}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Priority</div>
          <div className="mt-1">
            <Chip tone={priorityTone(task.priority)}>↑ {task.priority}</Chip>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 p-3 space-y-2">
          <div className="text-sm font-semibold">Time Tracking</div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold tabular-nums">
                {Number(
                  task.spentHours ??
                    (task as any).spent_hours ??
                    task.totalSpentHours ??
                    (task as any).total_spent_hours ??
                    assignees.reduce(
                      (acc: number, x: any) => acc + Number(x.spentHours ?? x.spent_hours ?? 0),
                      0,
                    ),
                )}
                h
              </span>
              <span className="text-xs text-muted-foreground">/ {task.estimateHours}h</span>
            </div>
            <span className="text-[11px] text-muted-foreground">Total logged time</span>
          </div>
          <div className="h-1.5 bg-accent rounded-full overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{
                width: `${Math.min(100, (Number(task.spentHours ?? (task as any).spent_hours ?? task.totalSpentHours ?? (task as any).total_spent_hours ?? 0) / Math.max(0.01, task.estimateHours)) * 100)}%`,
              }}
            />
          </div>
          {assignees.length > 0 && (
            <div className="space-y-1 pt-1">
              {assignees.map((a) => {
                const h = Number(
                  a.spentHours ?? a.spent_hours ?? getAssigneeSpentHours(a, task, assignees.length),
                );
                return (
                  <div key={a.id} className="flex items-center gap-2 text-xs">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={a.avatarUrl || a.avatar_url} />
                      <AvatarFallback>{(a.name || "?")[0]}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate text-muted-foreground">
                      {a.name}
                      {me?.id === a.id ? " (you)" : ""}
                    </span>
                    <span className="tabular-nums font-medium">{h}h</span>
                  </div>
                );
              })}
            </div>
          )}
          {isAssignee && (
            <button
              onClick={() => setLogOpen(true)}
              className="w-full mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-2 text-sm font-medium hover:bg-primary/90"
            >
              <Clock className="h-4 w-4" /> Log my time
            </button>
          )}
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Due Date</div>
          <div className={`text-sm font-medium mt-1 ${overdue ? "text-destructive" : ""}`}>
            {task.dueDate ? safeFormat(task.dueDate, "yyyy-MM-dd") : "—"}
          </div>
        </div>

        <div className="border-t pt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarIcon className="h-3 w-3" /> Created {safeFormat(task.createdAt, "yyyy-MM-dd")}
        </div>
      </div>

      {me && (
        <LogTimeDialog
          open={logOpen}
          onOpenChange={setLogOpen}
          currentSpent={myLogged}
          onSave={(h) => {
            logTime.mutate({ userId: me.id, hours: h });
            setLogOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function LogTimeDialog({
  open,
  onOpenChange,
  currentSpent,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentSpent: number;
  onSave: (h: number) => void;
}) {
  const [hours, setHours] = useState(currentSpent);
  useEffect(() => {
    if (open) setHours(currentSpent);
  }, [open, currentSpent]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log time</DialogTitle>
        </DialogHeader>
        <Field label="Total time spent (hours) *">
          <input
            type="number"
            min={0.25}
            step={0.25}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm"
          />
        </Field>
        <div className="flex justify-end">
          <button
            onClick={() => onSave(hours)}
            disabled={hours <= 0 || isNaN(hours)}
            className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Add Project ----------------

function AddProjectDialog({
  open,
  onOpenChange,
  project,
  users: propUsers,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project?: Project;
  users?: User[];
}) {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const { data: fetchedUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.list(),
    enabled: !propUsers && open && hasRole("admin", "hr"),
  });
  const users = propUsers || fetchedUsers;
  const isEdit = !!project;
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (project) {
        setName(project.name);
        setCode(project.code);
        setStartDate(formatDateForInput(project.startDate));
        setDeadline(formatDateForInput(project.deadline));
        setPriority(project.priority);
        setDescription(project.description ?? "");
        setImageUrl(project.imageUrl);
        setSelected(project.memberIds || []);
        setSearch("");
      } else {
        setName("");
        setStartDate("");
        setDeadline("");
        setPriority("medium");
        setDescription("");
        setImageUrl(undefined);
        setCode(`PN${String(Math.floor(Math.random() * 9_000_000) + 1_000_000)}`);
        setSelected([]);
        setSearch("");
      }
    }
  }, [open, project]);

  const save = useMutation({
    mutationFn: () => {
      const body: Partial<Project> = {
        name,
        code,
        description,
        priority,
        startDate: startDate || undefined,
        deadline: deadline || undefined,
        imageUrl,
        memberIds: selected,
      };
      return isEdit ? projectsApi.update(project!.id, body) : projectsApi.create(body);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Project updated" : "Project created");
      qc.invalidateQueries({ queryKey: ["projects"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be < 5 MB");
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadApi.upload(file);
      setImageUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.position.toLowerCase().includes(search.toLowerCase()),
  );

  function toggleMember(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Project" : "Create New Project"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-5 py-2">
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_160px] gap-3">
              <Field label="Project Name *">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Project Name"
                  className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm"
                />
              </Field>
              <Field label="Project Code *">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-xl border border-input bg-accent/30 px-3 py-2.5 text-sm font-mono tracking-wider"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date (Optional)">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm"
                />
              </Field>
              <Field label="Deadline (Optional)">
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Priority">
                <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Members (Optional)">
                <Popover open={memberDropdownOpen} onOpenChange={setMemberDropdownOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm flex items-center justify-between hover:bg-accent/40 transition text-left"
                    >
                      <span className="truncate">
                        {selected.length === 0
                          ? "Select members..."
                          : `${selected.length} member${selected.length === 1 ? "" : "s"} selected`}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-80 p-3 space-y-2.5 shadow-xl rounded-2xl border bg-popover z-50"
                    align="start"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Select Project Members
                      </span>
                      {selected.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelected([])}
                          className="text-xs text-destructive hover:underline"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search employees to assign..."
                        className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                      {filteredUsers.length === 0 ? (
                        <div className="text-xs text-muted-foreground text-center py-4">
                          No employees found
                        </div>
                      ) : (
                        filteredUsers.slice(0, 20).map((u) => {
                          const isSelected = selected.includes(u.id);
                          return (
                            <button
                              type="button"
                              key={u.id}
                              onClick={() => toggleMember(u.id)}
                              className={`w-full flex items-center gap-2 rounded-xl border p-2 text-left transition ${
                                isSelected
                                  ? "border-primary bg-primary/10 text-foreground"
                                  : "border-transparent hover:bg-accent/50"
                              }`}
                            >
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={u.avatarUrl} />
                                <AvatarFallback>{u.name[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium truncate">{u.name}</div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {u.position} · {u.email}
                                </div>
                              </div>
                              {isSelected && (
                                <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                                  <Check className="h-2.5 w-2.5" />
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </Field>
            </div>

            <Field label="Description (Optional)">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add some description of the project"
                rows={3}
                className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm"
              />
            </Field>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Project Image (Optional)</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full aspect-square rounded-2xl border-2 border-dashed border-border bg-accent/20 flex flex-col items-center justify-center gap-2 hover:bg-accent/40 transition relative overflow-hidden"
            >
              {imageUrl ? (
                <>
                  <img
                    src={imageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageUrl(undefined);
                    }}
                    className="absolute top-2 right-2 rounded-full bg-card p-1 shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-xl bg-card flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-sm font-medium">
                    {uploading ? "Uploading…" : "Click or drag to upload"}
                  </div>
                  <div className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</div>
                </>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
            <p className="text-xs text-muted-foreground">
              A cover image helps your team spot this project at a glance.
            </p>
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button
            onClick={() => save.mutate()}
            disabled={!name.trim() || !code.trim() || save.isPending}
            className="rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {save.isPending ? "Saving…" : isEdit ? "Save Changes" : "Save Project"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Add Task ----------------

function AddTaskDialog({
  open,
  onOpenChange,
  project,
  users,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: Project;
  users: User[];
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [estH, setEstH] = useState<number>(1);
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [links, setLinks] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setName("");
      setEstH(1);
      setDeadline("");
      setPriority("medium");
      setSearch("");
      setSelected([]);
      setDescription("");
      setAttachments([]);
      setLinks([]);
    }
  }, [open]);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const create = useMutation({
    mutationFn: () =>
      tasksApi.create({
        projectId: project.id,
        name,
        description,
        priority,
        status: "todo",
        assigneeIds: selected,
        estimateHours: estH,
        dueDate: deadline || undefined,
        attachments,
        links,
      }),
    onSuccess: () => {
      toast.success("Task created");
      qc.invalidateQueries({ queryKey: ["tasks", project.id] });
      onOpenChange(false);
    },
  });

  function toggle(id: string) {
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Task Name *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter task name"
              className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Estimate (hours)">
              <input
                type="number"
                min={0}
                step={0.5}
                value={estH}
                onChange={(e) => setEstH(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm"
              />
            </Field>
            <Field label="Deadline (Optional)">
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm"
              />
            </Field>
          </div>

          <Field label="Priority">
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">
                Assignees{selected.length > 0 && ` (${selected.length} selected)`}
              </label>
              {selected.length > 0 && (
                <button
                  onClick={() => setSelected([])}
                  className="text-xs text-destructive hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employees..."
                className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-2 text-sm"
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {filteredUsers.slice(0, 20).map((u) => {
                const isSelected = selected.includes(u.id);
                return (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => toggle(u.id)}
                    className={`w-full flex items-center gap-2 rounded-xl border p-2.5 text-left transition ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent/40"
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.avatarUrl} />
                      <AvatarFallback>{u.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{u.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {u.position} · {u.email}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {selected.length > 1 && (
              <p className="text-xs text-muted-foreground">
                One task will be created with {selected.length} assignees.
              </p>
            )}
          </div>

          <Field label="Description (Optional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add some description of the task."
              rows={3}
              className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm"
            />
          </Field>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Attachments & Links (Optional)</label>
            <AttachmentsLinksEditor
              attachments={attachments}
              setAttachments={setAttachments}
              links={links}
              setLinks={setLinks}
            />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button
            onClick={() => create.mutate()}
            disabled={!name.trim() || create.isPending}
            className="rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            Create Task
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AttachmentsLinksEditor({
  attachments,
  setAttachments,
  links,
  setLinks,
}: {
  attachments: string[];
  setAttachments: (v: string[]) => void;
  links: string[];
  setLinks: (v: string[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [newLink, setNewLink] = useState("");

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    try {
      const urls = await Promise.all(files.map((f) => uploadApi.upload(f).then((r) => r.url)));
      setAttachments([...attachments, ...urls]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="h-10 w-10 rounded-full bg-purple/80 text-purple-foreground shadow-sm flex items-center justify-center hover:brightness-110 transition"
          title="Add file"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input ref={fileRef} type="file" multiple hidden onChange={onFiles} />
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="h-10 w-10 rounded-full bg-info/80 text-info-foreground shadow-sm flex items-center justify-center hover:brightness-110 transition"
              title="Add link"
            >
              <Link2 className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-2">
            <label className="text-xs text-muted-foreground">URL</label>
            <input
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-input px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                if (newLink.trim()) {
                  setLinks([...links, newLink.trim()]);
                  setNewLink("");
                }
              }}
              className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm font-medium"
            >
              Add link
            </button>
          </PopoverContent>
        </Popover>
      </div>
      {(attachments.length > 0 || links.length > 0) && (
        <div className="space-y-1.5">
          {attachments.map((a, i) => (
            <div
              key={`a-${i}`}
              className="flex items-center justify-between text-xs rounded-lg bg-accent/40 px-2 py-1.5"
            >
              <a
                href={a}
                target="_blank"
                rel="noreferrer"
                className="truncate text-primary hover:underline"
              >
                📎 Attachment {i + 1}
              </a>
              <button
                type="button"
                onClick={() => setAttachments(attachments.filter((_, j) => j !== i))}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {links.map((l, i) => (
            <div
              key={`l-${i}`}
              className="flex items-center justify-between text-xs rounded-lg bg-accent/40 px-2 py-1.5"
            >
              <a
                href={normalizeExternalUrl(l)}
                target="_blank"
                rel="noreferrer"
                className="truncate text-primary hover:underline"
              >
                🔗 {l}
              </a>
              <button type="button" onClick={() => setLinks(links.filter((_, j) => j !== i))}>
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
