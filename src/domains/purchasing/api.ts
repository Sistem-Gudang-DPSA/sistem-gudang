import { apiClient, toQuery } from "@/shared/lib/api-client";
import type { PaginatedResult, ListParams } from "@/domains/inventory/types";
import type { CreateSupplierInput, Supplier, SupplierPriceChange, SupplierPrices } from "./types";

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

export function getSupplierPrices(id: number | string, tahun: number) {
  return apiClient.get<SupplierPrices>(`/api/v1/suppliers/${id}/prices${toQuery({ tahun })}`);
}

// Saves only the changed cells; `harga: null` clears a cell. Responds with the same shape as getSupplierPrices.
export function saveSupplierPrices(id: number | string, tahun: number, prices: SupplierPriceChange[]) {
  return apiClient.put<SupplierPrices>(`/api/v1/suppliers/${id}/prices`, { tahun, prices });
}

