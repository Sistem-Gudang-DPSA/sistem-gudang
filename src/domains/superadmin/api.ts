import { apiClient, toQuery } from "@/shared/lib/api-client";
import type { PaginatedResult, ListParams, SortParams } from "@/domains/inventory/types";
import type { CreatedUser, CreateRoleInput, CreateUserInput, Domain, Permission, Role, UpdateRoleInput, UpdateUserInput, UserAccount } from "./types";

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
