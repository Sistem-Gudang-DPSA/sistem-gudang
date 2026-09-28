import { apiClient, setAccessToken } from "@/shared/lib/api-client";
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

export function dashboardPathFor(user: AuthUser): string {
  if (user.isSuperadmin) return "/dashboard/superadmin";
  return `/dashboard/${user.roleName.toLowerCase()}`;
}
