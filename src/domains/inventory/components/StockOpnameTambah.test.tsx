import { AuthUserProvider } from '@/domains/auth/user-context';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import StockOpnameTambah from './StockOpnameTambah';

const push = vi.fn();
const back = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), back }),
  useParams: () => ({}),
  usePathname: () => '/gudang/stock-opname/tambah',
}));

const qr = vi.hoisted(() => ({
  cb: null as null | ((r: { data: string }) => void),
  start: vi.fn(async () => {}),
  stop: vi.fn(),
  destroy: vi.fn(),
}));
vi.mock('qr-scanner', () => ({
  default: class {
    constructor(_video: unknown, cb: (r: { data: string }) => void) { qr.cb = cb; }
    start = qr.start;
    stop = qr.stop;
    destroy = qr.destroy;
  },
}));

const items = paged([
  { id: 1, code: 'BRG-1', name: 'Triplex', unit: 'lbr', category: 'Bahan Baku', stock: 10, price: 1000 },
  { id: 2, code: 'BRG-2', name: 'Paku', unit: 'kg', category: 'Bahan Baku', stock: 5, price: 200 },
]);

const setSecure = (value: boolean) => Object.defineProperty(window, 'isSecureContext', { value, configurable: true });

beforeEach(() => {
  push.mockClear(); back.mockClear();
  setSecure(true); qr.cb = null; qr.start.mockClear(); qr.stop.mockClear(); qr.destroy.mockClear();
});

async function setup(extra: Record<string, unknown> = {}, confirm = true) {
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(confirm);
  const api = installFakeApi({ 'GET /api/v1/items': items, ...extra });
  render(<StockOpnameTambah />);
  await screen.findByText('Triplex');
  return { api, confirmSpy };
}
const qtys = () => screen.getAllByPlaceholderText('0') as HTMLInputElement[];
const notes = () => screen.getAllByPlaceholderText('Tambahkan catatan...') as HTMLInputElement[];

