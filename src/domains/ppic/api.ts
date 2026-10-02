import { apiClient, toQuery } from "@/shared/lib/api-client";
import type { PaginatedResult } from "@/domains/inventory/types";
import type { BahanDokubah, DokubahItem, StatusDokubah } from "./data/dokubah";
import type { SpkInternal } from "./data/spk-internal";
import type { ApprovalListParams, ApprovalRequest, PurchaseRequestPayload, CreateDokubahInput, CreateSpkInternalInput, SpkInternalListParams, TrackingSpk, TrackingPic, MutationListParams, MutationRow, StockOpnameSummary, DokubahApiDetail, DokubahApiRow, DokubahApiStatus, DokubahListParams } from "./types";

// The screens use title-case statuses, the API uses UPPER_SNAKE.
export const STATUS_TO_UI: Record<DokubahApiStatus, StatusDokubah> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const statusToApi = (status: StatusDokubah): DokubahApiStatus => status.toUpperCase() as DokubahApiStatus;

// List rows carry no materials, so `bahan` is empty until getDokubah.
const toItem = (row: DokubahApiRow | DokubahApiDetail): DokubahItem => ({
  id: row.id,
  noSpk: row.noSpk,
  client: row.client,
  tanggalMulai: row.tanggalMulai,
  tanggalSelesai: row.tanggalSelesai,
  status: STATUS_TO_UI[row.status],
  fileDokubah: row.fileDokubah ?? undefined,
  penanggungJawab: row.penanggungJawab ?? undefined,
  totalAnggaran: row.totalAnggaran,
  bahan: "bahan" in row ? row.bahan : [],
});

export async function listDokubah(params?: DokubahListParams): Promise<PaginatedResult<DokubahItem>> {
  const res = await apiClient.get<PaginatedResult<DokubahApiRow>>(`/api/v1/dokubah${toQuery(params)}`);
  return { ...res, rows: res.rows.map(toItem) };
}

// Raw rows (with totalKuota / totalRealisasi) for the Gudang recap.
export const listDokubahRows = (params?: DokubahListParams) =>
  apiClient.get<PaginatedResult<DokubahApiRow>>(`/api/v1/dokubah${toQuery(params)}`);

// SPK numbers and client names from the tracking system, used to pick the SPK of a new dokubah.
export const listTrackingSpk = (search?: string) => apiClient.get<TrackingSpk[]>(`/api/v1/tracking/spk${toQuery({ search })}`);

export async function getDokubah(id: number) {
  return toItem(await apiClient.get<DokubahApiDetail>(`/api/v1/dokubah/${id}`));
}

export async function createDokubah(input: CreateDokubahInput) {
  return toItem(await apiClient.post<DokubahApiDetail>("/api/v1/dokubah", input));
}

// Replaces every material of the dokubah; the server keeps `realisasi` per kodeBarang.
export async function replaceDokubahMaterials(id: number, bahan: Pick<BahanDokubah, "kodeBarang" | "namaBahan" | "satuan" | "hargaSatuan" | "kuota" | "keterangan">[]) {
  return toItem(await apiClient.put<DokubahApiDetail>(`/api/v1/dokubah/${id}/materials`, { bahan }));
}

// Status transitions have no screen yet (the Approval page is empty); ready for when it exists.
export const submitDokubah = (id: number) => apiClient.post<DokubahApiDetail>(`/api/v1/dokubah/${id}/submit`);
export const approveDokubah = (id: number) => apiClient.post<DokubahApiDetail>(`/api/v1/dokubah/${id}/approve`);
export const rejectDokubah = (id: number) => apiClient.post<DokubahApiDetail>(`/api/v1/dokubah/${id}/reject`);

export const listSpkInternal = (params?: SpkInternalListParams) =>
  apiClient.get<PaginatedResult<SpkInternal>>(`/api/v1/spk-internal${toQuery(params)}`);

// Creates the whole document; the server numbers it and starts each line's totalBisaPakai at alokasiStokBebas.
export const createSpkInternal = (input: CreateSpkInternalInput) => apiClient.post<{ id: number; noSpk: string }>("/api/v1/spk-internal", input);

// Rejected with 400 unless jumlah is an integer > 0 and <= totalBisaPakai; 0 left means LOCKED.
export const allocateSpkInternal = (id: number, jumlah: number) =>
  apiClient.post<SpkInternal>(`/api/v1/spk-internal/${id}/allocate`, { jumlah });

export const listTrackingPic = () => apiClient.get<TrackingPic[]>("/api/v1/tracking/pic");

// Needs report.view. Mutations are derived from inbound (Masuk) and outbound (Keluar).
export const listMutations = (params?: MutationListParams) =>
  apiClient.get<PaginatedResult<MutationRow>>(`/api/v1/reports/mutations${toQuery(params)}`);

export const getStockOpnameSummary = (params?: { month?: number; year?: number }) =>
  apiClient.get<StockOpnameSummary>(`/api/v1/reports/stock-opname-summary${toQuery(params)}`);

export function listApprovals(params?: ApprovalListParams) {
  return apiClient.get<PaginatedResult<ApprovalRequest>>(`/api/v1/approvals${toQuery(params)}`);
}

export function createPurchaseRequest(payload: PurchaseRequestPayload) {
  return apiClient.post<ApprovalRequest>("/api/v1/approvals", { type: "purchase-request", payload });
}

// Returns the request plus its action history (same shape as /approvals/{id}/actions).
export function getApprovalDetail(id: number | string) {
  return apiClient.get<{ request: ApprovalRequest; actions: unknown[] }>(`/api/v1/approvals/${id}`);
}

export const approveApproval = (id: number, note?: string) => apiClient.post(`/api/v1/approvals/${id}/approve`, note ? { note } : {});
export const rejectApproval = (id: number, note: string) => apiClient.post(`/api/v1/approvals/${id}/reject`, { note });
export const requestApprovalRevision = (id: number, note: string) =>
  apiClient.post(`/api/v1/approvals/${id}/request-revision`, { note });

