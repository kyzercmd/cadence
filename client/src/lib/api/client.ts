// Tiny API client. By default routes ALL calls to the mock adapter so the
// frontend works without a backend. When a real backend is ready, set
// VITE_API_BASE_URL and VITE_USE_MOCK=false in .env — every component
// will keep working unchanged because they only talk to the *.api.ts modules.

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

let authToken: string | null =
  typeof window !== "undefined" ? localStorage.getItem("crm_token") : null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("crm_token", token);
  else localStorage.removeItem("crm_token");
}

export function getAuthToken() {
  return authToken;
}

async function request<T>(req: ApiRequest): Promise<T> {
  if (USE_MOCK) {
    // simulate small latency for nicer loading UX
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
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `Request failed: ${res.status}`);
  }
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
