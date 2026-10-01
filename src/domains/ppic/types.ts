export type DokubahApiStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";

export interface DokubahApiMaterial {
  kodeBarang: string;
  namaBahan: string;
  satuan: string;
  hargaSatuan: number;
  kuota: number;
  realisasi: number;
  keterangan: string;
}

export interface DokubahApiRow {
  id: number;
  noSpk: string;
  client: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  status: DokubahApiStatus;
  fileDokubah: string | null;
  totalAnggaran: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  totalKuota: number;
  totalRealisasi: number;
  // Rupiah value of the realisation: sum of realisasi * hargaSatuan.
  totalRealisasiNilai: number;
}

export interface DokubahApiDetail extends DokubahApiRow {
  bahan: DokubahApiMaterial[];
}

export interface DokubahListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: DokubahApiStatus;
  startDate?: string;
  endDate?: string;
}

// SPK and client names come from the tracking system (dummy on the BE for now).
export interface TrackingSpk {
  noSpk: string;
  client: string;
}

export interface CreateDokubahInput {
  noSpk: string;
  // Optional and ignored by the API, which fills the client from tracking.
  client?: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  fileDokubah?: string;
  status?: "DRAFT" | "PENDING";
  bahan?: Pick<DokubahApiMaterial, "kodeBarang" | "namaBahan" | "satuan" | "hargaSatuan" | "keterangan" | "kuota">[];
}

export interface SpkInternalListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "LOCKED" | "BUFFER";
}

export interface CreateSpkInternalInput {
  itemId: number;
  month: number;
  year: number;
}
