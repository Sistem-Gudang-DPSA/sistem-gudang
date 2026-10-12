import { describe, it, expect, vi } from 'vitest';
import { render, cleanup, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, fail } from '@/test/fake-api';
import DataSupplierDetail from './DataSupplierDetail';
import { AuthUserProvider } from '@/domains/auth/user-context';

vi.setConfig({ testTimeout: 20000 });

vi.mock('next/navigation', () => ({ useParams: () => ({ id: '5' }), useRouter: () => ({ push: vi.fn() }), usePathname: () => '/', useSearchParams: () => new URLSearchParams() }));

const thisYear = new Date().getFullYear();
const row = (itemId: number, nama: string, harga: (number | null)[], rataRata: number | null) => ({ itemId, kode: `K${itemId}`, nama, satuan: 'lbr', kategori: 'Lembaran', harga, rataRata });
const empty = Array(12).fill(null);

function prices(tahun: number) {
  return {
    supplierId: 5, supplierName: 'PT Kayu', pajak: 'PKP', tahun,
    rows: [
      row(1, 'Triplex', [1000, ...Array(11).fill(null)], tahun === thisYear ? 1000 : 700),
      row(2, 'Paku', empty, null),
    ],
  };
}
function setup(extra: Record<string, unknown> = {}) {
  const api = installFakeApi({
    'GET /api/v1/suppliers/5/prices': (r: { query: URLSearchParams }) => prices(Number(r.query.get('tahun'))),
    'PUT /api/v1/suppliers/5/prices': { ok: true },
    ...extra,
  });
  render(<DataSupplierDetail />);
  return api;
}
const simpan = () => screen.getByText('Simpan Perubahan') as HTMLButtonElement;
const years = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/suppliers/5/prices').map((c) => c.query.get('tahun'));

async function editCell(title: string, value: string) {
  fireEvent.click((await screen.findAllByTitle(title))[0]);
  const input = (await screen.findByRole('textbox', { name: /^Harga / })) as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

describe('DataSupplierDetail', () => {
  it('fetches current and previous year and shows supplier, pajak, previous average', async () => {
    const api = setup();
    expect(await screen.findByText('Triplex')).not.toBeNull();
    expect(screen.getByText(/supplier PT Kayu/)).not.toBeNull();
    expect(screen.getAllByText('PKP').length).toBe(2);
    await waitFor(() => expect(years(api)).toContain(String(thisYear - 1)));
    expect(years(api)).toContain(String(thisYear));
    expect(screen.getAllByText('700').length).toBeGreaterThan(0);
  });

  it('Simpan is disabled without changes', async () => {
    setup();
    await screen.findByText('Triplex');
    expect(simpan().disabled).toBe(true);
  });

  it('digits only input with maxLength 9', async () => {
    setup();
    fireEvent.click(await screen.findAllByTitle('Klik untuk edit harga Februari').then((x) => x[0]));
    const input = screen.getByRole('textbox', { name: /^Harga / }) as HTMLInputElement;
    expect(input.maxLength).toBe(9);
    fireEvent.change(input, { target: { value: '1a2.5-e' } });
    expect(input.value).toBe('125');
  });

  it('sends only changed cells; empty cell becomes harga null', async () => {
    const api = setup();
    await screen.findByText('Triplex');
    // Paku (row 2) Maret := 2500 ; Triplex Januari cleared
    fireEvent.click((await screen.findAllByTitle('Klik untuk edit harga Maret'))[1]);
    let input = screen.getByRole('textbox', { name: /^Harga / });
    fireEvent.change(input, { target: { value: '2500' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getAllByTitle('Klik untuk edit harga Januari')[0]);
    input = screen.getByRole('textbox', { name: /^Harga / });
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText(/2 perubahan belum disimpan/)).not.toBeNull();
    expect(simpan().disabled).toBe(false);
    fireEvent.click(simpan());
    fireEvent.click(await screen.findByText('Ya, Simpan'));
    await waitFor(() => expect(api.calls('PUT /api/v1/suppliers/5/prices')).toHaveLength(1));
    const body = api.calls('PUT /api/v1/suppliers/5/prices')[0].body as { tahun: number; prices: unknown[] };
    expect(body.tahun).toBe(thisYear);
    expect(body.prices).toHaveLength(2);
    expect(body.prices).toContainEqual({ itemId: 2, bulan: 3, harga: 2500 });
    expect(body.prices).toContainEqual({ itemId: 1, bulan: 1, harga: null });
    // refetched afterwards, drafts cleared
    await waitFor(() => expect(simpan().disabled).toBe(true));
  });

  it('re-entering the saved value drops the draft', async () => {
    setup();
    await editCell('Klik untuk edit harga Januari', '1000');
    expect(simpan().disabled).toBe(true);
  });

  it('changing year clears drafts and refetches that year', async () => {
    const api = setup();
    await screen.findByText('Triplex');
    fireEvent.click((await screen.findAllByTitle('Klik untuk edit harga Maret'))[1]);
    const input = screen.getByRole('textbox', { name: /^Harga / });
    fireEvent.change(input, { target: { value: '2500' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(simpan().disabled).toBe(false);
    fireEvent.change(screen.getByLabelText('Tahun'), { target: { value: String(thisYear - 1) } });
    await waitFor(() => expect(simpan().disabled).toBe(true));
    await waitFor(() => expect(years(api)).toContain(String(thisYear - 2)));
  });

  it('shows backend error in confirm dialog on save failure', async () => {
    setup({ 'PUT /api/v1/suppliers/5/prices': fail(422, 'Harga tidak valid') });
    await screen.findByText('Triplex');
    fireEvent.click((await screen.findAllByTitle('Klik untuk edit harga Maret'))[1]);
    const input = screen.getByRole('textbox', { name: /^Harga / });
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(simpan());
    fireEvent.click(await screen.findByText('Ya, Simpan'));
    expect(await screen.findByText('Harga tidak valid')).not.toBeNull();
  });

  it('shows load error', async () => {
    setup({ 'GET /api/v1/suppliers/5/prices': fail(404, 'Supplier tidak ditemukan') });
    expect(await screen.findByText('Supplier tidak ditemukan')).not.toBeNull();
  });
});

describe('permissions', () => {
  const user = (permissions: string[], isSuperadmin = false) => ({ id: 1, username: 'u', email: 'u@x.id', roleId: 1, roleName: 'R', isSuperadmin, permissions });
  const renderAs = (u: ReturnType<typeof user>) => {
    installFakeApi({ 'GET /api/v1/suppliers/5/prices': (r: { query: URLSearchParams }) => prices(Number(r.query.get('tahun'))) });
    render(<AuthUserProvider user={u}><DataSupplierDetail /></AuthUserProvider>);
  };
  it('view-only user sees prices read-only', async () => {
    renderAs(user(['supplier.view']));
    await screen.findByText('Triplex');
    expect(screen.queryByText('Simpan Perubahan')).toBeNull();
    expect(screen.queryByTitle(/Klik untuk edit harga/)).toBeNull();
    expect(screen.queryByText('+ Input')).toBeNull();
  });
  it('supplier.update and superadmin can edit', async () => {
    for (const u of [user(['supplier.update']), user([], true)]) {
      renderAs(u);
      await screen.findByText('Triplex');
      expect(screen.getByText('Simpan Perubahan')).not.toBeNull();
      expect(screen.getAllByTitle(/Klik untuk edit harga/).length).toBeGreaterThan(0);
      cleanup();
    }
  });
});
