import { getDokubah } from '@/domains/ppic/api';
import { listItems } from '@/domains/inventory/api';
import type { BahanDokubah } from '@/domains/ppic/data/dokubah';
import type { ItemListRow } from '@/domains/inventory/types';
import { fetchAllPages } from '@/shared/lib/fetch-all';

export const realisasiSpkPath = '/dashboard/gudang/laporan/realisasi-spk'; // sesuaikan dengan route Anda
export const realisasiSpkDetailPath = (id: number) => `${realisasiSpkPath}/${id}`;

export type StatusRealisasi = 'Untung' | 'Rugi';
// Sisa anggaran negatif = pengeluaran melebihi anggaran
export const statusRealisasi = (anggaran: number, realisasi: number): StatusRealisasi =>
  anggaran - realisasi < 0 ? 'Rugi' : 'Untung';

export type RealisasiListRow = {
  id: number; noSpk: string; client: string;
  anggaran: number; realisasi: number; sisa: number; status: StatusRealisasi;
};

// Baris daftar dari listDokubahRows (field yang sama dengan halaman Rekap Dokubah)
export const toRealisasiRow = (r: { id: number; noSpk: string; client: string; totalAnggaran: number; totalRealisasiNilai: number }): RealisasiListRow => ({
  id: r.id,
  noSpk: r.noSpk,
  client: r.client,
  anggaran: r.totalAnggaran,
  realisasi: r.totalRealisasiNilai,
  sisa: r.totalAnggaran - r.totalRealisasiNilai,
  status: statusRealisasi(r.totalAnggaran, r.totalRealisasiNilai),
});

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export function periodeLabel(day: string, month: string, year: string) {
  const parts = [day ? String(Number(day)) : '', month ? BULAN[Number(month) - 1] : '', year].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Semua periode';
}

// ---------- Rincian satu SPK ----------
export type RincianRow = { kode: string; nama: string; satuan: string; kuota: number; qty: number; harga: number; biaya: number };
export type RincianSpk = { id: number; noSpk: string; client: string; anggaran: number; rows: RincianRow[]; totalBiaya: number };

export const loadAllItems = () => fetchAllPages((page, pageSize) => listItems({ page, pageSize }));

const samaNama = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Harga dari data barang, dicocokkan lewat kode, kalau tidak ketemu lewat nama
function hargaBarang(m: BahanDokubah, items: ItemListRow[]) {
  const it = items.find((x) => !!x.code && x.code === m.kodeBarang) ?? items.find((x) => samaNama(x.name, m.namaBahan));
  return it?.price ?? 0;
}

export async function loadRincianSpk(id: number, items: ItemListRow[]): Promise<RincianSpk> {
  const d = await getDokubah(id);
  const rows = d.bahan.map((m): RincianRow => {
    const harga = hargaBarang(m, items);
    // realisasi = jumlah pengambilan yang tercatat di dokubah
    return { kode: m.kodeBarang ?? '-', nama: m.namaBahan, satuan: m.satuan, kuota: m.kuota, qty: m.realisasi, harga, biaya: m.realisasi * harga };
  });
  return { id, noSpk: d.noSpk, client: d.client, anggaran: d.totalAnggaran, rows, totalBiaya: rows.reduce((s, r) => s + r.biaya, 0) };
}