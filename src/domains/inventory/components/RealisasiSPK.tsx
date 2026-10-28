import { getDokubah, listDokubah } from '@/domains/ppic/api';
import type { BahanDokubah } from '@/domains/ppic/data/dokubah';
import type { ItemListRow } from '@/domains/inventory/types';

export type SpkBahan = { noSpk: string; bahan: BahanDokubah[] };
export type Cell = { qty: number; cost: number };
export type RealisasiRow = { id: number; code: string; name: string; price: number; cells: Cell[] };
export type RealisasiTable = { client: string; spks: string[]; rows: RealisasiRow[]; totals: number[] };

const samaNama = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export const fmtRp = (n: number) =>
  n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtQty = (n: number) => n.toLocaleString('id-ID');

// Material dokubah satu SPK. Dokubah yang disetujui dipakai; kalau belum ada, dokubah pertama SPK itu.
async function loadBahanSpk(noSpk: string): Promise<SpkBahan> {
  const res = await listDokubah({ search: noSpk, pageSize: 100 });
  const milik = res.rows.filter((d) => d.noSpk === noSpk);
  const dipakai = milik.find((d) => d.status === 'Approved') ?? milik[0];
  const bahan = dipakai ? (await getDokubah(dipakai.id)).bahan : [];
  return { noSpk, bahan };
}

// Dimuat 5 SPK sekaligus supaya tidak membanjiri server
export async function loadRealisasi(spks: string[]): Promise<SpkBahan[]> {
  const out: SpkBahan[] = [];
  for (let i = 0; i < spks.length; i += 5) {
    out.push(...(await Promise.all(spks.slice(i, i + 5).map(loadBahanSpk))));
  }
  return out;
}

// Dicocokkan lewat kode barang, kalau tidak ketemu lewat nama (sama seperti form barang keluar)
function cellFor(item: ItemListRow, bahan: BahanDokubah[]): Cell {
  let cocok = bahan.filter((m) => !!item.code && m.kodeBarang === item.code);
  if (cocok.length === 0) cocok = bahan.filter((m) => samaNama(m.namaBahan, item.name));
  const qty = cocok.reduce((sum, m) => sum + m.realisasi, 0); // realisasi = jumlah pengambilan di dokubah
  return { qty, cost: qty * (item.price ?? 0) };
}

export function makeRows(items: ItemListRow[], spks: SpkBahan[]): RealisasiRow[] {
  return items.map((item) => ({
    id: item.id,
    code: item.code ?? '-',
    name: item.name,
    price: item.price ?? 0,
    cells: spks.map((s) => cellFor(item, s.bahan)),
  }));
}

export const totalsOf = (rows: RealisasiRow[], spkCount: number) =>
  Array.from({ length: spkCount }, (_, i) => rows.reduce((sum, r) => sum + r.cells[i].cost, 0));