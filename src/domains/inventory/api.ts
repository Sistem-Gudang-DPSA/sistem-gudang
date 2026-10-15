import { ApiError, apiClient, downloadFile, toQuery } from "@/shared/lib/api-client";
import type {
  ItemFilterParams,
  SortParams,
  UpdateItemInput,
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

  Item,
  ItemListRow,
  ListParams,
  Location,
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

} from "./types";

// `summary` covers every item matching the search, not just the requested page.
export function listItems(params?: ListParams & SortParams & ItemFilterParams) {
  return apiClient.get<PaginatedResult<ItemListRow> & { summary?: { totalJenis: number; totalStock: number } }>(`/api/v1/items${toQuery(params)}`);
}

// Master lists of item categories and units; items reference them by name.
// `itemCount` is how many items use the name; a name still in use cannot be deleted (409).
export type ItemLookup = { id: number; name: string; itemCount?: number };
export const listItemCategories = () => apiClient.get<ItemLookup[]>("/api/v1/items/categories");
export const listItemUnits = () => apiClient.get<ItemLookup[]>("/api/v1/items/units");
export const createItemCategory = (name: string) => apiClient.post<ItemLookup>("/api/v1/items/categories", { name });
export const createItemUnit = (name: string) => apiClient.post<ItemLookup>("/api/v1/items/units", { name });
export const renameItemCategory = (id: number, name: string) => apiClient.put<ItemLookup>(`/api/v1/items/categories/${id}`, { name });
export const renameItemUnit = (id: number, name: string) => apiClient.put<ItemLookup>(`/api/v1/items/units/${id}`, { name });
export const deleteItemCategory = (id: number) => apiClient.delete<void>(`/api/v1/items/categories/${id}`);
export const deleteItemUnit = (id: number) => apiClient.delete<void>(`/api/v1/items/units/${id}`);

export type BulkItemRow = {
  code?: string; name: string; detail?: string; supplier?: string; category?: string; unit?: string;
  price: number; stock: number; locationCode?: string;
};
export type BulkItemsResult = { dryRun: boolean; created: number; skipped: { row: number; name: string; code: string | null; reason: string }[] };

// All-or-nothing: one bad row rejects the whole request. The BE reports `errors` keyed "items.<row>.<field>" (row starts at 1).
export async function importItems(body: { defaults: { category?: string; unit?: string }; items: BulkItemRow[] }) {
  try {
    // Empty cells mean "not given": the BE treats a blank code/detail/locationCode as invalid, not as absent.
    const items = body.items.map((r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== "")) as BulkItemRow);
    return await apiClient.post<BulkItemsResult>("/api/v1/items/bulk", { ...body, items });
  } catch (err) {
    const entries = err instanceof ApiError && err.errors ? Object.entries(err.errors) : [];
    if (entries.length === 0) throw err;
    const lines = entries.map(([key, msgs]) => {
      const [, row, field] = /^items\.(\d+)\.?(.*)$/.exec(key) ?? [];
      const name = row ? body.items[Number(row) - 1]?.name : undefined;
      return `${row ? `Baris ${row}${name ? ` "${name}"` : ""}${field ? ` (${field})` : ""}` : key}: ${msgs.join(", ")}`;
    });
    throw new Error(lines.slice(0, 10).join("; ") + (lines.length > 10 ? `; dan ${lines.length - 10} error lain` : ""));
  }
}

export function getItem(id: number) {
  return apiClient.get<Item>(`/api/v1/items/${id}`);
}

export function createItem(input: CreateItemInput) {
  return apiClient.post<Item>("/api/v1/items", input);
}

export function updateItem(id: number, input: UpdateItemInput) {
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

// Multipart field `photo`; replaces any existing photo. Only Superadmin and PPIC hold `item.upload-photo`.
export function uploadItemPhoto(id: number, file: File) {
  const form = new FormData();
  form.append("photo", file);
  return apiClient.upload<Item>(`/api/v1/items/${id}/photo`, form);
}

export type BulkPhotoResult = {
  uploaded: { itemId: number; photo: { thumb: string; display: string } }[];
  failed: { itemId: number; reason: "not_found" | "invalid_type" | "too_large" | "unprocessable" }[];
};

// Up to 10 files per call, one field per item: photo_<itemId>. Needs item.upload-photo.
export function uploadItemPhotosBulk(pairs: { itemId: number; file: File }[]) {
  const form = new FormData();
  for (const { itemId, file } of pairs) form.append(`photo_${itemId}`, file);
  return apiClient.upload<BulkPhotoResult>("/api/v1/items/photos/bulk", form);
}

export function adjustItemStock(id: number, input: { delta: number; reason: string }) {
  return apiClient.patch<Item>(`/api/v1/items/${id}/stock`, input);
}

export function listLocations(params?: ListParams & SortParams) {
  return apiClient.get<PaginatedResult<Location>>(`/api/v1/locations${toQuery(params)}`);
}

export function createLocation(input: CreateLocationInput) {
  return apiClient.post<Location>("/api/v1/locations", input);
}

export function updateLocation(id: number, input: Partial<CreateLocationInput>) {
  return apiClient.put<Location>(`/api/v1/locations/${id}`, input);
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

// Material requests per SPK; their productionItem is the item/produk an SPK is worked on.
export function listMaterialRequests(params?: { search?: string; page?: number; pageSize?: number }) {
  return apiClient.get<RequestReport>(`/api/v1/material-requests${toQuery(params)}`);
}

export function getMaterialRequest(id: number) {
  return apiClient.get<MaterialRequestDetail>(`/api/v1/material-requests/${id}`);
}

// `ids` (selected rows) makes the backend ignore every other filter.
export function exportRequestsReport(params: Omit<RequestReportParams, "page" | "pageSize"> & { ids?: number[] }) {
  return downloadFile(`/api/v1/reports/requests/export${toQuery(params)}`, "rekap-permintaan.xlsx");
}