import type { LocationDataImportRow } from "./components/DataLokasi";
import { invalidateApiData } from "@/shared/lib/use-api-data";
import { ApiError, apiClient, downloadFile, toQuery } from "@/shared/lib/api-client";
import type {
  ItemFilterParams,
  SortParams,
  UpdateItemInput,
  CreateInboundBatchInput,
  CreateInboundInput,
  CreateInboundReturnInput,
  CreateItemInput,
  CreateLocationInput,
  CreateOutboundInput,
  CreateStockOpnameInput,
  ChecklistDokubahDetail,
  ChecklistDokubahInput,
  ChecklistDokubahRow,
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
import type { KartuStokData, KartuEntry } from '@/domains/inventory/components/KartuStok';

export const listChecklistDokubah = (params?: ListParams) =>
  apiClient.get<PaginatedResult<ChecklistDokubahRow>>(`/api/v1/checklist-dokubah${toQuery(params)}`);
export const getChecklistDokubah = (dokubahId: number) =>
  apiClient.get<ChecklistDokubahDetail>(`/api/v1/checklist-dokubah/${dokubahId}`);
export const saveChecklistDokubah = (dokubahId: number, input: ChecklistDokubahInput) =>
  apiClient.put<ChecklistDokubahDetail>(`/api/v1/checklist-dokubah/${dokubahId}`, input);

async function fetchAll<T>(fetchPage: (page: number) => Promise<PaginatedResult<T>>) {
  const all: T[] = [];
  for (let page = 1; ; page++) {
    const res = await fetchPage(page);
    all.push(...res.rows);
    if (res.rows.length === 0 || all.length >= res.total) return all;
  }
}

export async function getStockCard(itemId: number): Promise<KartuStokData> {
  const item = await getItem(itemId);
  const [inbound, outbound] = await Promise.all([
    fetchAll((page) => listInbound({ page, pageSize: 100 })),
    fetchAll((page) => listOutbound({ page, pageSize: 100 })),
  ]);

  const entries: KartuEntry[] = [
    ...inbound
      .filter((r) => (item.code ? r.itemCode === item.code : r.itemName === item.name))
      .map((r): KartuEntry => ({
        id: `in-${r.id}`,
        date: r.date.slice(0, 10),
        createdAt: r.date,
        type: 'MASUK',
        client: r.clientName ?? null,
        spk: null,
        project: null,
        usage: r.supplierName ? `Penerimaan dari ${r.supplierName}` : r.clientName ? 'Barang kembali' : 'Penerimaan barang',
        qtyIn: r.qtyArrived,
        qtyOut: 0,
        note: null,
      })),

    ...outbound.flatMap((trx) =>
      trx.lines
        .map((line, i) => ({ line, i }))
        .filter(({ line }) => line.itemId === itemId)
        .map(({ line, i }): KartuEntry => ({
          id: `out-${trx.id}-${i}`,
          date: trx.date.slice(0, 10),
          createdAt: trx.createdAt,
          type: 'KELUAR',
          client: trx.clientName || null,
          spk: trx.spk || null,
          project: trx.itemName,
          usage: `Pengambilan oleh ${line.pic}`,
          qtyIn: 0,
          qtyOut: line.qty,
          note: trx.noTransaksi ? `${trx.noTransaksi}` : null,
        })),
    ),
  ];

  const totalIn = entries.reduce((s, e) => s + e.qtyIn, 0);
  const totalOut = entries.reduce((s, e) => s + e.qtyOut, 0);

  return {
    item: { id: item.id, code: item.code ?? null, name: item.name, unit: item.unit, stock: item.stock },
    openingBalance: item.stock - totalIn + totalOut,
    entries,
  };
}

// `summary` covers every item matching the search, not just the requested page.
export function listItems(params?: ListParams & SortParams & ItemFilterParams) {
  return apiClient.get<PaginatedResult<ItemListRow> & { summary?: { totalJenis: number; totalStock: number } }>(`/api/v1/items${toQuery(params)}`);
}

// Master lists of item categories and units; items reference them by name.
// `itemCount` is how many items use the name; a name still in use cannot be deleted (409).
// prefix: kategori saja, 3 huruf awal kode barang (LBR001); default dari BE bila tidak diisi
export type ItemLookup = { id: number; name: string; itemCount?: number; prefix?: string };
export const listItemCategories = () => apiClient.get<ItemLookup[]>("/api/v1/items/categories");
export const listItemUnits = () => apiClient.get<ItemLookup[]>("/api/v1/items/units");
// paged variants for the master page (server-side pagination, search and sort)
export const listItemCategoriesPage = (params: ListParams & SortParams) =>
  apiClient.get<PaginatedResult<ItemLookup>>(`/api/v1/items/categories${toQuery(params)}`);
export const listItemUnitsPage = (params: ListParams & SortParams) =>
  apiClient.get<PaginatedResult<ItemLookup>>(`/api/v1/items/units${toQuery(params)}`);
export const createItemCategory = (name: string, prefix?: string) => apiClient.post<ItemLookup>("/api/v1/items/categories", { name, prefix }).finally(() => invalidateApiData("categories"));
export const createItemUnit = (name: string) => apiClient.post<ItemLookup>("/api/v1/items/units", { name }).finally(() => invalidateApiData("units"));
export const renameItemCategory = (id: number, name: string, prefix?: string) => apiClient.put<ItemLookup>(`/api/v1/items/categories/${id}`, { name, prefix }).finally(() => invalidateApiData("categories"));
export const renameItemUnit = (id: number, name: string) => apiClient.put<ItemLookup>(`/api/v1/items/units/${id}`, { name }).finally(() => invalidateApiData("units"));
export const deleteItemCategory = (id: number) => apiClient.delete<void>(`/api/v1/items/categories/${id}`).finally(() => invalidateApiData("categories"));
export const deleteItemUnit = (id: number) => apiClient.delete<void>(`/api/v1/items/units/${id}`).finally(() => invalidateApiData("units"));

export type BulkItemRow = {
  code?: string; name: string; detail?: string; supplier?: string; category?: string; unit?: string;
  price: number; stock: number; locationCode?: string;
};
export type BulkItemsResult = { dryRun: boolean; created: number; skipped: { row: number; name: string; code: string | null; reason: string }[] };

export type InboundScanBatchInput = {
  date: string;
  pass: { itemId: number; qtyArrived: number }[];
  retur: { itemId: number; qty: number; reason: string }[];
};

export type InboundScanBatchResult = {
  passCount: number;
  returCount: number;
  items: InboundRow[];            // catatan barang masuk yang lolos QC
  returnRequests: { id: number; supplierId: number; lineCount: number }[];
};

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
  } finally {
    invalidateApiData("lokasi");
  }
}

