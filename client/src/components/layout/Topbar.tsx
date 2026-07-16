import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  Loader2,
  Users,
  FolderKanban,
  CheckSquare,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { notificationsApi } from "@/lib/api/notifications.api";
import { searchApi, type SearchResult } from "@/lib/api/search.api";
import { useDebounce } from "@/hooks/use-debounce";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarBody } from "./AppSidebar";
import { Chip, statusTone, statusLabel } from "@/components/ui/chip";
import type { TaskStatus } from "@/lib/api/types";
import { formatDistanceToNow } from "date-fns";

export function Topbar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: notes = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
  });
  const unread = notes.filter((n) => !n.read).length;

  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          if (currentScrollY > lastScrollY && currentScrollY > 60) {
            setHidden(true);
          } else {
            setHidden(false);
          }
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-20 flex items-center gap-3 px-4 md:px-8 py-4 bg-background/80 backdrop-blur-md border-b border-border/50 transition-transform duration-300 ease-in-out ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <button
            className="lg:hidden rounded-full bg-card border border-border hover:border-primary/40 p-2.5 shrink-0 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4 text-muted-foreground" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarBody onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <GlobalSearch />

      <div className="ml-auto flex items-center gap-3 shrink-0">
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative rounded-full bg-card border border-border hover:border-primary/40 p-2.5 transition-colors">
              <Bell className="h-4 w-4 text-muted-foreground" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="font-medium text-sm">Notifications</span>
              <button
                onClick={async () => {
                  await notificationsApi.markAllRead();
                  qc.invalidateQueries({ queryKey: ["notifications"] });
                }}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notes.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No notifications
                </div>
              )}
              {notes.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b last:border-0 ${n.read ? "" : "bg-accent/40"}`}
                >
                  <div className="text-sm font-medium">{n.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full bg-card border border-border hover:border-primary/40 pl-1 pr-3 py-1 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium truncate max-w-[120px]">
                {user?.name}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
              {user?.email}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void logout()}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounced = useDebounce(q, 300);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data = [], isFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchApi.global(debounced),
    enabled: debounced.trim().length > 0,
    staleTime: 15_000,
  });

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+K or Ctrl+F focuses search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isK = e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey);
      const isF = e.key.toLowerCase() === "f" && (e.metaKey || e.ctrlKey);
      const isSlash =
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !(document.activeElement instanceof HTMLInputElement) &&
        !(document.activeElement instanceof HTMLTextAreaElement);
      if (isK || isF || isSlash) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
      if (e.key === "Escape") {
        inputRef.current?.blur();
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const results = data as SearchResult[];

  // Normalize backend URLs (e.g. /employees/{id}) to frontend routes
  const toFrontendUrl = (r: SearchResult): string => {
    if (r.type === "employee" || r.type === "user") {
      const m = r.url.match(/^\/employees\/(.+)$/);
      if (m) return `/employee/${m[1]}`;
    }
    if (r.type === "project") {
      const m = r.url.match(/^\/projects\/(.+)$/);
      if (m) return `/projects?projectId=${m[1]}`;
    }
    if (r.type === "task") {
      const m = r.url.match(/^\/projects\/(.+)$/);
      if (m) return `/projects?projectId=${m[1]}&taskId=${r.id}`;
    }
    return r.url;
  };

  // Normalize types: backend uses "user"; UI categorizes as "employee"
  const catKey = (t: string) => {
    const k = t.toLowerCase();
    if (k === "user" || k === "employee") return "employee";
    return k;
  };

  const grouped = useMemo(() => {
    const g: Record<string, SearchResult[]> = { employee: [], task: [], project: [] };
    for (const r of results) {
      const key = catKey(r.type);
      if (!g[key]) g[key] = [];
      g[key].push(r);
    }
    return g;
  }, [results]);

  const categories: Array<{
    key: string;
    label: string;
    icon: typeof Users;
    iconClass: string;
    chipClass: string;
    chipLabel: string;
  }> = [
    {
      key: "employee",
      label: "Employees",
      icon: Users,
      iconClass: "bg-info/15 text-info",
      chipClass: "bg-info/10 text-info",
      chipLabel: "employee",
    },
    {
      key: "task",
      label: "Tasks",
      icon: CheckSquare,
      iconClass: "bg-success/15 text-success",
      chipClass: "bg-success/10 text-success",
      chipLabel: "task",
    },
    {
      key: "project",
      label: "Projects",
      icon: FolderKanban,
      iconClass: "bg-purple/15 text-purple",
      chipClass: "bg-purple/10 text-purple",
      chipLabel: "project",
    },
  ];

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md min-w-0">
      <div
        className={`flex items-center gap-2 rounded-full pl-4 pr-3 py-2 transition-all duration-200 border ${
          focused
            ? "bg-card border-primary/50 ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
            : "bg-card border-border hover:border-primary/40"
        }`}
      >
        <Search
          className={`h-4 w-4 shrink-0 transition-colors ${focused ? "text-primary" : "text-muted-foreground"}`}
        />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
          }}
          onBlur={() => setFocused(false)}
          placeholder="Search anything..."
          className="flex-1 bg-transparent text-sm outline-none min-w-0"
        />
        {isFetching && debounced ? (
          <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
        ) : (
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-semibold text-muted-foreground">
            <span className="text-sm leading-none">⌘</span>
            <span>K</span>
          </kbd>
        )}
      </div>

      {open && debounced.trim() && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-xl bg-card shadow-lg border border-border overflow-hidden z-30 max-h-96 overflow-y-auto">
          {results.length === 0 && !isFetching ? (
            <div className="p-4 text-sm text-muted-foreground text-center">No results</div>
          ) : (
            categories.map((cat) => {
              const items = grouped[cat.key] ?? [];
              if (items.length === 0) return null;
              const Icon = cat.icon;
              return (
                <div key={cat.key} className="border-b border-border/60 last:border-0">
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted/60">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${cat.iconClass}`}
                    >
                      <Icon className="h-3 w-3" />
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {cat.label}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {items.length}
                    </span>
                  </div>
                  {items.map((r) => (
                    <button
                      key={`${r.type}-${r.id}`}
                      onClick={() => {
                        setOpen(false);
                        setQ("");
                        navigate({ to: toFrontendUrl(r) });
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-accent flex items-center gap-3"
                    >
                      <span
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cat.iconClass}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{r.title}</div>
                        {r.type === "task" ? (
                          <div className="mt-1">
                            <Chip tone={statusTone(r.subtitle as TaskStatus)}>{statusLabel(r.subtitle as TaskStatus)}</Chip>
                          </div>
                        ) : r.type === "project" ? (
                          <div className="mt-1">
                            <Chip tone={r.subtitle === "completed" ? "success" : "info"}>
                              {r.subtitle === "completed" ? "Completed" : "Active"}
                            </Chip>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground truncate mt-0.5">{r.subtitle}</div>
                        )}
                      </div>
                      <span
                        className={`text-[10px] uppercase tracking-wide shrink-0 px-2 py-0.5 rounded-full ${cat.chipClass}`}
                      >
                        {cat.chipLabel}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
