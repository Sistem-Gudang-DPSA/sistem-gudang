import { beforeEach, describe, expect, it } from 'vitest';
import { clearOpnameDraft, listOpnameDrafts, opnameDraftKey, readOpnameDraft, writeOpnameDraft, type OpnameDraft } from './stock-opname-draft';

const draft: OpnameDraft = { version: 1, month: '3', year: '2026', savedAt: '2026-03-01T00:00:00Z', rows: [{ itemId: '1', itemName: 'Triplex', code: 'B-1', category: 'Bahan', unit: 'lbr', stock: 10, price: 1000, jumlah: '0', keterangan: '' }] };
beforeEach(() => localStorage.clear());

describe('Penyimpanan draft stok opname', () => {
  it('terpisah per akun dan divisi, hanya draft bersangkutan yang dihapus', () => {
    const key = opnameDraftKey('/dashboard/gudang', 1);
    const otherUser = opnameDraftKey('/dashboard/gudang', 2);
    const otherDivision = opnameDraftKey('/dashboard/gudang-barang-jadi', 1);
    writeOpnameDraft(key, 'first', draft);
    expect(readOpnameDraft(key, 'first')).toEqual(draft);
    expect(readOpnameDraft(otherUser, 'first')).toBeNull();
    expect(readOpnameDraft(otherDivision, 'first')).toBeNull();
    writeOpnameDraft(otherDivision, 'first', draft);
    clearOpnameDraft(key, 'first');
    expect(readOpnameDraft(key, 'first')).toBeNull();
    expect(readOpnameDraft(otherDivision, 'first')).toEqual(draft);
  });

  it('draft rusak tidak dihapus diam-diam', () => {
    const key = opnameDraftKey('/dashboard/gudang', 1);
    localStorage.setItem(key, '{broken');
    expect(() => readOpnameDraft(key, 'legacy')).toThrow();
    expect(localStorage.getItem(key)).toBe('{broken');
    localStorage.setItem(key, JSON.stringify({ ...draft, rows: [{ jumlah: 8 }] }));
    expect(() => readOpnameDraft(key, 'legacy')).toThrow();
  });
});


describe('Daftar draft stok opname', () => {
  it('menyimpan dua draft dalam periode sama, memperbarui hanya draft terpilih, dan mengurutkan terbaru dahulu', () => {
    const key = opnameDraftKey('/dashboard/gudang', 1);
    writeOpnameDraft(key, 'first', draft);
    const second = { ...draft, savedAt: '2026-03-02T00:00:00Z' };
    writeOpnameDraft(key, 'second', second);
    expect(listOpnameDrafts(key).drafts.map((row) => row.id)).toEqual(['second', 'first']);
    const updated = { ...draft, savedAt: '2026-03-03T00:00:00Z', rows: [{ ...draft.rows[0], jumlah: '8' }] };
    writeOpnameDraft(key, 'first', updated);
    expect(readOpnameDraft(key, 'second')).toEqual(second);
    expect(listOpnameDrafts(key).drafts.map((row) => row.id)).toEqual(['first', 'second']);
    clearOpnameDraft(key, 'first');
    expect(readOpnameDraft(key, 'first')).toBeNull();
    expect(readOpnameDraft(key, 'second')).toEqual(second);
  });

  it('mempertahankan draft format lama saat membuat draft baru', () => {
    const key = opnameDraftKey('/dashboard/gudang', 1);
    localStorage.setItem(key, JSON.stringify(draft));
    writeOpnameDraft(key, 'new', draft);
    expect(listOpnameDrafts(key).drafts.map((row) => row.id)).toEqual(['legacy', 'new']);
    expect(readOpnameDraft(key, 'legacy')).toEqual(draft);
    expect(localStorage.getItem(key)).toBe(JSON.stringify(draft));
    clearOpnameDraft(key, 'legacy');
    expect(readOpnameDraft(key, 'new')).toEqual(draft);
  });

  it('tetap menampilkan draft valid ketika draft lain rusak tanpa menghapus data rusak', () => {
    const key = opnameDraftKey('/dashboard/gudang', 1);
    localStorage.setItem(key, '{broken');
    writeOpnameDraft(key, 'new', draft);
    const result = listOpnameDrafts(key);
    expect(result.drafts.map((row) => row.id)).toEqual(['new']);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Draft lama tidak dapat dibaca');
    expect(localStorage.getItem(key)).toBe('{broken');
  });
});
