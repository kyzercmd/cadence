import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authApi } from "@/lib/api/auth.api";
import { setAuthToken, setRefreshToken, setOnAuthFailure } from "@/lib/api/client";
import type { Role, User } from "@/lib/api/types";

interface AuthContextValue {
  user: User | null;
  role: Role | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
  updateUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── JWT helpers ───────────────────────────────────────────────────────────────
/** Extract `exp` (seconds) from a JWT without a library. Returns null if invalid. */
function getJwtExp(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof decoded.exp === "number" ? decoded.exp : null;
  } catch {
    return null;
  }
}

/** Returns ms until 60 seconds before the token expires. Negative means already near/past expiry. */
function msUntilRefresh(token: string): number {
  const exp = getJwtExp(token);
  if (!exp) return -1;
  return exp * 1000 - Date.now() - 60_000; // 60s buffer
}

// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Schedule proactive silent refresh ───────────────────────────────────────
  const scheduleRefresh = useCallback((token: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    const delay = msUntilRefresh(token);
    if (delay <= 0) {
      // Token already near expiry — refresh immediately
      void silentRefresh();
      return;
    }

    refreshTimerRef.current = setTimeout(() => {
      void silentRefresh();
    }, delay);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const silentRefresh = useCallback(async () => {
    try {
      const session = await authApi.refresh();
      setUser(session.user);
      scheduleRefresh(session.token);
    } catch {
      // Refresh token expired or revoked — force logout
      doLogout();
    }
  }, [scheduleRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Logout (shared between manual + forced) ──────────────────────────────────
  const doLogout = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    authApi.logout(); // clears localStorage + in-memory tokens
    setUser(null);
  }, []);

  // ── Boot: hydrate from localStorage ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    // Register the forced-logout callback for 401s that survive the retry
    setOnAuthFailure(doLogout);

    const token = localStorage.getItem("crm_token");
    const rt = localStorage.getItem("crm_refresh_token");
    const cachedUser = localStorage.getItem("crm_user");

    if (token && rt) {
      // Restore in-memory token state (client.ts reads from localStorage on init,
      // but we re-set explicitly to ensure the module-level vars are current)
      setAuthToken(token);
      setRefreshToken(rt);

      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser) as User);
        } catch {
          /* ignore corrupt cache */
        }
      }

      // Schedule proactive refresh based on stored token
      scheduleRefresh(token);
    }

    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Login ────────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string) => {
      const session = await authApi.login(email, password);
      setUser(session.user);
      scheduleRefresh(session.token);
    },
    [scheduleRefresh],
  );

  // ── Logout (public API) ───────────────────────────────────────────────────────
  const logout = useCallback(() => {
    doLogout();
  }, [doLogout]);

  // ── updateUser ────────────────────────────────────────────────────────────────
  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((u) => {
      if (!u) return u;
      const next = { ...u, ...patch };
      if (typeof window !== "undefined") {
        localStorage.setItem("crm_user", JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      loading,
      isAuthenticated: !!user,
      login,
      logout,
      hasRole: (...roles: Role[]) => (user ? roles.includes(user.role) : false),
      updateUser,
    }),
    [user, loading, login, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
