import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { installFakeApi, fail } from '@/test/fake-api';
import { withUser } from '@/test/as-user';
import PurchasingPage from '@/app/dashboard/purchasing/master/data-supplier/[id]/detail/page';
import SuperadminPage from '@/app/dashboard/superadmin/master/data-supplier/[id]/detail/page';

const nav = vi.hoisted(() => ({ from: 'purchasing' }));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: '7' }), useSearchParams: () => new URLSearchParams({ from: nav.from }) }));

const data = {
  supplierId: 7, supplierName: 'PT Contoh', pajak: 'PKP', tahun: new Date().getFullYear(),
  rows: [
    { itemId: 1, kode: 'TRP-1', nama: 'Triplex', satuan: 'Lembar', kategori: 'Lembaran', harga: Array(12).fill(15000), rataRata: 15000 },
    { itemId: 2, kode: 'PKU-2', nama: 'Paku', satuan: 'Kg', kategori: 'Besi', harga: Array(12).fill(null), rataRata: null },
  ],
};

for (const [division, Page] of [['purchasing', PurchasingPage], ['superadmin', SuperadminPage]] as const) {
  describe(`Detail barang supplier ${division}`, () => {
    it.each([true, false])('hanya menampilkan identitas barang tanpa harga bulanan atau rata-rata, izin update=%s', async (canUpdate) => {
      nav.from = division;
      const api = installFakeApi({ 'GET /api/v1/suppliers/7/prices': data });
      render(withUser(<Page />, ['supplier.view', ...(canUpdate ? ['supplier.update'] : [])]));
      await screen.findByText('Triplex');
      expect(screen.getAllByRole('columnheader').map((el) => el.textContent)).toEqual(['No', 'Kode Barang', 'Nama Barang', 'Pajak Vendor', 'Satuan', 'Kategori']);
      expect(screen.queryByText(/Rata-rata/)).toBeNull();
      expect(screen.queryByText('Harga (Belum Termasuk PPN)')).toBeNull();
      expect(screen.queryByText('Januari')).toBeNull();
      expect(screen.queryByText('15.000')).toBeNull();
      expect(screen.queryByLabelText('Tahun')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Simpan Perubahan' })).toBeNull();
      expect(screen.getByRole('link', { name: 'Kembali ke Data Supplier' }).getAttribute('href')).toBe(`/dashboard/${division}/master/data-supplier`);
      expect(screen.getByRole('link', { name: 'Kembali' }).getAttribute('href')).toBe(`/dashboard/${division}/master/data-supplier`);
      expect(api.calls('GET /api/v1/suppliers/7/prices')).toHaveLength(1);
      expect(api.all().every((req) => req.method === 'GET')).toBe(true);
    });

    it('tetap mencari berdasarkan kode dan nama barang', async () => {
      nav.from = division;
      installFakeApi({ 'GET /api/v1/suppliers/7/prices': data });
      render(withUser(<Page />, ['supplier.view']));
      await screen.findByText('Triplex');
      const search = screen.getByPlaceholderText('Cari kode atau nama barang...');
      fireEvent.change(search, { target: { value: 'pku-2' } });
      expect(screen.getByText('Paku')).toBeTruthy();
      expect(screen.queryByText('Triplex')).toBeNull();
      fireEvent.change(search, { target: { value: 'triplex' } });
      expect(screen.getByText('Triplex')).toBeTruthy();
      expect(screen.queryByText('Paku')).toBeNull();
      expect(screen.getByText('1 barang')).toBeTruthy();
    });
  });
}

it('menampilkan pesan gagal memuat daftar barang supplier', async () => {
  installFakeApi({ 'GET /api/v1/suppliers/7/prices': fail(500, 'Barang supplier gagal dimuat') });
  render(withUser(<PurchasingPage />, ['supplier.view']));
  await screen.findByText('Barang supplier gagal dimuat');
  expect(screen.queryByText('Belum ada barang untuk supplier ini.')).toBeNull();
});

it('menampilkan tabel kosong dengan jumlah kolom yang sesuai', async () => {
  installFakeApi({ 'GET /api/v1/suppliers/7/prices': { ...data, rows: [] } });
  render(withUser(<PurchasingPage />, ['supplier.view']));
  const message = await screen.findByText('Belum ada barang untuk supplier ini.');
  expect(message.getAttribute('colspan')).toBe('6');
});
