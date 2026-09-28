import { apiClient, toQuery } from "@/shared/lib/api-client";
import type { PaginatedResult, ListParams } from "@/domains/inventory/types";
import type { CreateSupplierInput, Supplier } from "./types";

export function listSuppliers(params?: ListParams) {
  return apiClient.get<PaginatedResult<Supplier>>(`/api/v1/suppliers${toQuery(params)}`);
}

export function createSupplier(input: CreateSupplierInput) {
  return apiClient.post<Supplier>("/api/v1/suppliers", input);
}

export function updateSupplier(id: number, input: Partial<CreateSupplierInput>) {
  return apiClient.put<Supplier>(`/api/v1/suppliers/${id}`, input);
}

export function deleteSupplier(id: number) {
  return apiClient.delete<Supplier>(`/api/v1/suppliers/${id}`);
}
