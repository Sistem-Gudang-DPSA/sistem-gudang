import { AuthUserProvider } from '@/domains/auth/user-context';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import BarangMasuk from './BarangMasuk';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => '/gudang/barang-masuk',
}));

const tracking = { 'GET /api/v1/tracking/spk': [{ noSpk: 'SPK-1', client: 'Budi' }] };
const inbound = (id: number, over = {}) => ({ id, date: '2026-03-05T00:00:00.000Z', itemCode: `BRG-${id}`, itemName: `Triplex ${id}`, supplierName: 'PT Kayu', clientName: null, source: 'SUPPLIER', qtyArrived: 10, qtyPurchased: 12, ...over });
const items = paged([{ id: 1, code: 'BRG-1', name: 'Triplex 1' }]);
const suppliers = paged([{ id: 7, name: 'PT Kayu' }]);

function setup(extra: Record<string, unknown> = {}, rows: unknown = paged([inbound(1), inbound(2, { supplierName: null, source: 'KLIEN', clientName: 'Budi' })])) {
  const api = installFakeApi({ 'GET /api/v1/inbound': rows, 'GET /api/v1/items': items, 'GET /api/v1/suppliers': suppliers, ...tracking, ...extra });
  const view = render(<BarangMasuk />);
  return { api, view };
}
const lastList = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/inbound').at(-1)!.query;
const textbox = (ph: string) => screen.getByPlaceholderText(ph) as HTMLInputElement;
// DateFilter selects have no label; pick each one by its placeholder option (Hari / Bulan / Tahun).
const dateSelect = (placeholder: string) => screen.getByRole('option', { name: placeholder }).closest('select') as HTMLSelectElement;

async function openBaru(api: ReturnType<typeof installFakeApi>) {
  await screen.findByText('Triplex 1');
  fireEvent.click(screen.getByText('Barang Baru'));
  await screen.findByText('FORM BARANG MASUK');
}
function fillBaru() {
  fireEvent.change(textbox('Isi Nama Barang'), { target: { value: 'Triplex 1' } });
  const qty = screen.getAllByPlaceholderText('0') as HTMLInputElement[];
  fireEvent.change(qty[0], { target: { value: '15' } });
  fireEvent.change(qty[1], { target: { value: '20' } });
}

describe('BarangMasuk list', () => {
  it('shows rows incl. return rows and requests page 1 / pageSize 20', async () => {
    const { api } = setup();
    expect(await screen.findByText('Triplex 1')).not.toBeNull();
    expect(screen.getAllByText('05-03-2026').length).toBe(2);
    const q = lastList(api);
    expect(q.get('page')).toBe('1');
    expect(q.get('pageSize')).toBe('20');
    expect(q.get('search')).toBeNull();
  });

  it('shows empty state and API error', async () => {
    setup({}, paged([]));
    expect(await screen.findByText('Data tidak ditemukan untuk filter tersebut.')).not.toBeNull();
  });

  it('shows API error message', async () => {
    setup({ 'GET /api/v1/inbound': fail(500, 'Server rusak') });
    expect(await screen.findByText(/Server rusak|Gagal memuat/)).not.toBeNull();
  });

  it('sends search + date filters and resets to page 1 on search change', async () => {
    const { api } = setup({}, paged([inbound(1)], { total: 45 }));
    await screen.findByText('Triplex 1');
    fireEvent.click(screen.getByText('Selanjutnya'));
    await waitFor(() => expect(lastList(api).get('page')).toBe('2'));
    fireEvent.change(screen.getByPlaceholderText(/Cari kode/), { target: { value: 'kayu' } });
    await waitFor(() => expect(lastList(api).get('search')).toBe('kayu'));
    expect(lastList(api).get('page')).toBe('1');

    fireEvent.click(screen.getByRole('button', { name: /^Filter/ }));
    fireEvent.change(dateSelect('Tahun'), { target: { value: '2026' } });
    fireEvent.change(dateSelect('Bulan'), { target: { value: '03' } });
    fireEvent.change(dateSelect('Hari'), { target: { value: '05' } });
    await waitFor(() => expect(lastList(api).get('startDate')).toBe('2026-03-05'));
    expect(lastList(api).get('endDate')).toBe('2026-03-05');
    expect(lastList(api).get('page')).toBe('1');
  });

  it('search input has maxLength 100', async () => {
    setup();
    expect((screen.getByPlaceholderText(/Cari kode/) as HTMLInputElement).maxLength).toBe(100);
  });
});

describe('BarangMasuk scan', () => {
  it('opens the scan session from the Scan Barang button', async () => {
    const { api } = setup();
    await screen.findByText('Triplex 1');
    expect(api.calls('GET /api/v1/items').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('Scan Barang'));
    fireEvent.click(await screen.findByText('Barang Lolos QC'));
    expect(await screen.findByLabelText('Hasil scan')).not.toBeNull();
  });
});

