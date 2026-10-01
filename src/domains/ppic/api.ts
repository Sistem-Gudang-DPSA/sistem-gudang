import { apiClient, toQuery } from "@/shared/lib/api-client";
import type { PaginatedResult } from "@/domains/inventory/types";
import type { BahanDokubah, DokubahItem, StatusDokubah } from "./data/dokubah";
import type { CreateDokubahInput, TrackingSpk, DokubahApiDetail, DokubahApiRow, DokubahApiStatus, DokubahListParams } from "./types";

// The screens use title-case statuses, the API uses UPPER_SNAKE.
const STATUS_TO_UI: Record<DokubahApiStatus, StatusDokubah> = {
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
