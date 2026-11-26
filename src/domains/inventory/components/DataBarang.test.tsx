import { AuthUserProvider } from '@/domains/auth/user-context';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import DataBarang from './DataBarang';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => '/gudang/barang',
}));

const item = (id: number, over = {}) => ({ id, code: `BRG-${id}`, externalCode: id === 1 ? 'PL-778' : null, name: `Barang ${id}`, supplierId: 7, stock: 30, unit: 'pcs', category: 'Lembaran', locationId: 1, price: 1000, ...over });
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
  await waitFor(() => expect(api.calls('GET /api/v1/suppliers').length).toBeGreaterThan(0));
}

describe('DataBarang list', () => {
  it('hides the supplier column while keeping supplier filters and location codes', async () => {
    const api = setup();
    await ready(api);
    expect(screen.queryByRole('columnheader', { name: 'Supplier' })).toBeNull();
    expect(screen.queryByText('PT Kayu')).toBeNull();
    await screen.findByText('A01');
    expect(screen.getByText('BRG-1')).not.toBeNull();
    expect(screen.getByText('PL-778')).not.toBeNull();
    expect(screen.getByText('Barang 2')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Filter/ }));
    expect(await screen.findByRole('option', { name: 'PT Kayu' })).not.toBeNull();
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

  it('keeps checked items when the search changes and clears them on demand', async () => {
    const api = setup();
    await ready(api);
    fireEvent.click(screen.getByLabelText('Pilih Barang 1'));
    expect(screen.getByRole('status').textContent).toContain('1 baris dipilih');
    fireEvent.change(screen.getByPlaceholderText('Cari kode atau nama barang...'), { target: { value: 'Barang 2' } });
    await waitFor(() => expect(lastQ(api).get('search')).toBe('Barang 2'));
    expect((screen.getByLabelText('Pilih Barang 1') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByLabelText('Pilih Barang 2'));
    expect(screen.getByRole('status').textContent).toContain('2 baris dipilih');
    fireEvent.click(screen.getByRole('button', { name: 'Bersihkan pilihan' }));
    expect((screen.getByLabelText('Pilih Barang 1') as HTMLInputElement).checked).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('loads every page with pageSize=100 and shows no pagination', async () => {
    const api = setup({}, (req: { query: URLSearchParams }) => ({
      rows: req.query.get('page') === '2' ? [item(2)] : [item(1)],
      total: 150,
      page: Number(req.query.get('page')),
      pageSize: 100,
    }));
    await screen.findByText('Barang 1');
    expect(await screen.findByText('Barang 2')).not.toBeNull();
    expect(api.calls('GET /api/v1/items').map((c) => c.query.get('page'))).toEqual(['1', '2']);
    expect(api.calls('GET /api/v1/items').every((c) => c.query.get('pageSize') === '100')).toBe(true);
    expect(screen.queryByText('Selanjutnya')).toBeNull();
  });

  it('refetches from page 1 when search changes', async () => {
    const api = setup({}, paged([item(1)], { total: 45 }));
    await screen.findByText('Barang 1');
    fireEvent.change(screen.getByPlaceholderText('Cari kode atau nama barang...'), { target: { value: 'x' } });
    await waitFor(() => expect(lastQ(api).get('search')).toBe('x'));
    expect(lastQ(api).get('page')).toBe('1');
  });

  it('limits the scroll area to the viewport height', async () => {
    setup();
    await screen.findByText('Barang 1');
    const region = screen.getByRole('region', { name: 'Tabel Data Barang' });
    expect(region.style.getPropertyValue('--table-max-h')).toMatch(/^\d+px$/);
  });
});

describe('DataBarang reference lists', () => {
  it('loads every page of locations and suppliers', async () => {
    const byPage = (p1: unknown[], p2: unknown[]) => (req: { query: URLSearchParams }) =>
      ({ rows: req.query.get('page') === '2' ? p2 : p1, total: 101, page: Number(req.query.get('page')), pageSize: 100 });
    const api = setup({
      'GET /api/v1/locations': byPage([{ id: 1, code: 'A01', rackName: 'A', rackNumber: '01' }], [{ id: 2, code: 'Z99', rackName: 'Z', rackNumber: '99' }]),
      'GET /api/v1/suppliers': byPage([{ id: 7, name: 'PT Kayu' }], [{ id: 8, name: 'PT Halaman Dua' }]),
    }, paged([item(1, { supplierId: 8, locationId: 2 })]));
    await screen.findByText('Barang 1');
    expect(await screen.findByText('Z99')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Filter/ }));
    expect(await screen.findByRole('option', { name: 'PT Halaman Dua' })).not.toBeNull();
    expect(api.calls('GET /api/v1/locations')).toHaveLength(2);
    expect(api.calls('GET /api/v1/suppliers')).toHaveLength(2);
  });

  it('shows an error when a reference list fails to load', async () => {
    setup({ 'GET /api/v1/locations': fail(500, 'Lokasi down') });
    expect(await screen.findByText('Lokasi down')).not.toBeNull();
  });
});

describe('DataBarang assign location', () => {
  async function openAssign(api: ReturnType<typeof installFakeApi>) {
    await ready(api);
    await screen.findByText('A01');
    fireEvent.click(screen.getByText('Tambah Lokasi'));
    await screen.findByText(/TAMBAH LOKASI/);
  }

  it('only offers Tambah Lokasi for items without location', async () => {
    const api = setup();
    await ready(api);
    expect(screen.getAllByText('Tambah Lokasi').length).toBe(1);
    expect(screen.getAllByText('Edit Lokasi').length).toBeGreaterThan(0);
  });

  it('PUTs assign-location with the picked location only', async () => {
    const api = setup({ 'PUT /api/v1/items/2/assign-location': { id: 2 } });
    await openAssign(api);
    fireEvent.change(screen.getByText('Pilih Lokasi', { selector: 'option' }).parentElement!, { target: { value: '2' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('PUT /api/v1/items/2/assign-location').length).toBe(1));
    expect(api.calls('PUT /api/v1/items/2/assign-location')[0].body).toEqual({ locationId: 2 });
    await waitFor(() => expect(screen.queryByText(/TAMBAH LOKASI/)).toBeNull());
    await waitFor(() => expect(api.calls('GET /api/v1/items').length).toBe(2));
  });

  it('validates a missing location', async () => {
    const api = setup();
    await openAssign(api);
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Pilih lokasi.')).not.toBeNull();
    expect(api.calls('PUT /api/v1/items/2/assign-location').length).toBe(0);
  });

  it('shows backend error without closing and disables Simpan while saving', async () => {
    const api = setup({ 'PUT /api/v1/items/2/assign-location': fail(409, 'Kode dipakai') });
    await openAssign(api);
    fireEvent.change(screen.getByText('Pilih Lokasi', { selector: 'option' }).parentElement!, { target: { value: '2' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect((screen.getByText('Menyimpan...') as HTMLButtonElement).disabled).toBe(true);
    expect(await screen.findByText('Kode dipakai')).not.toBeNull();
    expect(screen.getByText(/TAMBAH LOKASI/)).not.toBeNull();
  });
});

const who = (permissions: string[], isSuperadmin = false) => ({ id: 1, username: 'u', email: 'u@x.id', roleId: 2, roleName: 'Staff', isSuperadmin, permissions });

describe('DataBarang QR labels', () => {
  // Printing goes through a hidden iframe; fire its load so cetakHtml proceeds to print().
  const labelFrame = async () => {
    await waitFor(() => expect(document.querySelector('iframe[title="Cetak label barang"]')).not.toBeNull());
    const frame = document.querySelector<HTMLIFrameElement>('iframe[title="Cetak label barang"]')!;
    frame.dispatchEvent(new Event('load'));
    return frame;
  };

  it('prints labels only for the selected items that have a code', async () => {
    const open = vi.spyOn(window, 'open');
    const api = setup();
    await ready(api);
    expect((screen.getByText('Cetak Label QR').closest('button') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Pilih Barang 2'));
    expect((screen.getByText('Cetak Label QR').closest('button') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Pilih Barang 1'));
    fireEvent.click(screen.getByText(/Cetak Label QR \(1\)/));
    fireEvent.click(screen.getByRole('button', { name: 'Cetak 1 label' }));
    const frame = await labelFrame();
    const html = frame.srcdoc;
    expect(html).toContain('BRG-1');
    expect(html).toContain('<svg');
    expect(html).not.toContain('Barang 2');
    expect(open).not.toHaveBeenCalled();
    frame.remove();
  });

  it('prints a single label from the row button', async () => {
    const api = setup();
    await ready(api);
    fireEvent.click(screen.getByTitle('Cetak label QR'));
    fireEvent.click(screen.getByRole('button', { name: 'Cetak 1 label' }));
    const frame = await labelFrame();
    expect(frame.srcdoc).toContain('<svg');
    frame.remove();
  });

  it('mencetak beberapa label untuk barang yang sama sesuai jumlah yang diisi', async () => {
    const api = setup();
    await ready(api);
    fireEvent.click(screen.getByTitle('Cetak label QR'));
    fireEvent.change(screen.getByLabelText('Jumlah label per barang'), { target: { value: '5' } });
    expect(screen.getByText(/1 barang × 5 = 5 label/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cetak 5 label' }));
    const frame = await labelFrame();
    expect(frame.srcdoc.match(/class="label"/g)?.length).toBe(5);
    frame.remove();
  });

  it('tells the user when the print document cannot be opened', async () => {
    vi.spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue(null);
    const api = setup();
    await ready(api);
    fireEvent.click(screen.getByTitle('Cetak label QR'));
    fireEvent.click(screen.getByRole('button', { name: 'Cetak 1 label' }));
    expect(await screen.findByText(/Dokumen cetak tidak dapat dibuka/)).not.toBeNull();
    expect(document.querySelector('iframe[title="Cetak label barang"]')).toBeNull();
  });
});

describe('DataBarang bulk location', () => {
  it('assigns one location to the selected items and reports failures', async () => {
    const api = setup({ 'POST /api/v1/items/assign-location/bulk': { assigned: 1, failed: [{ id: 1, reason: 'boom' }] } });
    await ready(api);
    fireEvent.click(screen.getByLabelText('Pilih Barang 1'));
    fireEvent.click(screen.getByLabelText('Pilih Barang 2'));
    fireEvent.click(screen.getByText('Atur Lokasi (2)'));
    expect(screen.getByText(/1 barang sudah punya lokasi/)).not.toBeNull();
    fireEvent.change(screen.getByLabelText('Lokasi'), { target: { value: '2' } });
    fireEvent.click(screen.getByText('Simpan 2 barang'));
    await waitFor(() => expect(api.calls('POST /api/v1/items/assign-location/bulk')).toHaveLength(1));
    expect(api.calls('POST /api/v1/items/assign-location/bulk')[0].body).toEqual({ itemIds: [1, 2], locationId: 2 });
    expect(await screen.findByText(/1 barang dipindahkan ke lokasi B02\. Gagal: Barang 1: boom/)).not.toBeNull();
  });
});

describe('permissions', () => {
  const open = async (user: ReturnType<typeof who>) => {
    installFakeApi({ 'GET /api/v1/items': rows, 'GET /api/v1/locations': locations, 'GET /api/v1/suppliers': suppliers });
    render(<AuthUserProvider user={user}><DataBarang /></AuthUserProvider>);
    await screen.findByText('Barang 1');
  };

  it('hides assign-location from a view-only user', async () => {
    await open(who([]));
    expect(screen.queryByText('Tambah Lokasi')).toBeNull();
  });

  it('shows assign-location with item.assign-location', async () => {
    await open(who(['item.assign-location']));
    expect(screen.getByText('Tambah Lokasi')).not.toBeNull();
  });

  it('shows assign-location to a superadmin', async () => {
    await open(who([], true));
    expect(screen.getByText('Tambah Lokasi')).not.toBeNull();
  });

  // Stock is adjusted from its own sidebar menu, so Data Barang has no Stok button.
  it('has no stock adjust action', async () => {
    await open(who([], true));
    expect(screen.queryByTitle('Sesuaikan stok')).toBeNull();
  });
});

describe('DataBarang export', () => {
  it('exports every filtered row across pages as a quoted CSV', async () => {
    const csv = await import('@/shared/lib/csv');
    const spy = vi.spyOn(csv, 'downloadCsv').mockImplementation(() => {});
    const all = Array.from({ length: 25 }, (_, i) => item(i + 1, { name: i === 0 ? 'Barang 1' : `Barang ${i + 1}`, externalCode: i === 0 ? '=Meja, "besar"' : null }));
    const api = setup({
      'GET /api/v1/items': (req: { query: URLSearchParams }) => {
        const pageSize = Number(req.query.get('pageSize'));
        const page = Number(req.query.get('page'));
        return { rows: all.slice((page - 1) * pageSize, page * pageSize), total: 25, page, pageSize };
      },
    });
    await ready(api);
    fireEvent.click(screen.getByTitle('Export Excel'));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const [name, rows] = spy.mock.calls[0];
    expect(name).toBe('Data_Barang_Gudang.csv');
    expect(rows).toHaveLength(26);
    expect(csv.toCsv(rows)).toContain("\"'=Meja, \"\"besar\"\"\"");
    spy.mockRestore();
  });
});