// Exact match on items.code (what a scanned QR holds); 404 when no item has that code.
export function getItemByCode(code: string) {
  return apiClient.get<Item>(`/api/v1/items/by-code/${encodeURIComponent(code)}`);
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

// Superadmin only. Gives the item a new code from its current category prefix, even when it has transactions.
export function recodeItem(id: number) {
  return apiClient.post<Item>(`/api/v1/items/${id}/recode`);
}

// Superadmin only, max 500 items. All or nothing: one failure changes no code.
export function bulkRecodeItems(itemIds: number[]) {
  return apiClient.post<{ items: { id: number; oldCode: string; newCode: string }[] }>("/api/v1/items/recode/bulk", { itemIds });
}

export function deleteItem(id: number) {
  return apiClient.delete<Item>(`/api/v1/items/${id}`);
}

export function listUnassignedItems() {
  return apiClient.get<Item[]>("/api/v1/items/unassigned");
}

export function assignItemLocation(id: number, input: { locationId: number }) {
  return apiClient.put<Item>(`/api/v1/items/${id}/assign-location`, input);
}

// One location for many items; the BE reports the items it could not assign. Codes stay as they are.
export function bulkAssignItemLocation(input: { itemIds: number[]; locationId: number }) {
  return apiClient.post<{ assigned: number; failed: { id: number; reason: string }[] }>("/api/v1/items/assign-location/bulk", input);
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
  return apiClient.post<Location>("/api/v1/locations", input).finally(() => invalidateApiData("lokasi"));
}

export function updateLocation(id: number, input: Partial<CreateLocationInput>) {
  return apiClient.put<Location>(`/api/v1/locations/${id}`, input).finally(() => invalidateApiData("lokasi"));
}

export function deleteLocation(id: number) {
  return apiClient.delete<void>(`/api/v1/locations/${id}`).finally(() => invalidateApiData("lokasi"));
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

// One transaction for all lines. The same Idempotency-Key with the same body replays the first result
// (24 hours), so a retry after a timeout or double click never adds stock twice.
export function createInboundBatch(input: CreateInboundBatchInput, idempotencyKey: string) {
  return apiClient.post<{ count: number; items: InboundRow[] }>("/api/v1/inbound/batch", input, { "Idempotency-Key": idempotencyKey });
}

export function createInboundScanBatch(input: InboundScanBatchInput, idempotencyKey: string) {
  return apiClient.post<InboundScanBatchResult>("/api/v1/inbound/scan-batch", input, { "Idempotency-Key": idempotencyKey });
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

// Idempotency-Key is required: one per draft, reused on retry so the stock is not cut twice.
export function createOutbound(input: CreateOutboundInput, idempotencyKey: string) {
  return apiClient.post<OutboundRow>("/api/v1/outbound", input, { "Idempotency-Key": idempotencyKey });
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

export type BulkLocationsResult = { created: number; skipped: { row: number; code: string; reason: string }[] };

// All-or-nothing; a code already in the database is skipped, a blank code is derived by the BE from rackName + rackNumber.
// The BE reports validation `errors` keyed "rows.<row>.<field>" (row starts at 1).
export async function importLocationData(rows: LocationDataImportRow[]) {
  try {
    return await apiClient.post<BulkLocationsResult>("/api/v1/locations/bulk", {
      rows: rows.map((r) => ({ code: r.code, rackName: r.NamaRak, rackNumber: r.NomorRak, description: r.description })),
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
