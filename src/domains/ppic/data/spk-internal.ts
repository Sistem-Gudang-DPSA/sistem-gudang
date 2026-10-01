export type StatusBarang = 'LOCKED' | 'BUFFER';

export type SpkInternal = {
  id: number;
  noSpk: string;
  sku: string;
  namaBarang: string;
  periode: string;
  totalStock: number;
  totalBisaPakai: number;
  status: StatusBarang;
};

export const spk_internal_path = '/dashboard/ppic/transaksi/spk-mutasi-internal';

export const buat_spk_internal_path = `${spk_internal_path}/buat-spk`;

export const alokasiBarangPath = (id: number | string) => `${spk_internal_path}/alokasi-barang/${id}`;
