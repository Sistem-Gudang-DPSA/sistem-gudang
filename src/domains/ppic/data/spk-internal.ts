export type StatusBarang = 'LOCKED' | 'BUFFER';

// One row per line of an SPK Internal document; `id` is the line id (used by allocate).
export type SpkInternal = {
  id: number;
  spkInternalId: number;
  noSpk: string;
  tanggalTerbit: string;
  tujuanProduksi: string;
  spkKlienInduk: string;
  penanggungJawab: string;
  targetSelesai: string;
  catatan: string | null;
  sku: string;
  namaBarang: string;
  periode: string;
  totalQty: number;
  alokasiSpkKlien: number;
  alokasiStokBebas: number;
  totalStock: number;
  totalBisaPakai: number;
  status: StatusBarang;
};

export const spk_internal_path = '/dashboard/ppic/transaksi/spk-mutasi-internal';

export const buat_spk_internal_path = `${spk_internal_path}/buat-spk`;

export const alokasiBarangPath = (id: number | string) => `${spk_internal_path}/alokasi-barang/${id}`;
