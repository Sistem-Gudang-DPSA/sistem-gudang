import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import { vi as viTimeout } from 'vitest';
viTimeout.setConfig({ testTimeout: 30000 });
import BuatSpkInternal from './BuatSpkInternal';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }) }));

const items = [
  { id: 11, code: 'SKU-A', name: 'Meja Kayu', category: 'x', unit: 'pcs', price: 1, stock: 1, locationId: null, supplierId: 1, locationCode: null, supplierName: 's' },
  { id: 12, code: 'SKU-B', name: 'Kursi', category: 'x', unit: 'pcs', price: 1, stock: 1, locationId: null, supplierId: 1, locationCode: null, supplierName: 's' },
];
const input = (l: string) => screen.getByLabelText(l) as HTMLInputElement;
const type = (l: string, v: string) => fireEvent.change(screen.getByLabelText(l), { target: { value: v } });
const pick = (l: string, v: string) => fireEvent.change(screen.getByLabelText(l), { target: { value: v } });

async function renderForm(extra: Record<string, unknown> = {}) {
  const api = installFakeApi({
    'GET /api/v1/tracking/spk': [{ noSpk: 'SPK-001', client: 'PT Maju' }],
    'GET /api/v1/tracking/pic': [{ id: 1, nama: 'Budi' }, { id: 2, nama: 'Sari' }],
    'GET /api/v1/items': paged(items),
    'POST /api/v1/spk-internal': { id: 5, noSpk: 'SPKI-5' },
    ...extra,
  });
  render(<BuatSpkInternal />);
  await screen.findByText('Sari');
  await screen.findByText('SPK-001');
  return api;
}
const fillHeader = (terbit = '2026-05-01', target = '2026-05-31') => {
  pick('Penanggung Jawab', 'Sari');
  type('Tanggal Terbit', terbit);
  type('Target Selesai', target);
  pick('Tujuan Produksi', 'STOCK');
  pick('SPK Klien Induk', 'SPK-001');
};
const fillRow = (n: number, sku: string, total: string, klien: string, bebas: string) => {
  type(`Kode SKU baris ${n}`, sku);
  type(`Total qty diproduksi baris ${n}`, total);
  type(`Alokasi SPK klien baris ${n}`, klien);
  type(`Alokasi stok bebas baris ${n}`, bebas);
};
const save = () => fireEvent.click(screen.getByText('Simpan'));

beforeEach(() => replace.mockClear());

