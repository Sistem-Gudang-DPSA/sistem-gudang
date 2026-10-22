import { apiClient, toQuery } from "@/shared/lib/api-client";
import type { PaginatedResult, ListParams, SortParams } from "@/domains/inventory/types";
import type { CreatedUser, CreateUserInput, Role, UpdateUserInput, UserAccount } from "./types";

export function listRoles() {
  return apiClient.get<Role[]>("/api/v1/superadmin/roles");
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
