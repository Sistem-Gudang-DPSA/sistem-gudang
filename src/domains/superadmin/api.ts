import { ApiError, apiClient, toQuery } from "@/shared/lib/api-client";
import type { PaginatedResult, ListParams } from "@/domains/inventory/types";
import type { CreatedUser, CreateUserInput, Role, UpdateUserInput, UserAccount } from "./types";
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

export type BulkLocationsResult = { created: number; skipped: { row: number; code: string; reason: string }[] };

// All-or-nothing; a code already in the database is skipped, a blank code is derived by the BE from rackName + rackNumber.
// The BE reports validation `errors` keyed "rows.<row>.<field>" (row starts at 1).
export async function importLocationData(rows: LocationDataImportRow[]) {
  try {
    return await apiClient.post<BulkLocationsResult>("/api/v1/locations/bulk", {
      rows: rows.map((r) => ({ rackName: r.NamaRak, rackNumber: r.NomorRak })),
    });
  } catch (err) {
    const entries = err instanceof ApiError && err.errors ? Object.entries(err.errors) : [];
    if (entries.length === 0) throw err;
    const lines = entries.map(([key, msgs]) => {
      const [, row, field] = /^rows\.(\d+)\.?(.*)$/.exec(key) ?? [];
      return `${row ? `Baris ${row}${field ? ` (${field})` : ""}` : key}: ${msgs.join(", ")}`;
    });
    throw new Error(lines.slice(0, 10).join("; ") + (lines.length > 10 ? `; dan ${lines.length - 10} error lain` : ""));
  }
}
