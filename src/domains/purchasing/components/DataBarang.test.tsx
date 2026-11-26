import { it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { downloadCsv } from '@/shared/lib/csv';
import { installFakeApi, paged, type FakeRequest } from '@/test/fake-api';
import { AuthUserProvider } from '@/domains/auth/user-context';
import type { AuthUser } from '@/domains/auth/types';
import DataBarang from './DataBarang';

vi.mock('@/shared/lib/csv', () => ({ downloadCsv: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => '/barang',
  useSearchParams: () => new URLSearchParams(),
}));

const item = { id: 1, code: 'LEM013', externalCode: null, name: 'Barang 1', detail: null, supplierId: 150, supplierName: 'PT Kayu', stock: 30, unit: 'pcs', category: 'Lembaran', locationId: 150, locationCode: 'Z99', price: 1000, photo: null };

// Dua halaman (100 + 50 baris) agar terlihat bahwa halaman kedua ikut diambil.
const twoPages = (make: (id: number) => object) => (req: FakeRequest) => {
  const page = Number(req.query.get('page') ?? 1);
  const ids = page === 1 ? Array.from({ length: 100 }, (_, i) => i + 1) : Array.from({ length: 50 }, (_, i) => i + 101);
  return paged(ids.map(make), { total: 150, page, pageSize: 100 });
};

it('DataBarang memuat semua halaman lokasi dan supplier', async () => {
  const api = installFakeApi({
    'GET /api/v1/items': paged([item]),
    'GET /api/v1/locations': twoPages((id) => ({ id, code: id === 150 ? 'Z99' : `L${id}`, rackName: 'A', rackNumber: '01' })),
    'GET /api/v1/suppliers': twoPages((id) => ({ id, name: id === 150 ? 'Supplier Terakhir' : `S${id}` })),
  });
  render(<DataBarang />);
  await screen.findByText('Barang 1');
  await waitFor(() => expect(api.calls('GET /api/v1/suppliers')).toHaveLength(2));
  expect(api.calls('GET /api/v1/locations').map((c) => c.query.get('page')).sort()).toEqual(['1', '2']);
  expect(api.calls('GET /api/v1/locations')[0].query.get('pageSize')).toBe('100');
  // Id 150 hanya ada di halaman kedua.
  expect(screen.queryByRole('columnheader', { name: 'Supplier' })).toBeNull();
  expect(screen.queryByText('Supplier Terakhir')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Filter/ }));
  expect(await screen.findByRole('option', { name: 'Supplier Terakhir' })).not.toBeNull();
});

it('menampilkan kolom Harga Terbaru dengan format ribuan seperti Superadmin', async () => {
  installFakeApi({
    'GET /api/v1/items': paged([item]),
    'GET /api/v1/locations': paged([]),
    'GET /api/v1/suppliers': paged([]),
  });
  render(<DataBarang />);
  const row = (await screen.findByText('Barang 1')).closest('tr');
  expect(screen.getByRole('columnheader', { name: 'Harga Terbaru' })).toBeTruthy();
  expect(within(row!).getByText('1.000')).toBeTruthy();
  expect(within(row!).queryByText(/^per /)).toBeNull();
});

