import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderKanban,
  Calendar,
  Plane,
  Users,
  LogOut,
  UserCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";

import { cn } from "@/lib/utils";
import type { Role } from "@/lib/api/types";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  roles?: Role[];
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/attendance", label: "Attendance", icon: Calendar },
  { to: "/leave", label: "Leave", icon: Plane },
  { to: "/employees", label: "Employees", icon: Users, roles: ["admin", "hr"] },
  { to: "/profile", label: "Profile", icon: UserCircle },
];

export function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, role, logout } = useAuth();

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex py-4 items-center box mx-auto">
        <img src="/logo7.png" alt="Logo" className="h-11 object-contain" />
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          if (item.roles && (!role || !item.roles.includes(role))) return null;
          const isActive = item.exact
            ? pathname === item.to
            : pathname.startsWith(item.to) && item.to !== "/";
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <span className="absolute -right-3 inset-y-0 w-1.5 bg-primary rounded-l-md" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="m-4 rounded-2xl bg-accent/50 p-3 text-center">
        <img src="/help.svg" alt="Support" className="h-24 w-full mb-2" />
        <button className="w-full rounded-xl bg-primary text-primary-foreground text-sm font-medium py-2 hover:bg-primary/90 transition">
          Support
        </button>
      </div>

      <button
        onClick={() => void logout()}
        className="m-4 mt-0 flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <LogOut className="h-4 w-4" /> Logout
        {user && <span className="ml-auto text-xs truncate">{user.name.split(" ")[0]}</span>}
      </button>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden lg:flex sticky top-0 h-screen w-60 shrink-0 flex-col bg-sidebar border-r border-sidebar-border relative">
      <SidebarBody />
    </aside>
  );
}
