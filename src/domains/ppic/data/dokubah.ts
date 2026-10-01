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
  fileDokubah?: string;
  totalAnggaran: number;
  bahan: BahanDokubah[];
}

export const dokubah_path = '/dashboard/ppic/transaksi/dokubah';

export const  buat_dokubah_path= `${dokubah_path}/buat-dokubah`;

export const viewDokubahPath = (id: number | string) => `${dokubah_path}/view-dokubah/${id}`;

export const editMaterialPath = (id: number | string) => `${dokubah_path}/edit-material/${id}`;

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
