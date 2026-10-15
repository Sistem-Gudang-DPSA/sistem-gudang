import { AuthUserProvider } from '@/domains/auth/user-context';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import DataBarang from './DataBarang';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => '/gudang/barang',
}));

const item = (id: number, over = {}) => ({ id, code: `BRG-${id}`, name: `Barang ${id}`, supplierId: 7, stock: 30, unit: 'pcs', category: 'Lembaran', locationId: 1, price: 1000, ...over });
const rows = paged([item(1), item(2, { code: null, locationId: null, stock: 5 })]);
const locations = paged([{ id: 1, code: 'A01', rackName: 'A', rackNumber: '01' }, { id: 2, code: 'B02', rackName: 'B', rackNumber: '02' }]);
const suppliers = paged([{ id: 7, name: 'PT Kayu' }]);

function setup(extra: Record<string, unknown> = {}, list: unknown = rows) {
  const api = installFakeApi({ 'GET /api/v1/items': list, 'GET /api/v1/locations': locations, 'GET /api/v1/suppliers': suppliers, ...extra });
  render(<DataBarang />);
  return api;
}
const lastQ = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/items').at(-1)!.query;
async function ready(api: ReturnType<typeof installFakeApi>) {
  await screen.findByText('Barang 1');
  await waitFor(() => expect(api.calls('GET /api/v1/locations').length).toBeGreaterThan(0));
  await screen.findAllByText('PT Kayu');
}

describe('DataBarang list', () => {
  it('shows rows with supplier name and location code', async () => {
    const api = setup();
    await ready(api);
    expect(screen.getAllByText('PT Kayu').length).toBe(2);
    await screen.findByText('A01');
    expect(screen.getByText('BRG-1')).not.toBeNull();
    expect(screen.getByText('Barang 2')).not.toBeNull();
  });

  it('shows empty state and API error', async () => {
    setup({}, paged([]));
    expect(await screen.findByText('Belum ada data barang.')).not.toBeNull();
  });

  it('shows API error message', async () => {
    setup({ 'GET /api/v1/items': fail(500, 'Barang error') });
    expect(await screen.findByText(/Barang error|Gagal memuat/)).not.toBeNull();
  });

  it('sends search (maxLength 100)', async () => {
    const api = setup();
    await ready(api);
    const s = screen.getByPlaceholderText('Cari kode atau nama barang...') as HTMLInputElement;
    expect(s.maxLength).toBe(100);
    fireEvent.change(s, { target: { value: 'tri' } });
    await waitFor(() => expect(lastQ(api).get('search')).toBe('tri'));
  });

  it('list request carries page=1&pageSize=20 and exposes pagination', async () => {
    const api = setup({}, paged([item(1)], { total: 45 }));
    await screen.findByText('Barang 1');
    expect(lastQ(api).get('page')).toBe('1');
    expect(lastQ(api).get('pageSize')).toBe('20');
    expect(screen.getByText('Selanjutnya')).not.toBeNull();
  });

  it('requests page=2 on Selanjutnya', async () => {
    const api = setup({}, paged([item(1)], { total: 45 }));
    await screen.findByText('Barang 1');
    fireEvent.click(screen.getByText('Selanjutnya'));
    await waitFor(() => expect(lastQ(api).get('page')).toBe('2'));
  });

  it('resets to page 1 when search changes', async () => {
    const api = setup({}, paged([item(1)], { total: 45 }));
    await screen.findByText('Barang 1');
    fireEvent.click(screen.getByText('Selanjutnya'));
    await waitFor(() => expect(lastQ(api).get('page')).toBe('2'));
    fireEvent.change(screen.getByPlaceholderText('Cari kode atau nama barang...'), { target: { value: 'x' } });
    await waitFor(() => expect(lastQ(api).get('search')).toBe('x'));
    expect(lastQ(api).get('page')).toBe('1');
  });
});

