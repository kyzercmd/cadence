import { apiClient, setAuthToken, setRefreshToken, getRefreshToken } from "./client";
import type { AuthSession, User } from "./types";

interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthSession> => {
    const res = await apiClient.post<LoginResponse>("/api/auth/login", { email, password });
    const token = res.token;
    if (!token) throw new Error("Login failed: no token returned");
    setAuthToken(token);
    setRefreshToken(res.refreshToken ?? "");
    let user = res.user;
    if (!user) user = await apiClient.get<User>("/api/users/me");
    if (typeof window !== "undefined") {
      localStorage.setItem("crm_user", JSON.stringify(user));
    }
    return { token, refreshToken: res.refreshToken ?? "", user };
  },

  logout: () => {
    setAuthToken(null);
    setRefreshToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("crm_user");
    }
  },

  me: () => apiClient.get<User>("/api/users/me"),

  /** Called by AuthProvider's proactive timer — not user-facing. */
  refresh: async (): Promise<AuthSession> => {
    const rt = getRefreshToken();
    if (!rt) throw new Error("No refresh token");
    // NOTE: backend RefreshPayload json tag is "refreshtoken" (lowercase)
    const res = await apiClient.post<LoginResponse>("/api/auth/refresh", {
      refreshtoken: rt,
    });
    const token = res.token;
    if (!token) throw new Error("Refresh failed: no token");
    setAuthToken(token);
    setRefreshToken(res.refreshToken ?? rt);
    if (typeof window !== "undefined" && res.user) {
      localStorage.setItem("crm_user", JSON.stringify(res.user));
    }
    return { token, refreshToken: res.refreshToken ?? rt, user: res.user };
  },
};
