import { apiClient, toQuery } from "@/shared/lib/api-client";
import type { PaginatedResult, ListParams, SortParams } from "@/domains/inventory/types";
import type { BugReport, BugReportStatus, CreatedUser, CreateRoleInput, CreateUserInput, Domain, Permission, Role, UpdateRoleInput, UpdateUserInput, UserAccount } from "./types";

export function listRoles() {
  return apiClient.get<Role[]>("/api/v1/superadmin/roles");
}

export function listPermissions() {
  return apiClient.get<Permission[]>("/api/v1/superadmin/permissions");
}

export function listDomains() {
  return apiClient.get<Domain[]>("/api/v1/superadmin/domains");
}

export function createRole(input: CreateRoleInput) {
  return apiClient.post<Role>("/api/v1/superadmin/roles", input);
}

export function updateRole(roleId: number, input: UpdateRoleInput) {
  return apiClient.put<Role>(`/api/v1/superadmin/roles/${roleId}`, input);
}

// Replaces the role's full permission list.
export function updateRolePermissions(roleId: number, permissionIds: number[]) {
  return apiClient.put<void>(`/api/v1/superadmin/roles/${roleId}/permissions`, { permissionIds });
}

export function deleteRole(roleId: number) {
  return apiClient.delete<void>(`/api/v1/superadmin/roles/${roleId}`);
}

export function listUsers(params?: ListParams & SortParams) {
  return apiClient.get<PaginatedResult<UserAccount>>(`/api/v1/superadmin/users${toQuery(params)}`);
}

export function createUser(input: CreateUserInput) {
  return apiClient.post<CreatedUser>("/api/v1/superadmin/users", input);
}

export function updateUser(id: number, input: UpdateUserInput) {
  return apiClient.put<UserAccount>(`/api/v1/superadmin/users/${id}`, input);
}

export function deleteUser(id: number) {
  return apiClient.delete<void>(`/api/v1/superadmin/users/${id}`);
}

// Multipart: description, pageUrl, userAgent and an optional `screenshot` file. Any logged-in user.
export function createBugReport(input: { description: string; pageUrl: string; userAgent: string; screenshot?: File }) {
  const form = new FormData();
  form.append("description", input.description);
  form.append("pageUrl", input.pageUrl);
  form.append("userAgent", input.userAgent);
  if (input.screenshot) form.append("screenshot", input.screenshot);
  return apiClient.upload<BugReport>("/api/v1/bug-reports", form);
}

export function listBugReports(params?: { page?: number; pageSize?: number; status?: BugReportStatus }) {
  return apiClient.get<PaginatedResult<BugReport>>(`/api/v1/bug-reports${toQuery(params)}`);
}

// Superadmin: change the status and/or the IT note of a report.
export function updateBugReport(id: number, input: { status?: BugReportStatus; itNote?: string }) {
  return apiClient.patch<BugReport>(`/api/v1/bug-reports/${id}`, input);
}

// The caller's own reports.
export function listMyBugReports(params?: { page?: number; pageSize?: number }) {
  return apiClient.get<PaginatedResult<BugReport>>(`/api/v1/bug-reports/mine${toQuery(params)}`);
}
