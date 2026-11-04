import { describe, expect, it, vi } from 'vitest';
import type { ItemListRow } from '@/domains/inventory/types';

vi.mock('@/domains/ppic/api', () => ({
  getDokubah: vi.fn(async () => ({
    noSpk: 'SPK-1',
    client: 'PT Maju',
    totalAnggaran: 1000,
    bahan: [
      { kodeBarang: 'K1', namaBahan: 'Paku', satuan: 'pcs', kuota: 10, realisasi: 4 },
      { kodeBarang: null, namaBahan: ' lem kayu ', satuan: 'kg', kuota: 2, realisasi: 1 },
      { kodeBarang: 'X9', namaBahan: 'Tidak ada', satuan: 'pcs', kuota: 1, realisasi: 3 },
    ],
  })),
}));

const { loadRincianSpk, periodeLabel, statusRealisasi, toRealisasiRow } = await import('./RealisasiSPK');

const item = (code: string, name: string, price: number) => ({ code, name, price }) as ItemListRow;

describe('Realisasi SPK', () => {
  it('marks spending over budget as Rugi, otherwise Untung', () => {
    expect(statusRealisasi(100, 101)).toBe('Rugi');
    expect(statusRealisasi(100, 100)).toBe('Untung');
  });

  it('builds a list row with remaining budget and status', () => {
    expect(toRealisasiRow({ id: 1, noSpk: 'S', client: 'C', totalAnggaran: 500, totalRealisasiNilai: 700 })).toEqual({
      id: 1, noSpk: 'S', client: 'C', anggaran: 500, realisasi: 700, sisa: -200, status: 'Rugi',
    });
  });

  it('labels the period from the chosen parts', () => {
    expect(periodeLabel('05', '3', '2026')).toBe('5 Maret 2026');
    expect(periodeLabel('', '', '2026')).toBe('2026');
    expect(periodeLabel('', '', '')).toBe('Semua periode');
  });

  it('prices each material by code, then by name, and totals the cost', async () => {
    const r = await loadRincianSpk(7, [item('K1', 'Paku', 100), item('K2', 'Lem Kayu', 50)]);
    expect(r.rows.map((x) => [x.kode, x.harga, x.biaya])).toEqual([
      ['K1', 100, 400],
      ['-', 50, 50],
      ['X9', 0, 0],
    ]);
    expect(r).toMatchObject({ id: 7, noSpk: 'SPK-1', anggaran: 1000, totalBiaya: 450 });
  });
});
