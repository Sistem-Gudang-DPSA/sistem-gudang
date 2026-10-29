import { listDokubahBahanBySpk } from '@/domains/ppic/api';
import type { BahanDokubah } from '@/domains/ppic/data/dokubah';
import type { ItemListRow } from '@/domains/inventory/types';
import { toDateRange } from '@/domains/inventory/date';
import { listOutbound } from '../api';

export type SpkBahan = { noSpk: string; bahan: BahanDokubah[] };
export type SpkUsage = { noSpk: string; qtyOf: (item: ItemListRow) => number };
export type Cell = { qty: number; cost: number };
export type RealisasiRow = { id: number; code: string; name: string; price: number; totalQty: number; cells: Cell[] };
export type RealisasiTable = { client: string; periode: string; spks: string[]; rows: RealisasiRow[]; totals: number[] };
export type RekapKolom = { client: string; noSpk: string };
export type RekapBulanan = {
  periode: string;
  kolom: RekapKolom[];
  rows: { id: number; code: string; name: string; price: number; totalQty: number; qty: number[] }[];
  biaya: number[];
};

const samaNama = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export const fmtRp = (n: number) =>
  n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtQty = (n: number) => n.toLocaleString('id-ID');

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export function periodeLabel(day: string, month: string, year: string) {
  const parts = [day ? String(Number(day)) : '', month ? BULAN[Number(month) - 1] : '', year].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Semua periode';
}

function qtyFromBahan(item: ItemListRow, bahan: BahanDokubah[]): number {
  let cocok = bahan.filter((m) => !!item.code && m.kodeBarang === item.code);
  if (cocok.length === 0) cocok = bahan.filter((m) => samaNama(m.namaBahan, item.name));
  return cocok.reduce((sum, m) => sum + m.realisasi, 0); 
}

export async function loadRealisasi(spks: string[]): Promise<SpkUsage[]> {
  const found = new Map<string, BahanDokubah[]>();
  for (let i = 0; i < spks.length; i += 100) {
    const res: SpkBahan[] = await listDokubahBahanBySpk(spks.slice(i, i + 100));
    res.forEach((r) => found.set(r.noSpk, r.bahan));
  }
  return spks.map((noSpk) => ({ noSpk, qtyOf: (item) => qtyFromBahan(item, found.get(noSpk) ?? []) }));
}

export async function loadRealisasiPeriode(spks: string[], range: ReturnType<typeof toDateRange>): Promise<SpkUsage[]> {
  const perSpk = new Map<string, Map<number, number>>(spks.map((s) => [s, new Map()]));
  let loaded = 0;
  for (let page = 1; ; page++) {
    const res = await listOutbound({ page, pageSize: 100, ...range });
    for (const trx of res.rows) {
      const target = perSpk.get(trx.spk);
      if (!target) continue; // SPK client lain atau transaksi stok
      for (const line of trx.lines) target.set(line.itemId, (target.get(line.itemId) ?? 0) + line.qty);
    }
    loaded += res.rows.length;
    if (res.rows.length === 0 || loaded >= res.total) break;
  }
  return spks.map((noSpk) => ({ noSpk, qtyOf: (item) => perSpk.get(noSpk)?.get(item.id) ?? 0 }));
}

// ---------- Tabel ----------
export function makeRows(items: ItemListRow[], usages: SpkUsage[]): RealisasiRow[] {
  return items.map((item) => {
    const price = item.price ?? 0;
    const cells = usages.map((u) => {
      const qty = u.qtyOf(item);
      return { qty, cost: qty * price };
    });
    return {
      id: item.id,
      code: item.code ?? '-',
      name: item.name,
      price,
      totalQty: cells.reduce((sum, c) => sum + c.qty, 0),
      cells,
    };
  });
}

export const totalsOf = (rows: RealisasiRow[], spkCount: number) =>
  Array.from({ length: spkCount }, (_, i) => rows.reduce((sum, r) => sum + r.cells[i].cost, 0));

// ---------- Rekap bulanan: semua client ----------
export async function loadRekapBulanan(items: ItemListRow[], month: string, year: string): Promise<RekapBulanan> {
  const range = toDateRange('', month, year);
  const perKolom = new Map<string, { kolom: RekapKolom; qty: Map<number, number> }>();
  let loaded = 0;
  for (let page = 1; ; page++) {
    const res = await listOutbound({ page, pageSize: 100, ...range });
    for (const trx of res.rows) {
      const client = trx.clientName?.trim();
      if (!client || !trx.spk) continue; 
      const key = JSON.stringify([client, trx.spk]);
      const entry = perKolom.get(key) ?? { kolom: { client, noSpk: trx.spk }, qty: new Map<number, number>() };
      for (const l of trx.lines) entry.qty.set(l.itemId, (entry.qty.get(l.itemId) ?? 0) + l.qty);
      perKolom.set(key, entry);
    }
    loaded += res.rows.length;
    if (res.rows.length === 0 || loaded >= res.total) break;
  }

  const entries = [...perKolom.values()].sort(
    (a, b) => a.kolom.client.localeCompare(b.kolom.client) || a.kolom.noSpk.localeCompare(b.kolom.noSpk),
  );
  const rows = items
    .map((item) => {
      const qty = entries.map((e) => e.qty.get(item.id) ?? 0);
      return {
        id: item.id,
        code: item.code ?? '-',
        name: item.name,
        price: item.price ?? 0,
        totalQty: qty.reduce((s, v) => s + v, 0),
        qty,
      };
    })
    .filter((r) => r.totalQty > 0); 
  const biaya = entries.map((_, i) => rows.reduce((s, r) => s + r.qty[i] * r.price, 0));

  return { periode: periodeLabel('', month, year), kolom: entries.map((e) => e.kolom), rows, biaya };
}