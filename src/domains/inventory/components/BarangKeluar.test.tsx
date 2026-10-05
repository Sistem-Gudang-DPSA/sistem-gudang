import { AuthUserProvider } from '@/domains/auth/user-context';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import BarangKeluar from './BarangKeluar';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => '/gudang/barang-keluar',
}));

const trx = (id: number) => ({
  id, date: '2026-03-05T00:00:00.000Z', clientName: `Klien ${id}`, spk: `SPK-${id}`, itemName: `Proyek ${id}`,
  warehouseType: 'WIP', recipientType: 'KLIEN', notes: null, createdBy: 1, createdAt: '2026-03-05T00:00:00.000Z',
  lines: [{ itemId: 1, itemCode: 'BRG-1', itemName: 'Triplex', qty: 4, pic: 'Andi' }, { itemId: 2, itemCode: 'BRG-2', itemName: 'Paku', qty: 9, pic: 'Andi' }],
});
const tracking = { 'GET /api/v1/tracking/spk': [{ noSpk: 'SPK-9', client: 'PT Maju' }] };
const items = paged([{ id: 1, code: 'BRG-1', name: 'Triplex' }, { id: 2, code: 'BRG-2', name: 'Paku' }]);

function setup(extra: Record<string, unknown> = {}, rows: unknown = paged([trx(1)])) {
  const api = installFakeApi({ 'GET /api/v1/outbound': rows, 'GET /api/v1/items': items, ...tracking, ...extra });
  render(<BarangKeluar />);
  return api;
}
const lastQ = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/outbound').at(-1)!.query;
const ph = (p: string) => screen.getByPlaceholderText(p) as HTMLInputElement;

async function openForm(api: ReturnType<typeof installFakeApi>) {
  await screen.findAllByText('Klien 1');
  await waitFor(() => expect(api.calls('GET /api/v1/items').length).toBeGreaterThan(0));
  fireEvent.click(screen.getByText('Tambah Data'));
  await screen.findByText('Pilih asal gudang', { selector: 'option' });
  await screen.findAllByText('Paku', { selector: 'option' });
  await screen.findByText('SPK-9 - PT Maju', { selector: 'option' });
}
const sel = (placeholderOpt: string) => screen.getByText(placeholderOpt, { selector: 'option' }).parentElement as HTMLSelectElement;

function fillHeader() {
  fireEvent.change(sel('Pilih SPK'), { target: { value: 'SPK-9' } });
  fireEvent.change(ph('Isi Nama Item'), { target: { value: 'Lemari' } });
  fireEvent.change(sel('Pilih asal gudang'), { target: { value: 'BAHAN_BAKU' } });
  fireEvent.change(sel('Pilih penerima'), { target: { value: 'PRODUKSI' } });
}
// line inputs: qty = inputMode numeric inputs in the lines table, pic = text inputs after qty
const lineQty = () => Array.from(document.querySelectorAll('input[inputmode="numeric"]')) as HTMLInputElement[];
const linePic = () => lineQty().map((q) => q.closest('tr')!.querySelectorAll('input')[1] as HTMLInputElement);
const lineSel = () => screen.getAllByText('Pilih barang', { selector: 'option' }).map((o) => o.parentElement as HTMLSelectElement);

describe('BarangKeluar list', () => {
  it('flattens transaction lines into rows and sends page 1 / pageSize 20', async () => {
    const api = setup();
    expect(await screen.findByText('Triplex')).not.toBeNull();
    expect(screen.getByText('Paku')).not.toBeNull();
    expect(screen.getAllByText('Klien 1').length).toBe(2);
    expect(screen.getAllByText('05-03-2026').length).toBe(2);
    expect(lastQ(api).get('page')).toBe('1');
    expect(lastQ(api).get('pageSize')).toBe('20');
  });

  it('shows empty state', async () => {
    setup({}, paged([]));
    expect(await screen.findByText('Data tidak ditemukan untuk filter tersebut.')).not.toBeNull();
  });

  it('shows API error', async () => {
    setup({ 'GET /api/v1/outbound': fail(500, 'Boom') });
    expect(await screen.findByText(/Boom|Gagal memuat/)).not.toBeNull();
  });

  it('search/date filters go to query, search resets page, next requests page 2', async () => {
    const api = setup({}, paged([trx(1)], { total: 41 }));
    await screen.findAllByText('Klien 1');
    fireEvent.click(screen.getByText('Selanjutnya'));
    await waitFor(() => expect(lastQ(api).get('page')).toBe('2'));
    fireEvent.change(screen.getByPlaceholderText(/Cari client/), { target: { value: 'maju' } });
    await waitFor(() => expect(lastQ(api).get('search')).toBe('maju'));
    expect(lastQ(api).get('page')).toBe('1');
    const [, month, year] = Array.from(document.querySelectorAll('select'));
    fireEvent.change(year, { target: { value: '2025' } });
    fireEvent.change(month, { target: { value: '02' } });
    await waitFor(() => expect(lastQ(api).get('startDate')).toBe('2025-02-01'));
    expect(lastQ(api).get('endDate')).toBe('2025-02-28');
    expect((screen.getByPlaceholderText(/Cari client/) as HTMLInputElement).maxLength).toBe(100);
  });
});

