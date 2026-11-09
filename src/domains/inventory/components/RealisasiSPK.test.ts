import { describe, expect, it, vi } from 'vitest';
import type { ItemListRow } from '@/domains/inventory/types';

const usage = [
  { clientName: 'PT Maju', spk: 'SPK/01', itemId: 1, qty: 4 },
  { clientName: 'PT Maju', spk: 'SPK/01', itemId: 2, qty: 1 },
  { clientName: 'CV Lain', spk: 'SPK-9', itemId: 1, qty: 2 },
  { clientName: 'CV Lain', spk: 'SPK-9', itemId: 99, qty: 5 }, // barang tidak dikenal: harga 0
];
const items = [
  { id: 1, code: 'K1', name: 'Paku', unit: 'pcs', price: 100 },
  { id: 2, code: 'K2', name: 'Lem', unit: 'kg', price: 50 },
] as ItemListRow[];

const getOutboundUsage = vi.fn(async (p: { spk?: string[] }) => (p.spk ? usage.filter((u) => p.spk!.includes(u.spk)) : usage));
vi.mock('@/domains/inventory/api', () => ({
  getOutboundUsage: (p: { spk?: string[] }) => getOutboundUsage(p),
  listItems: async () => ({ rows: items, total: items.length }),
}));

const { loadRealisasiList, loadRincianSpk, periodeLabel, realisasiSpkDetailPath, statusRealisasi } = await import('./RealisasiSPK');

describe('Realisasi SPK dari barang keluar', () => {
  it('one row per SPK, realisasi = qty x item price, no budget yet', async () => {
    expect(await loadRealisasiList({ startDate: '2026-11-01', endDate: '2026-11-30' })).toEqual([
      { id: 'SPK/01', noSpk: 'SPK/01', client: 'PT Maju', anggaran: null, realisasi: 450, sisa: null, status: null },
      { id: 'SPK-9', noSpk: 'SPK-9', client: 'CV Lain', anggaran: null, realisasi: 200, sisa: null, status: null },
    ]);
    expect(getOutboundUsage).toHaveBeenCalledWith({ startDate: '2026-11-01', endDate: '2026-11-30' });
  });

  it('details one SPK per item with cost and total', async () => {
    const r = await loadRincianSpk('SPK/01', items);
    expect(getOutboundUsage).toHaveBeenLastCalledWith({ spk: ['SPK/01'] });
    expect(r.rows.map((x) => [x.kode, x.nama, x.satuan, x.qty, x.harga, x.biaya])).toEqual([
      ['K1', 'Paku', 'pcs', 4, 100, 400],
      ['K2', 'Lem', 'kg', 1, 50, 50],
    ]);
    expect(r).toMatchObject({ noSpk: 'SPK/01', client: 'PT Maju', anggaran: null, totalBiaya: 450 });
  });

  it('encodes the SPK number in the detail path (it may contain a slash)', () => {
    expect(realisasiSpkDetailPath('SPK/01')).toBe('/dashboard/keuangan/laporan/realisasi-spk/SPK%2F01');
  });

  it('keeps the dokubah helpers for later: status and period label', () => {
    expect(statusRealisasi(100, 101)).toBe('Rugi');
    expect(statusRealisasi(100, 100)).toBe('Untung');
    expect(periodeLabel('05', '3', '2026')).toBe('5 Maret 2026');
    expect(periodeLabel('', '', '')).toBe('Semua periode');
  });
});
