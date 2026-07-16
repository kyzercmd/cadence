import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ProfileView } from "@/components/profile/ProfileView";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "My Profile — Cadence" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, role, updateUser } = useAuth();
  if (!user || !role) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>
      <ProfileView
        user={user}
        viewerRole={role}
        isSelf
        onUpdated={(u) => updateUser(u)}
      />
    </div>
  );
}
