import { apiClient, setAuthToken } from "./client";
import type { AuthSession, User } from "./types";

interface LoginResponse {
  token?: string;
  access_token?: string;
  refreshToken?: string;
  refresh_token?: string;
  user?: User;
}

function normalize(res: LoginResponse, fallbackUser?: User): AuthSession {
  const token = res.token ?? res.access_token ?? "";
  const refreshToken = res.refreshToken ?? res.refresh_token ?? "";
  return { token, refreshToken, user: res.user ?? (fallbackUser as User) };
}

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await apiClient.post<LoginResponse>("/api/auth/login", { email, password });
    const token = res.token ?? res.access_token;
    if (!token) throw new Error("Login failed: no token returned");
    setAuthToken(token);
    let user = res.user;
    if (!user) user = await apiClient.get<User>("/api/users/me");
    const session = normalize(res, user);
    if (typeof window !== "undefined") localStorage.setItem("crm_user", JSON.stringify(session.user));
    return session;
  },
  logout: async () => {
    setAuthToken(null);
    if (typeof window !== "undefined") localStorage.removeItem("crm_user");
  },
  me: () => apiClient.get<User>("/api/users/me"),
  refresh: async () => {
    const res = await apiClient.post<LoginResponse>("/api/auth/refresh");
    if (res.token ?? res.access_token) setAuthToken((res.token ?? res.access_token) as string);
    return normalize(res);
  },
};
