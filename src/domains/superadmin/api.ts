import { apiClient, toQuery } from "@/shared/lib/api-client";
import type { PaginatedResult, ListParams } from "@/domains/inventory/types";
import type { CreatedUser, CreateUserInput, Role, UpdateUserInput, UserAccount } from "./types";
import { MasterDataImportRow } from "./components/DataBarang";
import { LocationDataImportRow } from "./components/DataLokasi";

export function listRoles() {
  return apiClient.get<Role[]>("/api/v1/superadmin/roles");
}

export function listUsers(params?: ListParams) {
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

export async function importMasterData(rows: MasterDataImportRow[]) {
  const res = await fetch('/api/master-data/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'Gagal mengimpor data.');
  }
}

export async function importLocationData(rows: LocationDataImportRow[]) {
  const res = await fetch('/api/location-data/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? 'Gagal mengimpor data.');
  }
}
