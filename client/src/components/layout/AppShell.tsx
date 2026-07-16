import { type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import { LoginPage } from "@/components/auth/LoginPage";

export function AppShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const isNavigating = useRouterState({
    select: (s) => s.status === "pending" || s.isLoading || s.isTransitioning,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 px-4 md:px-8 py-6 relative">
          {isNavigating && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm pointer-events-none">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
