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

export interface CreateDokubahInput {
  noSpk: string;
  client: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  fileDokubah?: string;
  status?: "DRAFT" | "PENDING";
  bahan?: Pick<DokubahApiMaterial, "kodeBarang" | "namaBahan" | "satuan" | "hargaSatuan" | "keterangan" | "kuota">[];
}
