import { it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { downloadCsv } from '@/shared/lib/csv';
import { installFakeApi, paged, type FakeRequest } from '@/test/fake-api';
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
  expect(await screen.findByText('Supplier Terakhir')).not.toBeNull();
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
