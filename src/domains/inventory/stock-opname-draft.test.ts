import { beforeEach, describe, expect, it } from 'vitest';
import { clearOpnameDraft, opnameDraftKey, readOpnameDraft, writeOpnameDraft, type OpnameDraft } from './stock-opname-draft';

const draft: OpnameDraft = { version: 1, month: '3', year: '2026', savedAt: '2026-03-01T00:00:00Z', rows: [{ itemId: '1', itemName: 'Triplex', code: 'B-1', category: 'Bahan', unit: 'lbr', stock: 10, price: 1000, jumlah: '0', keterangan: '' }] };
beforeEach(() => localStorage.clear());

describe('Penyimpanan draft stok opname', () => {
  it('terpisah per akun dan divisi, hanya draft bersangkutan yang dihapus', () => {
    const key = opnameDraftKey('/dashboard/gudang', 1);
    const otherUser = opnameDraftKey('/dashboard/gudang', 2);
    const otherDivision = opnameDraftKey('/dashboard/gudang-barang-jadi', 1);
    writeOpnameDraft(key, draft);
    expect(readOpnameDraft(key)).toEqual(draft);
    expect(readOpnameDraft(otherUser)).toBeNull();
    expect(readOpnameDraft(otherDivision)).toBeNull();
    writeOpnameDraft(otherDivision, draft);
    clearOpnameDraft(key);
    expect(readOpnameDraft(key)).toBeNull();
    expect(readOpnameDraft(otherDivision)).toEqual(draft);
  });

  it('draft rusak tidak dihapus diam-diam', () => {
    const key = opnameDraftKey('/dashboard/gudang', 1);
    localStorage.setItem(key, '{broken');
    expect(() => readOpnameDraft(key)).toThrow();
    expect(localStorage.getItem(key)).toBe('{broken');
    localStorage.setItem(key, JSON.stringify({ ...draft, rows: [{ jumlah: 8 }] }));
    expect(() => readOpnameDraft(key)).toThrow();
  });
});
