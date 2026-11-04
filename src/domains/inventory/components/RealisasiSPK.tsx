import type { ItemListRow } from '@/domains/inventory/types';
import { toDateRange } from '@/domains/inventory/date';
import { getOutboundUsage, type OutboundUsageRow } from '../api';

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

export const fmtRp = (n: number) =>
  n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtQty = (n: number) => n.toLocaleString('id-ID');

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export function periodeLabel(day: string, month: string, year: string) {
  const parts = [day ? String(Number(day)) : '', month ? BULAN[Number(month) - 1] : '', year].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Semua periode';
}

const sameClient = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Client yang punya barang keluar (pada periode yang dimuat), A-Z
// (beda huruf besar/kecil dianggap client yang sama)
export function clientsOf(usage: OutboundUsageRow[]) {
  const byKey = new Map<string, string>();
  for (const r of usage) {
    const name = r.clientName.trim();
    if (name && !byKey.has(name.toLowerCase())) byKey.set(name.toLowerCase(), name);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

// Satu kolom per SPK client itu; qty = jumlah barang keluar per barang di SPK tersebut
export function usagesOf(usage: OutboundUsageRow[], client: string): SpkUsage[] {
  const perSpk = new Map<string, Map<number, number>>();
  for (const r of usage) {
    if (!r.spk || !sameClient(r.clientName, client)) continue;
    const m = perSpk.get(r.spk) ?? new Map<number, number>();
    m.set(r.itemId, (m.get(r.itemId) ?? 0) + r.qty);
    perSpk.set(r.spk, m);
  }
  return [...perSpk.keys()].sort((a, b) => a.localeCompare(b)).map((noSpk) => ({ noSpk, qtyOf: (item) => perSpk.get(noSpk)?.get(item.id) ?? 0 }));
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
  for (const r of await getOutboundUsage(range)) {
    const client = r.clientName?.trim();
    if (!client || !r.spk) continue;
    const key = JSON.stringify([client, r.spk]);
    const entry = perKolom.get(key) ?? { kolom: { client, noSpk: r.spk }, qty: new Map<number, number>() };
    entry.qty.set(r.itemId, (entry.qty.get(r.itemId) ?? 0) + r.qty);
    perKolom.set(key, entry);
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