describe('DataBarang assign location', () => {
  async function openAssign(api: ReturnType<typeof installFakeApi>) {
    await ready(api);
    await screen.findByText('A01');
    fireEvent.click(screen.getByText('Tambah Lokasi'));
    await screen.findByText(/TAMBAH LOKASI/);
  }
  const code = () => screen.getByPlaceholderText('Kode akan disarankan otomatis') as HTMLInputElement;

  it('only offers Tambah Lokasi for items without location', async () => {
    const api = setup();
    await ready(api);
    expect(screen.getAllByText('Tambah Lokasi').length).toBe(1);
    expect(screen.getAllByText('Edit Lokasi').length).toBeGreaterThan(0);
  });

  it('fetches suggested code on location pick, then PUTs assign-location', async () => {
    const api = setup({
      'GET /api/v1/items/2/suggest-code': { code: 'B02-001' },
      'PUT /api/v1/items/2/assign-location': { id: 2 },
    });
    await openAssign(api);
    fireEvent.change(screen.getByText('Pilih Lokasi', { selector: 'option' }).parentElement!, { target: { value: '2' } });
    await waitFor(() => expect(code().value).toBe('B02-001'));
    expect(api.calls('GET /api/v1/items/2/suggest-code')[0].query.get('locationId')).toBe('2');
    expect(code().maxLength).toBe(191);
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('PUT /api/v1/items/2/assign-location').length).toBe(1));
    expect(api.calls('PUT /api/v1/items/2/assign-location')[0].body).toEqual({ code: 'B02-001', locationId: 2 });
    await waitFor(() => expect(screen.queryByText(/TAMBAH LOKASI/)).toBeNull());
    await waitFor(() => expect(api.calls('GET /api/v1/items').length).toBe(2));
  });

  it('validates missing location/code', async () => {
    const api = setup();
    await openAssign(api);
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Pilih lokasi dan pastikan kode terisi.')).not.toBeNull();
    expect(api.calls('PUT /api/v1/items/2/assign-location').length).toBe(0);
  });

  it('shows suggestion error', async () => {
    const api = setup({ 'GET /api/v1/items/2/suggest-code': fail(400, 'Rak penuh') });
    await openAssign(api);
    fireEvent.change(screen.getByText('Pilih Lokasi', { selector: 'option' }).parentElement!, { target: { value: '2' } });
    expect(await screen.findByText('Rak penuh')).not.toBeNull();
  });

  it('shows backend error without closing and disables Simpan while saving', async () => {
    const api = setup({
      'GET /api/v1/items/2/suggest-code': { code: 'B02-001' },
      'PUT /api/v1/items/2/assign-location': fail(409, 'Kode dipakai'),
    });
    await openAssign(api);
    fireEvent.change(screen.getByText('Pilih Lokasi', { selector: 'option' }).parentElement!, { target: { value: '2' } });
    await waitFor(() => expect(code().value).toBe('B02-001'));
    fireEvent.click(screen.getByText('Simpan'));
    expect((screen.getByText('Menyimpan...') as HTMLButtonElement).disabled).toBe(true);
    expect(await screen.findByText('Kode dipakai')).not.toBeNull();
    expect(screen.getByText(/TAMBAH LOKASI/)).not.toBeNull();
  });
});