describe('BuatSpkInternal', () => {
  it('loads PIC, SPK and the only production purpose STOCK', async () => {
    await renderForm();
    expect(screen.getByText('Budi')).toBeTruthy();
    expect(screen.getByText('STOCK')).toBeTruthy();
  });

  it('picking a known SKU fills the item name', async () => {
    await renderForm();
    type('Kode SKU baris 1', 'SKU-B');
    expect(input('Nama barang dan spesifikasi baris 1').value).toBe('Kursi');
  });

  it('posts integer lines, STOCK, PIC from tracking, catatan trimmed; then redirects', async () => {
    const api = await renderForm();
    fillHeader();
    fillRow(1, 'SKU-A', '10', '4', '6');
    fillRow(3, 'SKU-B', '5', '0', '5');
    type('Catatan :', '  hati-hati ');
    save();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard/ppic/transaksi/spk-mutasi-internal'));
    expect(api.calls('POST /api/v1/spk-internal')[0].body).toEqual({
      tanggalTerbit: '2026-05-01', tujuanProduksi: 'STOCK', spkKlienInduk: 'SPK-001', penanggungJawab: 'Sari',
      targetSelesai: '2026-05-31', catatan: 'hati-hati',
      lines: [
        { itemId: 11, totalQty: 10, alokasiSpkKlien: 4, alokasiStokBebas: 6 },
        { itemId: 12, totalQty: 5, alokasiSpkKlien: 0, alokasiStokBebas: 5 },
      ],
    });
  });

  it('omits catatan when blank', async () => {
    const api = await renderForm();
    fillHeader();
    fillRow(1, 'SKU-A', '3', '1', '2');
    save();
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect('catatan' in (api.calls('POST /api/v1/spk-internal')[0].body as object)).toBe(false);
  });

  it('requires all header fields', async () => {
    const api = await renderForm();
    fillRow(1, 'SKU-A', '3', '1', '2');
    save();
    expect(await screen.findByText(/wajib diisi\./)).toBeTruthy();
    expect(api.calls('POST /api/v1/spk-internal')).toHaveLength(0);
  });

  it('rejects target selesai before tanggal terbit', async () => {
    const api = await renderForm();
    fillHeader('2026-05-10', '2026-05-01');
    fillRow(1, 'SKU-A', '3', '1', '2');
    save();
    expect(await screen.findByText('Target Selesai tidak boleh sebelum Tanggal Terbit.')).toBeTruthy();
    expect(api.calls('POST /api/v1/spk-internal')).toHaveLength(0);
  });

  it('requires at least one item row', async () => {
    const api = await renderForm();
    fillHeader();
    save();
    expect(await screen.findByText('Isi minimal satu barang.')).toBeTruthy();
    expect(api.calls('POST /api/v1/spk-internal')).toHaveLength(0);
  });

  it('rejects an unknown SKU', async () => {
    await renderForm();
    fillHeader();
    fillRow(1, 'NOPE', '3', '1', '2');
    save();
    expect(await screen.findByText('Kode SKU "NOPE" tidak ditemukan di daftar barang.')).toBeTruthy();
  });

  it('rejects zero total qty and a sum mismatch from blank quantities', async () => {
    const api = await renderForm();
    fillHeader();
    fillRow(1, 'SKU-A', '0', '0', '0');
    save();
    expect(await screen.findByText(/wajib angka bulat/)).toBeTruthy();
    type('Total qty diproduksi baris 1', '3');
    // a blank alokasi counts as 0, so it only fails the sum rule
    type('Alokasi SPK klien baris 1', '');
    save();
    expect(await screen.findByText(/harus sama dengan Total Qty/)).toBeTruthy();
    expect(api.calls('POST /api/v1/spk-internal')).toHaveLength(0);
  });

  it('requires klien + bebas = total', async () => {
    const api = await renderForm();
    fillHeader();
    fillRow(1, 'SKU-A', '10', '4', '5');
    save();
    expect(await screen.findByText('Alokasi SPK Klien + Alokasi Stok Bebas harus sama dengan Total Qty (SKU-A).')).toBeTruthy();
    expect(api.calls('POST /api/v1/spk-internal')).toHaveLength(0);
  });

  it('shows backend error and does not redirect', async () => {
    await renderForm({ 'POST /api/v1/spk-internal': fail(400, 'Stok tidak cukup') });
    fillHeader();
    fillRow(1, 'SKU-A', '3', '1', '2');
    save();
    expect(await screen.findByText('Stok tidak cukup')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('integer inputs keep digits only and are capped at 9', async () => {
    await renderForm();
    for (const l of ['Total qty diproduksi baris 1', 'Alokasi SPK klien baris 1', 'Alokasi stok bebas baris 1']) {
      for (const bad of ['1e5', '-3', '2.5']) {
        type(l, bad);
        expect(input(l).value).toBe(bad.replace(/\D/g, ''));
      }
      expect(input(l).maxLength).toBe(9);
    }
  });

  it('catatan is limited to 500 chars', async () => {
    await renderForm();
    expect(input('Catatan :').maxLength).toBe(500);
  });

  it('add / remove rows', async () => {
    await renderForm();
    fireEvent.click(screen.getByText('Tambah Baris'));
    expect(screen.getByLabelText('Kode SKU baris 5')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Hapus baris 1'));
    expect(screen.queryByLabelText('Kode SKU baris 5')).toBeNull();
    for (let i = 4; i >= 1; i--) fireEvent.click(screen.getByLabelText(`Hapus baris ${i}`));
    expect(screen.getByText(/Belum ada barang/)).toBeTruthy();
  });

  it('has no Simpan Draft button (API has no draft status)', async () => {
    await renderForm();
    expect(screen.queryByText('Simpan Draft')).toBeNull();
    expect(screen.getByText('Simpan')).toBeTruthy();
  });
});
