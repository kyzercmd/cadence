// API client with seamless JWT refresh.
// - On any 401, pauses the failed request, calls /api/auth/refresh once,
//   then replays all queued requests with the new token.
// - If the refresh itself fails, calls onAuthFailure() (set by AuthProvider).

import { mockHandle } from "./mock/handler";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;
const USE_MOCK =
  (import.meta.env.VITE_USE_MOCK as string | undefined) !== "false" && !BASE_URL;

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface ApiRequest {
  method: HttpMethod;
  path: string;
  query?: Record<string, unknown>;
  body?: unknown;
}

// ── Token storage ────────────────────────────────────────────────────────────
let authToken: string | null =
  typeof window !== "undefined" ? localStorage.getItem("crm_token") : null;
let refreshToken: string | null =
  typeof window !== "undefined" ? localStorage.getItem("crm_refresh_token") : null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("crm_token", token);
  else localStorage.removeItem("crm_token");
}

export function getAuthToken() {
  return authToken;
}

export function setRefreshToken(token: string | null) {
  refreshToken = token;
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("crm_refresh_token", token);
  else localStorage.removeItem("crm_refresh_token");
}

export function getRefreshToken() {
  return refreshToken;
}

// ── Auth-failure callback (set by AuthProvider) ───────────────────────────────
let onAuthFailure: (() => void) | null = null;

export function setOnAuthFailure(cb: () => void) {
  onAuthFailure = cb;
}

// ── Refresh state ─────────────────────────────────────────────────────────────
// Ensure only one refresh call is in-flight at a time.
let isRefreshing = false;
type Resolver = (token: string) => void;
type Rejecter = (err: unknown) => void;
let refreshSubscribers: Array<{ resolve: Resolver; reject: Rejecter }> = [];

function subscribeToRefresh(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    refreshSubscribers.push({ resolve, reject });
  });
}

function notifySubscribers(newToken: string) {
  refreshSubscribers.forEach(({ resolve }) => resolve(newToken));
  refreshSubscribers = [];
}

function rejectSubscribers(err: unknown) {
  refreshSubscribers.forEach(({ reject }) => reject(err));
  refreshSubscribers = [];
}

async function doRefresh(): Promise<string> {
  const rt = getRefreshToken();
  if (!rt) throw new Error("No refresh token");

  const url = new URL("/api/auth/refresh", BASE_URL);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // NOTE: backend RefreshPayload json tag is "refreshtoken" (lowercase, no camel)
    body: JSON.stringify({ refreshtoken: rt }),
  });

  if (!res.ok) throw new Error("Refresh failed");

  const data = await res.json() as {
    token?: string;
    refreshToken?: string;
    user?: unknown;
  };

  const newAccess = data.token ?? "";
  const newRefresh = data.refreshToken ?? rt;

  setAuthToken(newAccess);
  setRefreshToken(newRefresh);
  // Also keep user cache fresh if returned
  if (data.user && typeof window !== "undefined") {
    localStorage.setItem("crm_user", JSON.stringify(data.user));
  }

  return newAccess;
}

// ── Core request ──────────────────────────────────────────────────────────────
async function request<T>(req: ApiRequest, isRetry = false): Promise<T> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 120));
    return mockHandle<T>(req, authToken);
  }

  const url = new URL(req.path, BASE_URL);
  if (req.query) {
    for (const [k, v] of Object.entries(req.query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: req.body ? JSON.stringify(req.body) : undefined,
  });

  // ── 401 handling ─────────────────────────────────────────────────────────
  // Skip refresh logic for auth endpoints — a 401 there means bad credentials,
  // not an expired session. Let the error fall through so the real message shows.
  const isAuthEndpoint = req.path.startsWith("/api/auth/");
  if (res.status === 401 && !isRetry && !isAuthEndpoint) {
    if (isRefreshing) {
      // Another refresh is already in flight — wait for it then replay
      try {
        const newToken = await subscribeToRefresh();
        authToken = newToken;
        return request<T>(req, true);
      } catch (err) {
        throw err;
      }
    }

    isRefreshing = true;
    try {
      const newToken = await doRefresh();
      notifySubscribers(newToken);
      isRefreshing = false;
      return request<T>(req, true);
    } catch (err) {
      rejectSubscribers(err);
      isRefreshing = false;
      onAuthFailure?.();
      throw new Error("Session expired. Please log in again.");
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `Request failed: ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return (await res.json()) as T;
}

export const apiClient = {
  get: <T>(path: string, query?: Record<string, unknown>) =>
    request<T>({ method: "GET", path, query }),
  post: <T>(path: string, body?: unknown) =>
    request<T>({ method: "POST", path, body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>({ method: "PATCH", path, body }),
  put: <T>(path: string, body?: unknown) =>
    request<T>({ method: "PUT", path, body }),
  delete: <T>(path: string) => request<T>({ method: "DELETE", path }),
};