describe('BarangKeluar create', () => {
  it('validates header then lines', async () => {
    const api = setup();
    await openForm(api);
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText(/Lengkapi SPK/)).not.toBeNull();
    fillHeader();
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Isi barang, jumlah, dan PIC di setiap baris yang dipakai.')).not.toBeNull();
    fireEvent.change(lineSel()[0], { target: { value: '1' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Isi barang, jumlah, dan PIC di setiap baris yang dipakai.')).not.toBeNull();
    expect(api.calls('POST /api/v1/outbound').length).toBe(0);
  });

  it('enforces input limits', async () => {
    const api = setup();
    await openForm(api);
    expect(ph('Isi Nama Item').maxLength).toBe(191);
    const q = lineQty()[0];
    fireEvent.change(q, { target: { value: 'e-1.5' } });
    expect(q.value).toBe('15');
    expect(q.maxLength).toBe(9);
    expect(linePic()[0].maxLength).toBe(191);
  });

  it('posts payload with integer lines, skipping blank rows, and adds a row with +', async () => {
    const api = setup({ 'POST /api/v1/outbound': { id: 5 } });
    await openForm(api);
    fillHeader();
    expect(lineQty().length).toBe(3);
    fireEvent.change(lineSel()[0], { target: { value: '1' } });
    fireEvent.change(lineQty()[0], { target: { value: '4' } });
    fireEvent.change(linePic()[0], { target: { value: 'Andi' } });
    fireEvent.change(lineSel()[1], { target: { value: '2' } });
    fireEvent.change(lineQty()[1], { target: { value: '9' } });
    fireEvent.change(linePic()[1], { target: { value: 'Budi' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/outbound').length).toBe(1));
    const b = api.calls('POST /api/v1/outbound')[0].body as Record<string, unknown>;
    expect(b).toMatchObject({ spk: 'SPK-9', itemName: 'Lemari', warehouseType: 'BAHAN_BAKU', recipientType: 'PRODUKSI' });
    expect(b).not.toHaveProperty('clientName');
    expect(b.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(b.lines).toEqual([{ itemId: 1, qty: 4, pic: 'Andi' }, { itemId: 2, qty: 9, pic: 'Budi' }]);
    await waitFor(() => expect(screen.queryByText('Simpan')).toBeNull());
  });

  it('add-row button appends a line', async () => {
    const api = setup();
    await openForm(api);
    fireEvent.click(document.querySelector('button[type="button"].w-\\[36px\\]')!);
    expect(lineQty().length).toBe(4);
  });

  it('shows backend error, keeps form open, disables Simpan while saving', async () => {
    const api = setup({ 'POST /api/v1/outbound': fail(409, 'Stok tidak cukup') });
    await openForm(api);
    fillHeader();
    fireEvent.change(lineSel()[0], { target: { value: '1' } });
    fireEvent.change(lineQty()[0], { target: { value: '4' } });
    fireEvent.change(linePic()[0], { target: { value: 'Andi' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect((screen.getByText('Simpan') as HTMLButtonElement).disabled).toBe(true);
    expect(await screen.findByText('Stok tidak cukup')).not.toBeNull();
    expect(screen.getByText('Simpan')).not.toBeNull();
    expect((screen.getByText('Simpan') as HTMLButtonElement).disabled).toBe(false);
  });
});

const who = (permissions: string[], isSuperadmin = false) => ({ id: 1, username: 'u', email: 'u@x.id', roleId: 2, roleName: 'Staff', isSuperadmin, permissions });

describe('permissions', () => {
  const open = async (user: ReturnType<typeof who>) => {
    installFakeApi({ 'GET /api/v1/outbound': paged([trx(1)]), 'GET /api/v1/items': items, ...tracking });
    render(<AuthUserProvider user={user}><BarangKeluar /></AuthUserProvider>);
    await screen.findAllByText('Klien 1');
  };

  it('hides mutation buttons from a view-only user but keeps the list', async () => {
    await open(who([]));
    expect(screen.queryByText('Tambah Data')).toBeNull();
  });

  it('shows them to a user with the permission', async () => {
    await open(who(['outbound.create']));
    expect(screen.getByText('Tambah Data')).not.toBeNull();
  });

  it('shows them to a superadmin', async () => {
    await open(who([], true));
    expect(screen.getByText('Tambah Data')).not.toBeNull();
  });
});
