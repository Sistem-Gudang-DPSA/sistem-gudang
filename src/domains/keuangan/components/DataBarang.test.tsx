import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, paged, type FakeRequest } from '@/test/fake-api';
import DataBarang from './DataBarang';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => '/keuangan/barang',
}));

const item = (id: number, over = {}) => ({ id, code: `BRG-${id}`, externalCode: null, name: `Barang ${id}`, supplierId: 7, stock: 30, unit: 'pcs', category: 'Lembaran', locationId: 1, price: 1000, ...over });

describe('Keuangan DataBarang export', () => {
  it('exports every filtered row across pages as an escaped CSV', async () => {
    const csv = await import('@/shared/lib/csv');
    const spy = vi.spyOn(csv, 'downloadCsv').mockImplementation(() => {});
    const all = Array.from({ length: 25 }, (_, i) => item(i + 1));
    const api = installFakeApi({
      'GET /api/v1/items': (req: { query: URLSearchParams }) => {
        const pageSize = Number(req.query.get('pageSize'));
        const page = Number(req.query.get('page'));
        return { rows: all.slice((page - 1) * pageSize, page * pageSize), total: 25, page, pageSize };
      },
      'GET /api/v1/locations': paged([{ id: 1, code: 'A01', rackName: 'A', rackNumber: '01' }]),
      'GET /api/v1/suppliers': paged([{ id: 7, name: '=Meja, "besar"' }]),
    });
    render(<DataBarang />);
    await screen.findByText('Barang 1');
    await waitFor(() => expect(api.calls('GET /api/v1/locations').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByTitle('Export Excel'));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const [name, rows] = spy.mock.calls[0];
    expect(name).toBe('Data_Barang_Keuangan.csv');
    expect(rows).toHaveLength(26);
    expect(csv.toCsv(rows)).toContain("\"'=Meja, \"\"besar\"\"\"");
    spy.mockRestore();
  });
});

const itemRow = { id: 1, code: 'LEM013', externalCode: null, name: 'Barang 1', detail: null, supplierId: 150, supplierName: 'PT Kayu', stock: 30, unit: 'pcs', category: 'Lembaran', locationId: 150, locationCode: 'Z99', price: 1000, photo: null };

// Dua halaman (100 + 50 baris) agar terlihat bahwa halaman kedua ikut diambil.
const twoPages = (make: (id: number) => object) => (req: FakeRequest) => {
  const page = Number(req.query.get('page') ?? 1);
  const ids = page === 1 ? Array.from({ length: 100 }, (_, i) => i + 1) : Array.from({ length: 50 }, (_, i) => i + 101);
  return paged(ids.map(make), { total: 150, page, pageSize: 100 });
};

it('DataBarang memuat semua halaman lokasi dan supplier', async () => {
  const api = installFakeApi({
    'GET /api/v1/items': paged([itemRow]),
    'GET /api/v1/items/categories': [],
    'GET /api/v1/items/units': [],
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

it('menampilkan kolom Harga Terbaru untuk Keuangan', async () => {
  installFakeApi({
    'GET /api/v1/items': paged([itemRow]),
    'GET /api/v1/items/categories': [],
    'GET /api/v1/items/units': [],
    'GET /api/v1/locations': paged([{ id: 150, code: 'Z99', rackName: 'A', rackNumber: '01' }]),
    'GET /api/v1/suppliers': paged([{ id: 150, name: 'PT Kayu' }]),
  });
  render(<DataBarang />);
  expect(await screen.findByRole('columnheader', { name: 'Harga Terbaru' })).not.toBeNull();
  expect(screen.getByText('1.000')).not.toBeNull();
});
