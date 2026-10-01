import { apiClient, setAccessToken } from "@/shared/lib/api-client";
import { visibleNav } from "./nav";
import type { AuthUser, LoginResult } from "./types";

export async function login(email: string, password: string): Promise<AuthUser> {
  const result = await apiClient.post<LoginResult>("/api/v1/auth/login", { email, password });
  setAccessToken(result.accessToken);
  return result.user;
}

export async function refreshSession(): Promise<AuthUser> {
  const result = await apiClient.post<LoginResult>("/api/v1/auth/refresh");
  setAccessToken(result.accessToken);
  return result.user;
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post("/api/v1/auth/logout");
  } finally {
    setAccessToken(null);
  }
}

// First division the user may see; the role name is not a route (e.g. "Koor Inventory").
export function dashboardPathFor(user: AuthUser): string {
  if (user.isSuperadmin) return "/dashboard/superadmin";
  const first = visibleNav(user)[0];
  return first ? `/dashboard/${first.key}` : "/dashboard";
}

// Only same-site dashboard paths are accepted from ?next=, so it cannot redirect elsewhere.
export function safeNextPath(next: string | null): string | null {
  return next && /^\/dashboard(\/|$)/.test(next) && !next.includes("//") ? next : null;
}
