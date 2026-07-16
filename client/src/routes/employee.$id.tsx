import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { usersApi } from "@/lib/api/users.api";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ProfileView } from "@/components/profile/ProfileView";

export const Route = createFileRoute("/employee/$id")({
  head: () => ({ meta: [{ title: "Employee — Cadence" }] }),
  component: EmployeeDetailPage,
});

function EmployeeDetailPage() {
  const { id } = useParams({ from: "/employee/$id" });
  const navigate = useNavigate();
  const { hasRole, role, user: viewer } = useAuth();

  useEffect(() => {
    if (!hasRole("admin", "hr")) navigate({ to: "/" });
  }, [hasRole, navigate]);

  const { data: user, isLoading } = useQuery({
    queryKey: ["users", id],
    queryFn: () => usersApi.get(id),
  });

  if (!hasRole("admin", "hr") || !role) return null;
  if (isLoading || !user) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate({ to: "/employees" })}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to employees
      </button>
      <h1 className="text-2xl font-bold">{user.name}</h1>
      <ProfileView user={user} viewerRole={role} isSelf={viewer?.id === user.id} />
    </div>
  );
}
