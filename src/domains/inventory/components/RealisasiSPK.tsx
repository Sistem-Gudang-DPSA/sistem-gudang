import { getOutboundUsage, listItems } from '@/domains/inventory/api';
import type { ItemListRow } from '@/domains/inventory/types';
import { fetchAllPages } from '@/shared/lib/fetch-all';

// TODO(realisasi-dokubah): sementara realisasi dihitung dari barang keluar (GET /outbound/usage)
// x harga barang, karena modul PPIC/dokubah belum dipakai. Anggaran, sisa, dan status Untung/Rugi
// baru ada setelah dokubah APPROVED tersedia; versi dokubah ada di commit 2a26f4e.
// Lihat docs/18-Realisasi-SPK-Dokubah.md dan issue #38.
export const SUMBER_DATA_NOTICE =
  'Data realisasi sementara dihitung dari Barang Keluar (jumlah x harga barang), belum dari dokubah PPIC. Anggaran, sisa, dan status akan tersedia setelah modul PPIC (dokubah) berjalan.';

export const realisasiSpkPath = '/dashboard/gudang/laporan/realisasi-spk';
export const realisasiSpkDetailPath = (noSpk: string) => `${realisasiSpkPath}/${encodeURIComponent(noSpk)}`;

export type StatusRealisasi = 'Untung' | 'Rugi';
// Sisa anggaran negatif = pengeluaran melebihi anggaran
export const statusRealisasi = (anggaran: number, realisasi: number): StatusRealisasi =>
  anggaran - realisasi < 0 ? 'Rugi' : 'Untung';

// anggaran, sisa, dan status null selama data berasal dari barang keluar
export type RealisasiListRow = {
  id: string; noSpk: string; client: string;
  anggaran: number | null; realisasi: number; sisa: number | null; status: StatusRealisasi | null;
};

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export function periodeLabel(day: string, month: string, year: string) {
  const parts = [day ? String(Number(day)) : '', month ? BULAN[Number(month) - 1] : '', year].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Semua periode';
}

export const loadAllItems = () => fetchAllPages((page, pageSize) => listItems({ page, pageSize }));

// Satu baris per SPK: realisasi = jumlah barang keluar x harga barang saat ini
export async function loadRealisasiList(range: { startDate?: string; endDate?: string }): Promise<RealisasiListRow[]> {
  const [usage, items] = await Promise.all([getOutboundUsage(range), loadAllItems()]);
  const harga = new Map(items.map((it) => [it.id, it.price ?? 0]));
  const bySpk = new Map<string, RealisasiListRow>();
  for (const u of usage) {
    const row = bySpk.get(u.spk) ?? { id: u.spk, noSpk: u.spk, client: u.clientName, anggaran: null, realisasi: 0, sisa: null, status: null };
    row.realisasi += u.qty * (harga.get(u.itemId) ?? 0);
    bySpk.set(u.spk, row);
  }
  return [...bySpk.values()];
}

// ---------- Rincian satu SPK ----------
export type RincianRow = { kode: string; nama: string; satuan: string; kuota: number; qty: number; harga: number; biaya: number };
export type RincianSpk = { id: string; noSpk: string; client: string; anggaran: number | null; rows: RincianRow[]; totalBiaya: number };

export async function loadRincianSpk(noSpk: string, items: ItemListRow[]): Promise<RincianSpk> {
  const usage = await getOutboundUsage({ spk: [noSpk] });
  const byId = new Map(items.map((it) => [it.id, it]));
  const rows = usage.map((u): RincianRow => {
    const it = byId.get(u.itemId);
    const harga = it?.price ?? 0;
    // kuota berasal dari dokubah, belum tersedia
    return { kode: it?.code || '-', nama: it?.name ?? `Barang #${u.itemId}`, satuan: it?.unit ?? '-', kuota: 0, qty: u.qty, harga, biaya: u.qty * harga };
  });
  return {
    id: noSpk, noSpk, client: usage[0]?.clientName ?? '-', anggaran: null, rows,
    totalBiaya: rows.reduce((s, r) => s + r.biaya, 0),
  };
}
