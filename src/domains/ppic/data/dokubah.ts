import type { DokubahRiwayat } from '../types';
export type StatusDokubah = 'Draft' | 'Pending' | 'Approved' | 'Rejected';

export interface BahanDokubah {
  kodeBarang: string;
  namaBahan: string;
  satuan: string;
  hargaSatuan: number;
  kuota: number;
  realisasi: number;
  keterangan: string;
}

export interface DokubahItem {
  id: number;
  noSpk: string;
  client: string;
  tanggalMulai: string; // YYYY-MM-DD
  tanggalSelesai: string; // YYYY-MM-DD
  status: StatusDokubah;
  penanggungJawab?: string;
  fileDokubah?: string;
  totalAnggaran: number;
  bahan: BahanDokubah[];
  riwayat?: DokubahRiwayat[];
}

export const dokubah_path = '/dashboard/ppic/transaksi/dokubah';

export const  buat_dokubah_path= `${dokubah_path}/buat-dokubah`;

export const viewDokubahPath = (id: number | string) => `${dokubah_path}/view-dokubah/${id}`;

export const editMaterialPath = (id: number | string) => `${dokubah_path}/edit-material/${id}`;

export const rekap_dokubah_path = '/dashboard/ppic/laporan/rekap-dokubah';

export const detailRekapDokubahPath = (id: number | string) => `${rekap_dokubah_path}/detail-rekap-dokubah/${id}`;

// The Gudang division has its own Rekap Dokubah pages; PPIC users cannot open /dashboard/gudang, so the two paths stay apart.
export const gudang_rekap_dokubah_path = '/dashboard/gudang/laporan/dokubah';

export const detailGudangRekapDokubahPath = (id: number | string) => `${gudang_rekap_dokubah_path}/detail-dokubah/${id}`;

// YYYY-MM-DD -> DD/MM/YYYY tanpa lewat Date, supaya tidak bergeser karena timezone
export const formatTanggal = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const angkaFormatter = new Intl.NumberFormat('id-ID');

export const formatAngka = (value: number) => angkaFormatter.format(value);

export const formatRupiah = (value: number) => `${value < 0 ? '-' : ''}Rp. ${formatAngka(Math.abs(value))}`;

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
