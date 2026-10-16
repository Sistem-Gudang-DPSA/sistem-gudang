import { apiClient, toQuery } from "@/shared/lib/api-client";
import type { ListParams, PaginatedResult } from "@/domains/inventory/types";
import type { BahanDokubah, DokubahItem, StatusDokubah } from "./data/dokubah";
import type { SpkInternal } from "./data/spk-internal";
import type { PenawaranDetail, PenawaranHeaderInput, PenawaranRow, SavePenawaranInput, ApprovalAction, ApprovalListParams, ApprovalRequest, PurchaseRequestPayload, CreateDokubahInput, CreateSpkInternalInput, SpkInternalListParams, TrackingSpk, TrackingPic, MutationListParams, MutationRow, MutationSummary, SpkInternalSummary, StockOpnameSummary, DokubahApiDetail, DokubahApiRow, DokubahApiStatus, DokubahListParams, DokubahSummary, TrackingSpkDetail } from "./types";

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
  riwayat: "riwayat" in row ? row.riwayat ?? [] : [],
});

export async function listDokubah(params?: DokubahListParams): Promise<PaginatedResult<DokubahItem> & { summary?: DokubahSummary }> {
  const res = await apiClient.get<PaginatedResult<DokubahApiRow> & { summary?: DokubahSummary }>(`/api/v1/dokubah${toQuery(params)}`);
  return { ...res, rows: res.rows.map(toItem) };
}

// Raw rows (with totalKuota / totalRealisasi) for the Gudang recap.
export const listDokubahRows = (params?: DokubahListParams) =>
  apiClient.get<PaginatedResult<DokubahApiRow> & { summary?: DokubahSummary }>(`/api/v1/dokubah${toQuery(params)}`);

// SPK numbers and client names from the tracking system. The API caps limit at 100 (default 50); search matches noSpk or client.
export const listTrackingSpk = (search?: string, limit?: number) => apiClient.get<TrackingSpk[]>(`/api/v1/tracking/spk${toQuery({ search, limit })}`);

// One SPK with its products. noSpk can contain '/', so it must be encoded. 404 when unknown.
export const getTrackingSpk = (noSpk: string) => apiClient.get<TrackingSpkDetail>(`/api/v1/tracking/spk/${encodeURIComponent(noSpk)}`);

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
export const submitDokubah = async (id: number) => toItem(await apiClient.post<DokubahApiDetail>(`/api/v1/dokubah/${id}/submit`));
export const approveDokubah = async (id: number) => toItem(await apiClient.post<DokubahApiDetail>(`/api/v1/dokubah/${id}/approve`));
// The reason is required by the API (non-empty, max 500).
export const rejectDokubah = async (id: number, note: string) => toItem(await apiClient.post<DokubahApiDetail>(`/api/v1/dokubah/${id}/reject`, { note }));

export const listSpkInternal = (params?: SpkInternalListParams) =>
  apiClient.get<PaginatedResult<SpkInternal> & { summary: SpkInternalSummary }>(`/api/v1/spk-internal${toQuery(params)}`);

// Creates the whole document; the server numbers it and starts each line's totalBisaPakai at alokasiStokBebas.
export const createSpkInternal = (input: CreateSpkInternalInput) => apiClient.post<{ id: number; noSpk: string }>("/api/v1/spk-internal", input);

// Rejected with 400 unless jumlah is an integer > 0 and <= totalBisaPakai; 0 left means LOCKED.
export const allocateSpkInternal = (id: number, jumlah: number) =>
  apiClient.post<SpkInternal>(`/api/v1/spk-internal/${id}/allocate`, { jumlah });

export const listTrackingPic = () => apiClient.get<TrackingPic[]>("/api/v1/tracking/pic");

// Needs report.view. Mutations are derived from inbound (Masuk) and outbound (Keluar).
export const listMutations = (params?: MutationListParams) =>
  apiClient.get<PaginatedResult<MutationRow> & { summary: MutationSummary }>(`/api/v1/reports/mutations${toQuery(params)}`);

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
  return apiClient.get<{ request: ApprovalRequest; actions: ApprovalAction[] }>(`/api/v1/approvals/${id}`);
}

export const resubmitApproval = (id: number, payload: PurchaseRequestPayload) =>
  apiClient.post(`/api/v1/approvals/${id}/resubmit`, { payload });
export const approveApproval = (id: number, note?: string) => apiClient.post(`/api/v1/approvals/${id}/approve`, note ? { note } : {});
export const rejectApproval = (id: number, note: string) => apiClient.post(`/api/v1/approvals/${id}/reject`, { note });
export const requestApprovalRevision = (id: number, note: string) =>
  apiClient.post(`/api/v1/approvals/${id}/request-revision`, { note });

export const listPenawaran = (params?: ListParams & { status?: string }) =>
  apiClient.get<PaginatedResult<PenawaranRow>>(`/api/v1/penawaran-harga${toQuery(params)}`);
export const createPenawaran = (input: PenawaranHeaderInput) => apiClient.post<PenawaranDetail>("/api/v1/penawaran-harga", input);
export const getPenawaran = (id: number | string) => apiClient.get<PenawaranDetail>(`/api/v1/penawaran-harga/${id}`);
// Replaces the header and every material row in one call; the response is the full detail.
export const updatePenawaran = (id: number | string, input: SavePenawaranInput) =>
  apiClient.put<PenawaranDetail>(`/api/v1/penawaran-harga/${id}`, input);
export const publishPenawaran = (id: number | string) => apiClient.post<PenawaranDetail>(`/api/v1/penawaran-harga/${id}/publish`);

