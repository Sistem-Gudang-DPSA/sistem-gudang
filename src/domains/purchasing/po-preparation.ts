import type { PermintaanPembelian } from '@/domains/ppic/data/pembelian';
import type { Supplier } from './types';

export type PreparedPoLine = {
  lineIndex: number;
  qtyBeli: number;
  supplier: Supplier;
  kodeBarang: string;
  itemId?: number;
  // SPK dari baris permintaan; dipakai untuk mengelompokkan PO.
  noSpk: string;
  // Harga Saat Ini yang diisi Purchasing di tabel mapping.
  harga: number;
  // items.price saat Generate; dipakai untuk tahu apakah harga master perlu diperbarui.
  hargaTerbaru: number;
};

export type PoPreparation = {
  requestId: number;
  signature: string;
  lines: PreparedPoLine[];
};

export function savePoPreparation(request: PermintaanPembelian, lines: PreparedPoLine[]) {
  const token = crypto.randomUUID();
  const draft: PoPreparation = { requestId: request.id, signature: JSON.stringify(request.barang), lines };
  sessionStorage.setItem(`po-preparation:${token}`, JSON.stringify(draft));
  return token;
}

export function readPoPreparation(token: string, request: PermintaanPembelian): PoPreparation | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(`po-preparation:${token}`) ?? 'null') as PoPreparation | null;
    if (!value || value.requestId !== request.id || value.signature !== JSON.stringify(request.barang) || !Array.isArray(value.lines) || !value.lines.length) return null;
    const seen = new Set<string>();
    for (const line of value.lines) {
      if (!Number.isInteger(line.lineIndex) || line.lineIndex < 0 || !request.barang[line.lineIndex] || !Number.isInteger(line.qtyBeli) || line.qtyBeli <= 0 || line.qtyBeli > 1_000_000 || !line.supplier || !Number.isInteger(line.supplier.id) || line.supplier.id <= 0 || typeof line.supplier.name !== 'string' || typeof line.kodeBarang !== 'string' || typeof line.noSpk !== 'string' || !Number.isInteger(line.harga) || line.harga < 0 || !Number.isInteger(line.hargaTerbaru) || line.hargaTerbaru < 0) return null;
      // Satu baris permintaan boleh dipecah ke beberapa supplier, tetapi supplier yang sama tidak boleh dobel.
      const key = `${line.lineIndex}:${line.supplier.id}`;
      if (seen.has(key)) return null;
      seen.add(key);
    }
    return value;
  } catch {
    return null;
  }
}

export function groupPoPreparation(request: PermintaanPembelian, lines: PreparedPoLine[]) {
  const groups = new Map<string, { proyek: string; noSpk: string; supplier: Supplier; lines: PreparedPoLine[] }>();
  for (const line of lines) {
    const proyek = request.barang[line.lineIndex].proyek.trim();
    const key = JSON.stringify([proyek, line.noSpk, line.supplier.id]);
    const group = groups.get(key) ?? { proyek, noSpk: line.noSpk, supplier: line.supplier, lines: [] };
    group.lines.push(line);
    groups.set(key, group);
  }
  return [...groups.values()];
}
