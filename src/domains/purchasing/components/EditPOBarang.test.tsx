import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { installFakeApi, paged, fail, type FakeRequest } from '@/test/fake-api';
import { withUser } from '@/test/as-user';
import Page from '@/app/dashboard/purchasing/transaksi/buat-po-barang/edit-po/[id]/page';
import type { PurchaseOrder } from '../types';

vi.mock('next/navigation', () => ({ useParams: () => ({ id: '12' }) }));
const supplier = { id: 4, code: 'S4', name: 'Supplier Baru', address: 'Jl. Baru', phone: '0812', npwp: '123', bank: 'BCA', pajak: 'PKP' };
const po: PurchaseOrder = {
  id: 12, nomorPo: 'PO-012', approvalRequestId: 7, supplierId: 3, supplierName: 'Supplier Lama', tanggalPo: '2026-11-23', picSupplier: 'Andi', kebutuhanProyek: 'Proyek Lama',
  barang: [{ lineIndex: 0, kodeBarang: 'A1', namaBarang: 'Triplex', satuan: 'Lembar', jumlah: 12, hargaSatuan: 1000, diskon: 0 }],
  persenPpn: 12, jasa: 100, subtotal: 12000, dppLain: 11000, nilaiPpn: 1320, grandTotal: 13420, status: 'ISSUED', createdBy: 1, createdAt: '2026-11-23', cancelledAt: null, cancelledBy: null, cancelReason: null,
};
const permissions = ['purchase-order.view', 'purchase-order.update', 'supplier.view'];
function setup(extra: Record<string, unknown> = {}, perms = permissions) {
  const api = installFakeApi({
    'GET /api/v1/purchase-orders/12': po,
    'GET /api/v1/suppliers': paged([supplier]),
    'PUT /api/v1/purchase-orders/12': (req: FakeRequest) => ({ ...po, ...req.body as object, supplierName: supplier.name, grandTotal: 44445 }),
    ...extra,
  });
  render(withUser(<Page />, perms));
  return api;
}
const change = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } });

