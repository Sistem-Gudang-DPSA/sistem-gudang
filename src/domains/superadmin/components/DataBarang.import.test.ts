import { describe, expect, it } from 'vitest';
import { installFakeApi, fail } from '@/test/fake-api';
import { importItems } from '@/domains/inventory/api';
import { MasterData } from './DataBarang';

describe('import barang', () => {
  it('parses a row: price rounded to integer, stock to 2 decimals, blanks optional', () => {
    expect(MasterData({ 'Nama Barang': ' Light Green ', 'Kode Barang': 'TH 039 AA', Harga: 202202.1982, Stok: 31.456 }, 2)).toEqual({
      code: 'TH 039 AA', name: 'Light Green', detail: '', price: 202202, stock: 31.46,
    });
    expect(MasterData({ 'Nama Barang': 'Mp 5 mm' }, 3)).toMatchObject({ price: 0, stock: 0 });
  });

  it('rejects a missing name and a negative or non-numeric stock', () => {
    expect(() => MasterData({ 'Nama Barang': '' }, 4)).toThrow('Baris 4: Nama Barang wajib diisi');
    expect(() => MasterData({ 'Nama Barang': 'x', Stok: -1 }, 5)).toThrow('Baris 5: Stok tidak valid');
    expect(() => MasterData({ 'Nama Barang': 'x', Harga: 'abc' }, 6)).toThrow('Baris 6: Harga tidak valid');
  });

  it('POSTs to /items/bulk and turns per-row BE errors into one message', async () => {
    const api = installFakeApi({ 'POST /api/v1/items/bulk': { dryRun: false, created: 1, skipped: [] } });
    await importItems({ defaults: { unit: 'lembar' }, items: [{ name: 'A', price: 0, stock: 1 }] });
    expect(api.calls('POST /api/v1/items/bulk')[0].body).toEqual({ defaults: { unit: 'lembar' }, items: [{ name: 'A', price: 0, stock: 1 }] });

    installFakeApi({ 'POST /api/v1/items/bulk': fail(400, 'Import validation failed', { 'items.5.category': ['Category "X" not found'] }) });
    await expect(importItems({ defaults: {}, items: [1, 2, 3, 4, 5].map((i) => ({ name: `B${i}`, price: 0, stock: 0 })) })).rejects.toThrow('Baris 5 "B5" (category): Category "X" not found');
  });
});