it('menampilkan tanggal harga dan tidak lagi punya tombol Lengkapi', async () => {
  installFakeApi({
    'GET /api/v1/items': paged([{ ...item, priceUpdatedAt: '2026-11-23' }]),
    'GET /api/v1/locations': paged([]),
    'GET /api/v1/suppliers': paged([]),
  });
  render(<DataBarang />);
  const row = (await screen.findByText('Barang 1')).closest('tr');
  expect(within(row!).getByText('per 23-11-2026')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Lengkapi' })).toBeNull();
});

it('Export CSV mengambil semua halaman barang, bukan hanya halaman yang tampil', async () => {
  const api = installFakeApi({
    'GET /api/v1/items': twoPages((id) => ({ ...item, id, name: `Barang ${id}` })),
    'GET /api/v1/locations': paged([]),
    'GET /api/v1/suppliers': paged([]),
  });
  render(<DataBarang />);
  await screen.findByText('Barang 1');
  fireEvent.click(screen.getByRole('button', { name: /export/i }));
  await waitFor(() => expect(downloadCsv).toHaveBeenCalled());
  const [name, rows] = vi.mocked(downloadCsv).mock.calls[0];
  expect(name).toBe('Data_Barang_Purchasing.csv');
  expect(rows).toHaveLength(151);
  expect(api.calls('GET /api/v1/items').filter((c) => c.query.get('pageSize') === '100')).toHaveLength(2);
});

const userWith = (permissions: string[]): AuthUser => ({ id: 1, username: 'u', email: 'u@x.id', roleId: 2, roleName: 'Staff', isSuperadmin: false, permissions });

const supplierRoutes = {
  'GET /api/v1/locations': paged([]),
  'GET /api/v1/suppliers': paged([{ id: 7, name: 'PT Kayu' }, { id: 8, name: 'CV Baja' }]),
};

it('menautkan aksi detail ke halaman supplier material khusus Purchasing', async () => {
  installFakeApi({ ...supplierRoutes, 'GET /api/v1/items': paged([item, { ...item, id: 2, name: 'Barang 2' }]) });
  render(<AuthUserProvider user={userWith(['item.view'])}><DataBarang /></AuthUserProvider>);
  await screen.findByText('Barang 1');
  expect(screen.getByRole('columnheader', { name: 'Aksi' })).not.toBeNull();
  expect(screen.queryByRole('columnheader', { name: 'Supplier' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Detail supplier Barang 1' }).getAttribute('href')).toBe('/dashboard/purchasing/master/data-barang/1');
  expect(screen.getByRole('link', { name: 'Detail supplier Barang 2' }).getAttribute('href')).toBe('/dashboard/purchasing/master/data-barang/2');
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('menyembunyikan aksi detail tanpa permission item.view', async () => {
  installFakeApi({ ...supplierRoutes, 'GET /api/v1/items': paged([item]) });
  render(<AuthUserProvider user={userWith(['item.update', 'item.set-supplier'])}><DataBarang /></AuthUserProvider>);
  await screen.findByText('Barang 1');
  expect(screen.queryByRole('columnheader', { name: 'Aksi' })).toBeNull();
  expect(screen.queryByRole('link', { name: /Detail supplier/ })).toBeNull();
});

it('memetakan supplier untuk barang yang dicentang', async () => {
  const first = { ...item, id: 1, name: 'Barang 1', supplierId: null, supplierName: null };
  const second = { ...item, id: 2, name: 'Barang 2', supplierId: 8, supplierName: 'CV Baja' };
  const api = installFakeApi({
    ...supplierRoutes,
    'GET /api/v1/items': paged([first, second]),
    'PUT /api/v1/items/1/suppliers': { ...first, supplierId: 7, supplierName: 'PT Kayu' },
    'PUT /api/v1/items/2/suppliers': { ...second, supplierId: 7, supplierName: 'PT Kayu' },
  });
  render(<DataBarang />);
  await screen.findByText('Barang 1');

  fireEvent.click(screen.getByRole('checkbox', { name: 'Pilih Barang 1' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Pilih Barang 2' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit Supplier (2)' }));
  expect(screen.getByText('1 barang sudah punya supplier. Daftar suppliernya akan diganti sesuai pilihan.')).not.toBeNull();

  const dialog = within(screen.getByRole('dialog'));
  fireEvent.click(dialog.getByRole('button', { name: 'Supplier' }));
  fireEvent.click(dialog.getByRole('option', { name: 'PT Kayu' }));
  fireEvent.click(dialog.getByRole('button', { name: 'Supplier' }));
  fireEvent.click(dialog.getByRole('option', { name: 'CV Baja' }));
  fireEvent.click(dialog.getByRole('button', { name: 'Tinjau 2 Barang' }));
  expect(dialog.getByText('Barang 1')).not.toBeNull();
  expect(dialog.getByText('CV Baja')).not.toBeNull();
  fireEvent.click(dialog.getByRole('button', { name: 'Simpan 2 Barang' }));

  await waitFor(() => expect(api.calls('PUT /api/v1/items/2/suppliers')).toHaveLength(1));
  expect(api.calls('PUT /api/v1/items/1/suppliers')[0].body).toEqual({ supplierIds: [7, 8] });
  expect(api.calls('PUT /api/v1/items/2/suppliers')[0].body).toEqual({ supplierIds: [7, 8] });
  expect(await screen.findByText('2 barang dipetakan ke PT Kayu, CV Baja.')).not.toBeNull();
});

it('menyembunyikan checklist tanpa item.set-supplier', async () => {
  installFakeApi({ ...supplierRoutes, 'GET /api/v1/items': paged([item]) });
  render(<AuthUserProvider user={userWith(['item.update'])}><DataBarang /></AuthUserProvider>);
  await screen.findByText('Barang 1');
  expect(screen.queryByRole('checkbox', { name: 'Pilih Barang 1' })).toBeNull();
  expect(screen.queryByRole('button', { name: /Edit Supplier/ })).toBeNull();
});

it('menampilkan checklist dengan item.update dan item.set-supplier', async () => {
  installFakeApi({ ...supplierRoutes, 'GET /api/v1/items': paged([item]) });
  render(<AuthUserProvider user={userWith(['item.update', 'item.set-supplier'])}><DataBarang /></AuthUserProvider>);
  await screen.findByText('Barang 1');
  expect(screen.getByRole('checkbox', { name: 'Pilih Barang 1' })).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Edit Supplier (0)' })).not.toBeNull();
});

it('Filter stok kosong dikirim ke API daftar barang', async () => {
  const api = installFakeApi({
    'GET /api/v1/items': paged([item]),
    'GET /api/v1/locations': paged([]),
    'GET /api/v1/suppliers': paged([]),
  });
  render(<DataBarang />);
  await screen.findByText('Barang 1');
  fireEvent.click(screen.getByRole('button', { name: /filter/i }));
  fireEvent.click(screen.getByLabelText(/Stok kosong/));
  await waitFor(() => expect(api.calls('GET /api/v1/items').at(-1)?.query.get('stock')).toBe('empty'));
});
