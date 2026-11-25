import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { installFakeApi, paged, type FakeRequest } from '@/test/fake-api';
import DataBarang from './DataBarang';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => '/barang',
  useSearchParams: () => new URLSearchParams(),
}));

const item = { id: 1, code: 'LEM013', externalCode: null, name: 'Barang 1', detail: null, supplierId: 150, supplierName: 'PT Kayu', stock: 30, unit: 'pcs', category: 'Lembaran', locationId: 150, locationCode: 'Z99', price: 1000, photo: null };

// Supplier 150 hanya ada di halaman kedua, seperti kasus yang dilaporkan.
const twoPages = (req: FakeRequest) => {
  const page = Number(req.query.get('page') ?? 1);
  const ids = page === 1 ? Array.from({ length: 100 }, (_, i) => i + 1) : Array.from({ length: 50 }, (_, i) => i + 101);
  return paged(ids.map((id) => ({ id, name: id === 150 ? 'Supplier Terakhir' : `S${id}` })), { total: 150, page, pageSize: 100 });
};

it('modal Lengkapi menampilkan supplier dari semua halaman', async () => {
  const api = installFakeApi({
    'GET /api/v1/items': paged([item]),
    'GET /api/v1/locations': paged([]),
    'GET /api/v1/suppliers': twoPages,
  });

  render(<DataBarang />);
  await screen.findByText('Barang 1');
  await waitFor(() => expect(api.calls('GET /api/v1/suppliers')).toHaveLength(2));
  expect(api.calls('GET /api/v1/suppliers')[0].query.get('pageSize')).toBe('100');

  fireEvent.click(screen.getByRole('button', { name: /lengkapi/i }));
  expect(within(screen.getByRole('combobox')).getByRole('option', { name: 'Supplier Terakhir' })).toBeTruthy();
});