describe('Edit PO Barang', () => {
  it('membuka seluruh isian PO yang tersimpan dan kembali ke daftar PO Purchasing', async () => {
    setup();
    await screen.findByRole('form', { name: 'Edit PO-012' });
    expect(screen.getByLabelText('Tanggal PO')).toHaveProperty('value', '2026-11-23');
    expect(screen.getByRole('heading', { name: 'Tujuan Pemesanan (Supplier)' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Pemesan' })).toBeTruthy();
    expect(within(screen.getByRole('table', { name: 'Data supplier PO' })).getByLabelText('PIC / Telp Supplier')).toHaveProperty('value', 'Andi');
    expect(within(screen.getByRole('table', { name: 'Data pemesan PO' })).getByLabelText('Kebutuhan Proyek')).toHaveProperty('value', 'Proyek Lama');
    expect(within(screen.getByRole('table', { name: 'Daftar barang PO' })).getAllByRole('columnheader').map((el) => el.textContent)).toEqual(['Pilih', 'No.', 'Kode Barang', 'Nama Item / Barang', 'Satuan', 'Jumlah', 'Harga / Sat (Rp)', 'Diskon (Rp)', 'Total Harga (Rp)']);
    expect(screen.getByLabelText('Kebutuhan Proyek')).toHaveProperty('value', 'Proyek Lama');
    expect(screen.getByLabelText('PIC / Telp Supplier')).toHaveProperty('value', 'Andi');
    expect(screen.getByLabelText('Kode barang baris 1')).toHaveProperty('value', 'A1');
    expect(screen.getByLabelText('Nama barang baris 1')).toHaveProperty('value', 'Triplex');
    expect(screen.getByLabelText('Satuan baris 1')).toHaveProperty('value', 'Lembar');
    expect(screen.getByLabelText('Jumlah baris 1')).toHaveProperty('value', '12');
    expect(screen.getByLabelText('Harga satuan baris 1')).toHaveProperty('value', '1000');
    expect(screen.getByLabelText('Diskon baris 1')).toHaveProperty('value', '0');
    expect(screen.getByLabelText('PPN (%)')).toHaveProperty('value', '12');
    expect(screen.getByLabelText('Jasa')).toHaveProperty('value', '100');
    expect(screen.getByRole('link', { name: 'Batal' }).getAttribute('href')).toBe('/dashboard/purchasing/transaksi/buat-po-barang');
    expect(screen.getByRole('link', { name: 'Kembali ke PO Barang' }).getAttribute('href')).toBe('/dashboard/purchasing/transaksi/buat-po-barang');
  });

  it('mengirim perubahan seluruh field, termasuk supplier dan qty, lewat PUT tanpa membuat PO baru', async () => {
    const api = setup();
    await screen.findByRole('form', { name: 'Edit PO-012' });
    fireEvent.click(screen.getByLabelText('Data Supplier'));
    fireEvent.click(await screen.findByRole('option', { name: 'S4 - Supplier Baru' }));
    expect(screen.getByText('Jl. Baru / 0812')).toBeTruthy();
    change('Tanggal PO', '2026-11-24');
    change('Kebutuhan Proyek', ' Proyek Baru ');
    change('PIC / Telp Supplier', ' Budi ');
    change('Kode barang baris 1', ' B2 ');
    change('Nama barang baris 1', ' Barang Baru ');
    change('Satuan baris 1', ' Kg ');
    change('Jumlah baris 1', '20');
    change('Harga satuan baris 1', '2000');
    change('Diskon baris 1', '1000');
    change('PPN (%)', '11,5');
    change('Jasa', '300');
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    await screen.findByText('Perubahan PO PO-012 berhasil disimpan.');
    expect(api.calls('PUT /api/v1/purchase-orders/12')[0].body).toEqual({
      tanggalPo: '2026-11-24', supplierId: 4, kebutuhanProyek: 'Proyek Baru', picSupplier: 'Budi', persenPpn: 11.5, jasa: 300,
      barang: [{ lineIndex: 0, kodeBarang: 'B2', namaBarang: 'Barang Baru', satuan: 'Kg', jumlah: 20, hargaSatuan: 2000, diskon: 1000 }],
    });
    expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Lihat Detail PO' }).getAttribute('href')).toBe('/dashboard/purchasing/transaksi/buat-po-barang/detail-po/12');
  });

  it('menghitung ulang dan menyimpan hanya baris yang dipilih seperti pada form Buat PO', async () => {
    const second = { ...po.barang[0], lineIndex: 1, kodeBarang: 'B1', namaBarang: 'Paku', jumlah: 2, hargaSatuan: 2000 };
    const api = setup({ 'GET /api/v1/purchase-orders/12': { ...po, barang: [...po.barang, second] } });
    await screen.findByRole('form', { name: 'Edit PO-012' });
    expect(screen.getByLabelText('Pilih baris 1')).toHaveProperty('checked', true);
    expect(screen.getByLabelText('Pilih baris 2')).toHaveProperty('checked', true);
    expect(screen.getByLabelText('Total harga setelah diskon')).toHaveProperty('value', '16.000');
    fireEvent.click(screen.getByLabelText('Pilih baris 2'));
    expect(screen.getByLabelText('Total harga setelah diskon')).toHaveProperty('value', '12.000');
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    await screen.findByText('Perubahan PO PO-012 berhasil disimpan.');
    expect(api.calls('PUT /api/v1/purchase-orders/12')[0].body).toMatchObject({ barang: [po.barang[0]] });
  });

  it('mewajibkan minimal satu barang tetap dipilih', async () => {
    const api = setup();
    await screen.findByRole('form', { name: 'Edit PO-012' });
    fireEvent.click(screen.getByLabelText('Pilih baris 1'));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    expect(screen.getByRole('alert').textContent).toBe('Pilih minimal satu barang untuk PO ini.');
    expect(api.calls('PUT /api/v1/purchase-orders/12')).toHaveLength(0);
  });

  it('menolak jumlah nol, diskon berlebihan, dan PPN tidak valid sebelum mengirim perubahan', async () => {
    const api = setup();
    await screen.findByRole('form', { name: 'Edit PO-012' });
    change('Jumlah baris 1', '0');
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    expect(screen.getByRole('alert').textContent).toContain('Periksa jumlah');
    change('Jumlah baris 1', '12');
    change('Diskon baris 1', '999999');
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    expect(screen.getByRole('alert').textContent).toContain('Diskon tidak boleh melebihi');
    change('Diskon baris 1', '0');
    change('PPN (%)', '101');
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    expect(screen.getByRole('alert').textContent).toContain('PPN harus antara');
    expect(api.calls('PUT /api/v1/purchase-orders/12')).toHaveLength(0);
  });

  it('mempertahankan isian jika backend menolak perubahan dan mencegah submit ganda', async () => {
    const api = setup({ 'PUT /api/v1/purchase-orders/12': fail(409, 'Baris sudah masuk PO lain') });
    const form = await screen.findByRole('form', { name: 'Edit PO-012' });
    change('Jumlah baris 1', '25');
    fireEvent.submit(form);
    fireEvent.submit(form);
    await screen.findByText('Baris sudah masuk PO lain');
    expect(screen.getByLabelText('Jumlah baris 1')).toHaveProperty('value', '25');
    expect(api.calls('PUT /api/v1/purchase-orders/12')).toHaveLength(1);
  });

  it.each([{ perms: ['purchase-order.view'] }, { perms: ['purchase-order.update'] }, { perms: [] }])('menolak akses tanpa kedua permission view/update: $perms', async ({ perms }) => {
    const api = setup({}, perms);
    expect(await screen.findByText('Anda tidak memiliki izin untuk mengedit PO.')).toBeTruthy();
    expect(screen.queryByRole('form')).toBeNull();
    expect(api.calls('GET /api/v1/purchase-orders/12')).toHaveLength(0);
  });

  it('tidak membuka form untuk PO yang sudah dibatalkan', async () => {
    setup({ 'GET /api/v1/purchase-orders/12': { ...po, status: 'CANCELLED' } });
    await screen.findByText('PO yang sudah dibatalkan tidak dapat diedit.');
    expect(screen.queryByRole('form')).toBeNull();
  });

  it('menampilkan kegagalan memuat PO tanpa form kosong', async () => {
    setup({ 'GET /api/v1/purchase-orders/12': fail(404, 'PO tidak ditemukan') });
    await screen.findByText('PO tidak ditemukan');
    expect(screen.queryByRole('form')).toBeNull();
  });
});