describe('BarangMasuk create inbound', () => {
  it('validates required fields', async () => {
    const { api } = setup();
    await openBaru(api);
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Lengkapi semua isian.')).not.toBeNull();
    expect(api.calls('POST /api/v1/inbound').length).toBe(0);
  });

  it('keeps digits only in qty fields, maxLength 9', async () => {
    const { api } = setup();
    await openBaru(api);
    const qty = screen.getAllByPlaceholderText('0') as HTMLInputElement[];
    for (const el of qty) {
      fireEvent.change(el, { target: { value: '1e-2.5' } });
      expect(el.value).toBe('125');
      expect(el.maxLength).toBe(9);
    }
  });

  it('posts integers and closes on success', async () => {
    const { api } = setup({ 'POST /api/v1/inbound': { id: 9 } });
    await openBaru(api);
    fillBaru();
    fireEvent.change(document.querySelector('input[type="date"]')!, { target: { value: '2026-04-01' } });
    fireEvent.change(document.querySelector('select option[value="PARTIAL_RETUR"]')!.parentElement!, { target: { value: 'PARTIAL_RETUR' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/inbound').length).toBe(1));
    expect(api.calls('POST /api/v1/inbound')[0].body).toEqual({ itemId: 1, date: '2026-04-01', qtyArrived: 15, qtyPurchased: 20, statusQc: 'PARTIAL_RETUR' });
    await waitFor(() => expect(screen.queryByText('FORM BARANG MASUK')).toBeNull());
  });

  it('shows backend error and keeps form open; disables save while saving', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const { api } = setup({ 'POST /api/v1/inbound': () => fail(409, 'Konflik data') });
    await openBaru(api);
    fillBaru();
    fireEvent.click(screen.getByText('Simpan'));
    expect((screen.getByText('Simpan') as HTMLButtonElement).disabled).toBe(true);
    expect(await screen.findByText('Konflik data')).not.toBeNull();
    expect(screen.getByText('FORM BARANG MASUK')).not.toBeNull();
    expect((screen.getByText('Simpan') as HTMLButtonElement).disabled).toBe(false);
    release(); await gate;
  });
});

describe('BarangMasuk create return', () => {
  async function openKembali(api: ReturnType<typeof installFakeApi>) {
    await screen.findByText('Triplex 1');
    await waitFor(() => expect(api.calls('GET /api/v1/items').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByText('Barang Kembali'));
    await screen.findByText('FORM BARANG KEMBALI');
    await waitFor(() => expect(api.calls('GET /api/v1/tracking/spk').length).toBeGreaterThan(0));
  }

  it('validates, enforces limits and posts', async () => {
    const { api } = setup({ 'POST /api/v1/inbound/returns': { id: 3 } });
    await openKembali(api);
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Barang, tanggal, dan jumlah wajib diisi.')).not.toBeNull();

    const spk = screen.getByLabelText('SPK');
    expect(screen.queryByText('Nama Klien (opsional)')).toBeNull();
    const qty = screen.getByPlaceholderText('0') as HTMLInputElement;
    fireEvent.change(qty, { target: { value: '-3.e4' } });
    expect(qty.value).toBe('34');

    fireEvent.change(textbox('Isi Nama Barang'), { target: { value: 'Triplex 1' } });
    fireEvent.click(spk);
    fireEvent.click(await screen.findByRole('option', { name: 'SPK-1 - Budi' }));
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/inbound/returns').length).toBe(1));
    const body = api.calls('POST /api/v1/inbound/returns')[0].body as Record<string, unknown>;
    expect(body).toMatchObject({ itemId: 1, qty: 34, spk: 'SPK-1' });
    expect(body).not.toHaveProperty('clientName');
    await waitFor(() => expect(screen.queryByText('FORM BARANG KEMBALI')).toBeNull());
  });

  it('omits empty optional fields and shows backend error without closing', async () => {
    const { api } = setup({ 'POST /api/v1/inbound/returns': fail(400, 'Stok tidak valid') });
    await openKembali(api);
    fireEvent.change(textbox('Isi Nama Barang'), { target: { value: 'Triplex 1' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '5' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(await screen.findByText('Stok tidak valid')).not.toBeNull();
    const body = api.calls('POST /api/v1/inbound/returns')[0].body as Record<string, unknown>;
    expect(body.spk).toBeUndefined();
    expect(screen.getByText('FORM BARANG KEMBALI')).not.toBeNull();
  });
});

const who = (permissions: string[], isSuperadmin = false) => ({ id: 1, username: 'u', email: 'u@x.id', roleId: 2, roleName: 'Staff', isSuperadmin, permissions });

describe('permissions', () => {
  const open = async (user: ReturnType<typeof who>) => {
    installFakeApi({ 'GET /api/v1/inbound': paged([inbound(1)]), 'GET /api/v1/items': items, 'GET /api/v1/suppliers': suppliers });
    render(<AuthUserProvider user={user}><BarangMasuk /></AuthUserProvider>);
    await screen.findAllByText('Triplex 1');
  };

  it('hides mutation buttons from a view-only user but keeps the list', async () => {
    await open(who([]));
    expect(screen.queryByText('Barang Baru')).toBeNull();
    expect(screen.queryByText('Barang Kembali')).toBeNull();
  });

  it('shows them to a user with the permission', async () => {
    await open(who(['inbound.create']));
    expect(screen.getByText('Barang Baru')).not.toBeNull();
    expect(screen.getByText('Barang Kembali')).not.toBeNull();
  });

  it('shows them to a superadmin', async () => {
    await open(who([], true));
    expect(screen.getByText('Barang Baru')).not.toBeNull();
    expect(screen.getByText('Barang Kembali')).not.toBeNull();
  });
});