describe('DataBarang adjust stock', () => {
  async function openStock(api: ReturnType<typeof installFakeApi>) {
    await ready(api);
    fireEvent.click(screen.getAllByText('Stok')[0]);
    await screen.findByText(/SESUAIKAN STOK/);
  }
  const delta = () => screen.getByPlaceholderText('Contoh: 10 atau -5') as HTMLInputElement;
  const reason = () => screen.getByPlaceholderText('Contoh: Penerimaan PO-2026-09-001') as HTMLInputElement;

  it('delta keeps digits and one leading minus only; reason maxLength 255', async () => {
    const api = setup();
    await openStock(api);
    fireEvent.change(delta(), { target: { value: '-5' } });
    expect(delta().value).toBe('-5');
    fireEvent.change(delta(), { target: { value: '1e.5' } });
    expect(delta().value).toBe('15');
    fireEvent.change(delta(), { target: { value: '--3-4' } });
    expect(delta().value).toBe('-34');
    fireEvent.change(delta(), { target: { value: '3-4' } });
    expect(delta().value).toBe('34');
    expect(reason().maxLength).toBe(255);
  });

  it('validates empty, zero, lone minus and missing reason', async () => {
    const api = setup();
    await openStock(api);
    const msg = 'Isi jumlah perubahan (boleh negatif) dan alasan.';
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText(msg)).not.toBeNull();
    fireEvent.change(reason(), { target: { value: 'koreksi' } });
    fireEvent.change(delta(), { target: { value: '0' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText(msg)).not.toBeNull();
    fireEvent.change(delta(), { target: { value: '-' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText(msg)).not.toBeNull();
    fireEvent.change(delta(), { target: { value: '5' } });
    fireEvent.change(reason(), { target: { value: '' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(api.calls('PATCH /api/v1/items/1/stock').length).toBe(0);
  });

  it('PATCHes a negative integer delta and reloads', async () => {
    const api = setup({ 'PATCH /api/v1/items/1/stock': { id: 1 } });
    await openStock(api);
    fireEvent.change(delta(), { target: { value: '-5' } });
    fireEvent.change(reason(), { target: { value: 'rusak' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('PATCH /api/v1/items/1/stock').length).toBe(1));
    expect(api.calls('PATCH /api/v1/items/1/stock')[0].body).toEqual({ delta: -5, reason: 'rusak' });
    await waitFor(() => expect(screen.queryByText(/SESUAIKAN STOK/)).toBeNull());
    await waitFor(() => expect(api.calls('GET /api/v1/items').length).toBe(2));
  });

  it('shows backend error without closing and disables while saving', async () => {
    const api = setup({ 'PATCH /api/v1/items/1/stock': fail(400, 'Stok tidak boleh negatif') });
    await openStock(api);
    fireEvent.change(delta(), { target: { value: '-99' } });
    fireEvent.change(reason(), { target: { value: 'x' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect((screen.getByText('Menyimpan...') as HTMLButtonElement).disabled).toBe(true);
    expect(await screen.findByText('Stok tidak boleh negatif')).not.toBeNull();
    expect(screen.getByText(/SESUAIKAN STOK/)).not.toBeNull();
  });
});

const who = (permissions: string[], isSuperadmin = false) => ({ id: 1, username: 'u', email: 'u@x.id', roleId: 2, roleName: 'Staff', isSuperadmin, permissions });

describe('DataBarang QR labels', () => {
  const openSpy = () => {
    const doc = { write: vi.fn(), close: vi.fn() };
    const win = { document: doc, print: vi.fn(), close: vi.fn(), onload: null as null | (() => void) };
    vi.spyOn(window, 'open').mockReturnValue(win as unknown as Window);
    return { doc, win };
  };

  it('only lets items with a code be selected, and prints the selected labels', async () => {
    const { doc } = openSpy();
    const api = setup();
    await ready(api);
    expect((screen.getByLabelText('Pilih Barang 2 untuk cetak label') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByText('Cetak Label QR').closest('button') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Pilih Barang 1 untuk cetak label'));
    fireEvent.click(screen.getByText(/Cetak Label QR \(1\)/));
    await waitFor(() => expect(doc.write).toHaveBeenCalledTimes(1));
    const html = doc.write.mock.calls[0][0] as string;
    expect(html).toContain('BRG-1');
    expect(html).toContain('<svg');
    expect(html).not.toContain('Barang 2');
  });

  it('prints a single label from the row button', async () => {
    const { doc } = openSpy();
    const api = setup();
    await ready(api);
    fireEvent.click(screen.getByTitle('Cetak label QR'));
    await waitFor(() => expect(doc.write).toHaveBeenCalledTimes(1));
  });

  it('tells the user when the browser blocks the pop-up', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const api = setup();
    await ready(api);
    fireEvent.click(screen.getByTitle('Cetak label QR'));
    expect(await screen.findByText(/Pop-up diblokir/)).not.toBeNull();
  });
});

describe('permissions', () => {
  const open = async (user: ReturnType<typeof who>) => {
    installFakeApi({ 'GET /api/v1/items': rows, 'GET /api/v1/locations': locations, 'GET /api/v1/suppliers': suppliers });
    render(<AuthUserProvider user={user}><DataBarang /></AuthUserProvider>);
    await screen.findByText('Barang 1');
  };

  it('hides assign-location and stock actions from a view-only user', async () => {
    await open(who([]));
    expect(screen.queryByText('Tambah Lokasi')).toBeNull();
    expect(screen.queryByTitle('Sesuaikan stok')).toBeNull();
  });

  it('shows each action only with its own permission', async () => {
    await open(who(['item.adjust-stock']));
    expect(screen.queryByText('Tambah Lokasi')).toBeNull();
    expect(screen.getAllByTitle('Sesuaikan stok').length).toBe(2);
  });

  it('shows assign-location with item.assign-location', async () => {
    await open(who(['item.assign-location']));
    expect(screen.getByText('Tambah Lokasi')).not.toBeNull();
    expect(screen.queryByTitle('Sesuaikan stok')).toBeNull();
  });

  it('shows everything to a superadmin', async () => {
    await open(who([], true));
    expect(screen.getByText('Tambah Lokasi')).not.toBeNull();
    expect(screen.getAllByTitle('Sesuaikan stok').length).toBe(2);
  });
});
