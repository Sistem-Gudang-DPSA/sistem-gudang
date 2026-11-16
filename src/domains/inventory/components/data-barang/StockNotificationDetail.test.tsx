import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AuthUserProvider } from '@/domains/auth/user-context';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import Gudang from '../DataBarang';
import BarangJadi from '../DataBarangBarangJadi';
import Ppic from '@/domains/ppic/components/DataBarang';
import Purchasing from '@/domains/purchasing/components/DataBarang';
import Superadmin from '@/domains/superadmin/components/DataBarang';
import StockNotificationDetail from './StockNotificationDetail';

const router = { replace: vi.fn(), push: vi.fn() };
let pathname: string;
let params: URLSearchParams;
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => pathname,
  useSearchParams: () => params,
}));
const item = { id: 99, code: 'BRG-99', name: 'Triplex notifikasi', stock: 2.5, minimumStock: 10, unit: 'lembar', supplierId: null, locationId: null, category: 'Material', price: 0 };
const user = { id: 1, username: 'staff', email: '', roleId: 1, roleName: 'Staff', isSuperadmin: false, permissions: ['item.view'] };
function setup(detail: unknown = item) {
  return installFakeApi({
    'GET /api/v1/items/99': detail,
    'GET /api/v1/items': paged([]),
    'GET /api/v1/locations': paged([]),
    'GET /api/v1/suppliers': paged([]),
    'GET /api/v1/items/categories': [],
    'GET /api/v1/items/units': [],
  });
}
beforeEach(() => {
  pathname = '/dashboard/gudang/master/data-barang';
  params = new URLSearchParams('itemId=99');
  router.replace.mockClear();
});

describe('Stock notification detail', () => {
  it.each([
    ['gudang', Gudang], ['gudang-barang-jadi', BarangJadi], ['ppic', Ppic],
    ['purchasing', Purchasing], ['superadmin', Superadmin],
  ] as const)('opens the exact item in %s even when it is absent from the list', async (division, Screen) => {
    pathname = `/dashboard/${division}/master/data-barang`;
    const api = setup();
    render(<AuthUserProvider user={user}><Screen /></AuthUserProvider>);
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Triplex notifikasi')).toBeTruthy();
    expect(within(dialog).getByText('2.5 lembar')).toBeTruthy();
    expect(within(dialog).getByText('10 lembar')).toBeTruthy();
    expect(api.calls('GET /api/v1/items/99')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Atur stok minimum/ })).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tutup' }));
    expect(router.replace).toHaveBeenCalledWith(pathname, { scroll: false });
  });

  it('shows the error when the item has been deleted', async () => {
    setup(fail(404, 'Barang tidak ditemukan'));
    render(<StockNotificationDetail />);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Barang tidak ditemukan');
  });

  it('loads a different item when another notification is opened on the same page', async () => {
    const api = setup();
    const { rerender } = render(<StockNotificationDetail />);
    await screen.findByText('Triplex notifikasi');
    params = new URLSearchParams('itemId=100');
    rerender(<StockNotificationDetail />);
    await waitFor(() => expect(api.calls('GET /api/v1/items/100')).toHaveLength(1));
    expect(screen.queryByText('Triplex notifikasi')).toBeNull();
  });

  it.each(['', 'itemId=0', 'itemId=-1', 'itemId=abc', 'itemId=1.5'])('ignores invalid or missing item IDs: %s', (query) => {
    params = new URLSearchParams(query);
    const api = setup();
    render(<StockNotificationDetail />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api.calls('GET /api/v1/items/99')).toHaveLength(0);
  });

  it('does not load item details without item.view', () => {
    const api = setup();
    render(<AuthUserProvider user={{ ...user, permissions: [] }}><StockNotificationDetail /></AuthUserProvider>);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api.calls('GET /api/v1/items/99')).toHaveLength(0);
  });

  it('preserves other query parameters when closed', async () => {
    params = new URLSearchParams('itemId=99&from=gudang');
    setup();
    render(<StockNotificationDetail />);
    await screen.findByText('Triplex notifikasi');
    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    expect(router.replace).toHaveBeenCalledWith(`${pathname}?from=gudang`, { scroll: false });
  });
});
