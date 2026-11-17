import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AuthUserProvider } from '@/domains/auth/user-context';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import Gudang from '../DataBarang';
import BarangJadi from '../DataBarangBarangJadi';
import Ppic from '@/domains/ppic/components/DataBarang';
import Purchasing from '@/domains/purchasing/components/DataBarang';
import Superadmin from '@/domains/superadmin/components/DataBarang';
import StockNotificationDetail from './StockNotificationDetail';
import { renderToString } from 'react-dom/server';
import * as inventoryApi from '@/domains/inventory/api';

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

  it('keeps the popup outside the animated page and reserves space while stock loads', async () => {
    let finishLoading!: (value: Awaited<ReturnType<typeof inventoryApi.getItem>>) => void;
    vi.spyOn(inventoryApi, 'getItem').mockImplementation(() => new Promise((resolve) => { finishLoading = resolve; }));
    const { container, unmount } = render(<div className="animate-in slide-in-from-bottom-4"><StockNotificationDetail /></div>);
    const dialog = screen.getByRole('dialog');
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
    const content = within(dialog).getByRole('status').parentElement!;
    expect(content.classList.contains('min-h-52')).toBe(true);
    expect(content.getAttribute('aria-busy')).toBe('true');
    expect(within(dialog).queryByText('Triplex notifikasi')).toBeNull();

    await act(async () => { finishLoading({ ...item, createdAt: null, updatedAt: null }); });
    expect(screen.getByRole('dialog')).toBe(dialog);
    expect(content.getAttribute('aria-busy')).toBe('false');
    expect(content.classList.contains('min-h-52')).toBe(true);
    expect(within(content).getByText('Triplex notifikasi')).toBeTruthy();
    expect(within(dialog).queryByRole('status')).toBeNull();
    unmount();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('defers the portal until the client renders', () => {
    expect(renderToString(<StockNotificationDetail />)).not.toContain('role="dialog"');
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
