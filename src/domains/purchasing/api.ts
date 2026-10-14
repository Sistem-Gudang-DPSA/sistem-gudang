import { apiClient, downloadFile, toQuery } from "@/shared/lib/api-client";
import type { PaginatedResult, ListParams, SortParams } from "@/domains/inventory/types";
import type { CreatePurchaseOrderInput, CreateSupplierInput, Pajak, PurchaseOrder, PurchaseOrderRow, PurchaseOrderStatus, Supplier, SupplierPriceChange, SupplierPrices, UpdatePurchaseOrderInput } from "./types";

export function listSuppliers(params?: ListParams & SortParams & { pajak?: Pajak }) {
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

export function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  return apiClient.post<PurchaseOrder>("/api/v1/purchase-orders", input);
}

export function listPurchaseOrders(params?: ListParams & { status?: PurchaseOrderStatus; supplierId?: number; approvalRequestId?: number; startDate?: string; endDate?: string }) {
  return apiClient.get<PaginatedResult<PurchaseOrderRow>>(`/api/v1/purchase-orders${toQuery(params)}`);
}

export function getPurchaseOrder(id: number | string) {
  return apiClient.get<PurchaseOrder>(`/api/v1/purchase-orders/${id}`);
}

export function updatePurchaseOrder(id: number | string, input: UpdatePurchaseOrderInput) {
  return apiClient.put<PurchaseOrder>(`/api/v1/purchase-orders/${id}`, input);
}

// Final: a cancelled PO cannot be edited or reopened. Stock and the purchase request are untouched.
export function cancelPurchaseOrder(id: number | string, reason: string) {
  return apiClient.post<PurchaseOrder>(`/api/v1/purchase-orders/${id}/cancel`, { reason });
}

export function exportPurchaseOrder(id: number | string) {
  return downloadFile(`/api/v1/purchase-orders/${id}/export`, `purchase-order-${id}.xlsx`);
}
