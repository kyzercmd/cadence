import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";

const DEMO = [
  { role: "Admin", email: "admin@cadence.io", password: "admin" },
  { role: "HR", email: "hr@cadence.io", password: "hr" },
  { role: "Employee", email: "employee@cadence.io", password: "employee" },
];

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@cadence.io");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(d: (typeof DEMO)[number]) {
    setEmail(d.email);
    setPassword(d.password);
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      <div className="hidden md:flex items-center justify-center bg-accent/40">
        <img src="/meetblue.svg" alt="Sign In" className="max-w-md w-full" />
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <div className="flex items-center gap-1 mb-6">
            <img src="/logo7.png" alt="Logo" className="object-contain" />
          </div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account.</p>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
              required
            />
          </div>
          {error && <div className="text-sm text-destructive">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary text-primary-foreground font-medium py-2.5 hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div className="rounded-xl border border-border/60 bg-accent/30 p-3 space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              Demo accounts — click to fill:
            </div>
            <div className="space-y-1">
              {DEMO.map((d) => (
                <button
                  type="button"
                  key={d.email}
                  onClick={() => fillDemo(d)}
                  className="w-full flex items-center justify-between text-left rounded-lg px-3 py-2 text-xs bg-card hover:bg-accent transition"
                >
                  <span className="font-semibold">{d.role}</span>
                  <span className="text-muted-foreground">
                    {d.email} <span className="opacity-50">/</span> {d.password}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