describe('StockOpnameTambah', () => {
  it('lists every item as a row, requests page 1 / pageSize 25, back button goes back', async () => {
    const { api } = await setup();
    expect(qtys().length).toBe(2);
    const q = api.calls('GET /api/v1/items')[0].query;
    expect(q.get('page')).toBe('1');
    expect(q.get('pageSize')).toBe('25');
    fireEvent.click(document.querySelector('.flex.items-center.gap-3 button')!);
    expect(back).toHaveBeenCalled();
  });

  it('shows item info and derived difference after typing a physical qty', async () => {
    await setup();
    expect((screen.getAllByPlaceholderText('Unit')[0] as HTMLInputElement).value).toBe('lbr');
    expect((screen.getAllByPlaceholderText('Kategori')[0] as HTMLInputElement).value).toBe('Bahan Baku');
    fireEvent.change(qtys()[0], { target: { value: '8' } });
    expect(screen.getByText('-2')).not.toBeNull();
  });

  it('refuses an empty form and does not ask for confirmation', async () => {
    const { api, confirmSpy } = await setup();
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Isi jumlah fisik minimal satu barang.')).not.toBeNull();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(api.calls('POST /api/v1/stock-opname').length).toBe(0);
  });

  it('input restrictions: digits only, maxLength 9 and 255', async () => {
    await setup();
    fireEvent.change(qtys()[0], { target: { value: '-1e2.5' } });
    expect(qtys()[0].value).toBe('125');
    expect(qtys()[0].maxLength).toBe(9);
    expect(notes()[0].maxLength).toBe(255);
  });

  it('does not post when confirm is cancelled', async () => {
    const { api, confirmSpy } = await setup({}, false);
    fireEvent.change(qtys()[0], { target: { value: '8' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('1 barang'));
    expect(confirmSpy.mock.calls[0][0]).toContain('1 berbeda');
    expect(api.calls('POST /api/v1/stock-opname').length).toBe(0);
  });

  it('posts only counted rows (empty rows are not zeroed), note omitted when empty, then redirects', async () => {
    const { api } = await setup({ 'POST /api/v1/stock-opname': { id: 1 } });
    const now = new Date();
    fireEvent.change(qtys()[0], { target: { value: '10' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/stock-opname').length).toBe(1));
    expect(api.calls('POST /api/v1/stock-opname')[0].body).toEqual({
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      lines: [{ itemId: 1, physicalQty: 10 }],
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/gudang/transaksi/stock-opname'));
  });

  it('sends a zero count and a note when filled in', async () => {
    const { api } = await setup({ 'POST /api/v1/stock-opname': { id: 1 } });
    fireEvent.change(qtys()[1], { target: { value: '0' } });
    fireEvent.change(notes()[1], { target: { value: 'hilang' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/stock-opname').length).toBe(1));
    expect((api.calls('POST /api/v1/stock-opname')[0].body as { lines: unknown }).lines).toEqual([{ itemId: 2, physicalQty: 0, note: 'hilang' }]);
  });

  it('uses chosen month/year', async () => {
    const { api } = await setup({ 'POST /api/v1/stock-opname': { id: 1 } });
    const [month, year] = Array.from(document.querySelectorAll('select'));
    fireEvent.change(month, { target: { value: '2' } });
    fireEvent.change(year, { target: { value: String(new Date().getFullYear() - 1) } });
    fireEvent.change(qtys()[0], { target: { value: '1' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/stock-opname').length).toBe(1));
    const b = api.calls('POST /api/v1/stock-opname')[0].body as { month: number; year: number };
    expect(b.month).toBe(2);
    expect(b.year).toBe(new Date().getFullYear() - 1);
  });

  it('shows backend error, stays on page, disables button while saving', async () => {
    const { api } = await setup({ 'POST /api/v1/stock-opname': fail(409, 'Periode sudah ada') });
    fireEvent.change(qtys()[0], { target: { value: '10' } });
    fireEvent.click(screen.getByText('Simpan'));
    const btn = screen.getByText('Menyimpan...') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(await screen.findByText('Periode sudah ada')).not.toBeNull();
    expect(push).not.toHaveBeenCalled();
    expect((screen.getByText('Simpan') as HTMLButtonElement).disabled).toBe(false);
    expect(api.calls('POST /api/v1/stock-opname').length).toBe(1);
  });

  it('shows error when items fail to load', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    installFakeApi({ 'GET /api/v1/items': fail(500, 'Item error') });
    render(<StockOpnameTambah />);
    expect(await screen.findByText('Item error')).not.toBeNull();
  });
});

describe('permissions', () => {
  const user = (permissions: string[], isSuperadmin = false) => ({ id: 1, username: 'u', email: 'u@x.id', roleId: 2, roleName: 'Staff', isSuperadmin, permissions });
  const open = (u: ReturnType<typeof user>) => {
    installFakeApi({ 'GET /api/v1/items': paged([]) });
    render(<AuthUserProvider user={u}><StockOpnameTambah /></AuthUserProvider>);
  };

  it('shows a no-permission message instead of the form', () => {
    open(user(['stock-opname.view']));
    expect(screen.getByText(/Anda tidak punya izin/)).not.toBeNull();
    expect(screen.queryByText('Simpan')).toBeNull();
  });

  it('shows the form with stock-opname.create or for a superadmin', () => {
    open(user(['stock-opname.create']));
    expect(screen.getByText('Simpan')).not.toBeNull();
  });

  it('shows the form to a superadmin', () => {
    open(user([], true));
    expect(screen.getByText('Simpan')).not.toBeNull();
  });
});

describe('scan mode', () => {
  const lem = { id: 9, code: 'LEM001', externalCode: 'OLD-7', name: 'Lem Kayu', unit: 'kg', category: 'Bahan Baku', stock: 4, price: 300, locationId: 1, supplierId: 7 };
  const routes = {
    'GET /api/v1/items/by-code/LEM001': lem,
    'GET /api/v1/items/by-code/BRG-1': { ...items.rows[0] },
    'GET /api/v1/items/by-code/NOPE': fail(404, 'Item not found'),
  };
  const openScanner = async () => {
    fireEvent.click(screen.getByText('Scan QR'));
    await waitFor(() => expect(qr.start).toHaveBeenCalled());
  };
  const scanCode = (code: string) => qr.cb!({ data: code });

  it('scan finds an item not on this page: card shows stok sistem, its jumlah is saved', async () => {
    const { api } = await setup({ ...routes, 'POST /api/v1/stock-opname': { id: 1 } });
    await openScanner();
    scanCode('LEM001');
    expect(await screen.findByText('Lem Kayu', { selector: 'dd' })).not.toBeNull();
    expect(screen.getByText('OLD-7')).not.toBeNull();
    expect(screen.getByText('4 kg')).not.toBeNull();
    fireEvent.change(screen.getByLabelText('Jumlah fisik'), { target: { value: '3' } });
    expect(screen.getByText('-1')).not.toBeNull();
    fireEvent.click(screen.getByText('Masukkan ke opname'));
    expect(screen.queryByText('Masukkan ke opname')).toBeNull();
    expect(screen.getByText('Lem Kayu dimasukkan ke opname: 3 kg.')).not.toBeNull();

    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/stock-opname').length).toBe(1));
    expect((api.calls('POST /api/v1/stock-opname')[0].body as { lines: unknown }).lines).toEqual([{ itemId: 9, physicalQty: 3 }]);
  });

  it('scanning an item already entered pre-fills its jumlah instead of duplicating it', async () => {
    const { api } = await setup({ ...routes, 'POST /api/v1/stock-opname': { id: 1 } });
    fireEvent.change(qtys()[0], { target: { value: '8' } });
    await openScanner();
    scanCode('BRG-1');
    expect(await screen.findByText('Triplex', { selector: 'dd' })).not.toBeNull();
    expect((screen.getByLabelText('Jumlah fisik') as HTMLInputElement).value).toBe('8');
    fireEvent.change(screen.getByLabelText('Jumlah fisik'), { target: { value: '9' } });
    fireEvent.click(screen.getByText('Masukkan ke opname'));
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/stock-opname').length).toBe(1));
    expect((api.calls('POST /api/v1/stock-opname')[0].body as { lines: unknown }).lines).toEqual([{ itemId: 1, physicalQty: 9 }]);
  });

  it('unknown code shows the rejected message and no card', async () => {
    await setup(routes);
    await openScanner();
    scanCode('NOPE');
    expect(await screen.findByText('Kode "NOPE" tidak dikenal.')).not.toBeNull();
    expect(screen.queryByText('Masukkan ke opname')).toBeNull();
    expect(screen.queryByLabelText('Jumlah fisik')).toBeNull();
  });
});
