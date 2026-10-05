import { apiClient, downloadFile, toQuery } from "@/shared/lib/api-client";
import { apiClient, downloadFile, toQuery } from "@/shared/lib/api-client";
import type {
  CreateInboundInput,
  CreateInboundReturnInput,
  CreateInboundInput,
  CreateInboundReturnInput,
  CreateItemInput,
  CreateLocationInput,
  CreateOutboundInput,
  CreateStockOpnameInput,
  InboundListParams,
  InboundReport,
  InboundReportParams,
  InboundRow,
  CreateOutboundInput,
  CreateStockOpnameInput,
  InboundListParams,
  InboundReport,
  InboundReportParams,
  InboundRow,
  Item,
  ItemListRow,
  ListParams,
  Location,
  MaterialRequestDetail,
  OutboundListParams,
  OutboundReport,
  OutboundReportParams,
  OutboundRow,
  MaterialRequestDetail,
  OutboundListParams,
  OutboundReport,
  OutboundReportParams,
  OutboundRow,
  PaginatedResult,
  RequestReport,
  RequestReportParams,
  StockOpnameDetail,
  StockOpnameListParams,
  StockOpnameRow,
  RequestReport,
  RequestReportParams,
  StockOpnameDetail,
  StockOpnameListParams,
  StockOpnameRow,
} from "./types";

// `summary` covers every item matching the search, not just the requested page.
// `summary` covers every item matching the search, not just the requested page.
export function listItems(params?: ListParams) {
  return apiClient.get<PaginatedResult<ItemListRow> & { summary?: { totalJenis: number; totalStock: number } }>(`/api/v1/items${toQuery(params)}`);
  return apiClient.get<PaginatedResult<ItemListRow> & { summary?: { totalJenis: number; totalStock: number } }>(`/api/v1/items${toQuery(params)}`);
}

export function getItem(id: number) {
  return apiClient.get<Item>(`/api/v1/items/${id}`);
}

export function createItem(input: CreateItemInput) {
  return apiClient.post<Item>("/api/v1/items", input);
}

export function updateItem(id: number, input: Partial<CreateItemInput>) {
  return apiClient.put<Item>(`/api/v1/items/${id}`, input);
}

export function deleteItem(id: number) {
  return apiClient.delete<Item>(`/api/v1/items/${id}`);
}

export function listUnassignedItems() {
  return apiClient.get<Item[]>("/api/v1/items/unassigned");
}

export function suggestItemCode(id: number, locationId: number) {
  return apiClient.get<{ code: string }>(`/api/v1/items/${id}/suggest-code?locationId=${locationId}`);
}

export function assignItemLocation(id: number, input: { code: string; locationId: number }) {
  return apiClient.put<Item>(`/api/v1/items/${id}/assign-location`, input);
}

export function adjustItemStock(id: number, input: { delta: number; reason: string }) {
  return apiClient.patch<Item>(`/api/v1/items/${id}/stock`, input);
}

export function listLocations(params?: ListParams) {
  return apiClient.get<PaginatedResult<Location>>(`/api/v1/locations${toQuery(params)}`);
}

export function createLocation(input: CreateLocationInput) {
  return apiClient.post<Location>("/api/v1/locations", input);
}

export function deleteLocation(id: number) {
  return apiClient.delete<void>(`/api/v1/locations/${id}`);
}

// Gudang division: inbound, outbound, stock opname and material requests.
export function listInbound(params?: InboundListParams) {
  return apiClient.get<PaginatedResult<InboundRow>>(`/api/v1/inbound${toQuery(params)}`);
}

export function getInbound(id: number) {
  return apiClient.get<InboundRow>(`/api/v1/inbound/${id}`);
}

export function createInbound(input: CreateInboundInput) {
  return apiClient.post<InboundRow>("/api/v1/inbound", input);
}

export function createInboundReturn(input: CreateInboundReturnInput) {
  return apiClient.post<InboundRow>("/api/v1/inbound/returns", input);
}

// Report endpoints search with `q` (not `search`) and return a `summary`.
export function getInboundReport(params?: InboundReportParams) {
  return apiClient.get<InboundReport>(`/api/v1/reports/inbound${toQuery(params)}`);
}

export function exportInboundReport(params?: Omit<InboundReportParams, "page" | "pageSize">) {
  return downloadFile(`/api/v1/reports/inbound/export${toQuery(params)}`, "rekap-barang-masuk.xlsx");
}

export function listOutbound(params?: OutboundListParams) {
  return apiClient.get<PaginatedResult<OutboundRow>>(`/api/v1/outbound${toQuery(params)}`);
}

export function createOutbound(input: CreateOutboundInput) {
  return apiClient.post<OutboundRow>("/api/v1/outbound", input);
}

// Backend belum menyediakan endpoint ini (docs/api-1.json baru punya GET/POST), payload-nya sama dengan create.
export function updateOutbound(id: number, input: CreateOutboundInput) {
  return apiClient.put<OutboundRow>(`/api/v1/outbound/${id}`, input);
}

export function getOutboundReport(params?: OutboundReportParams) {
  return apiClient.get<OutboundReport>(`/api/v1/reports/outbound${toQuery(params)}`);
}

export function exportOutboundReport(params?: Omit<OutboundReportParams, "page" | "pageSize">) {
  return downloadFile(`/api/v1/reports/outbound/export${toQuery(params)}`, "rekap-barang-keluar.xlsx");
}

export function listStockOpname(params?: StockOpnameListParams) {
  return apiClient.get<PaginatedResult<StockOpnameRow>>(`/api/v1/stock-opname${toQuery(params)}`);
}

export function getStockOpname(id: number) {
  return apiClient.get<StockOpnameDetail>(`/api/v1/stock-opname/${id}`);
}

export function createStockOpname(input: CreateStockOpnameInput) {
  return apiClient.post<StockOpnameDetail>("/api/v1/stock-opname", input);
}

export function getRequestsReport(params?: RequestReportParams) {
  return apiClient.get<RequestReport>(`/api/v1/reports/requests${toQuery(params)}`);
}

export function getMaterialRequest(id: number) {
  return apiClient.get<MaterialRequestDetail>(`/api/v1/material-requests/${id}`);
}

// `ids` (selected rows) makes the backend ignore every other filter.
export function exportRequestsReport(params: Omit<RequestReportParams, "page" | "pageSize"> & { ids?: number[] }) {
  return downloadFile(`/api/v1/reports/requests/export${toQuery(params)}`, "rekap-permintaan.xlsx");
}