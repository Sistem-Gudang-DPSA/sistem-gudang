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
const tracking = { 'GET /api/v1/tracking/spk': [{ noSpk: 'SPK-1', client: 'Klien 1' }, { noSpk: 'SPK-9', client: 'PT Maju' }, { noSpk: 'SPK-7', client: 'PT Jaya' }] };
const items = paged([{ id: 1, code: 'BRG-1', name: 'Triplex' }, { id: 2, code: 'BRG-2', name: 'Paku' }]);

function setup(extra: Record<string, unknown> = {}, rows: unknown = paged([trx(1)])) {
  const api = installFakeApi({ 'GET /api/v1/outbound': rows, 'GET /api/v1/items': items, ...tracking, ...extra });
  render(<BarangKeluar />);
  return api;
}
const lastQ = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/outbound').at(-1)!.query;
const label = (text: string) => screen.getByLabelText(text) as HTMLInputElement;
const cell = (name: string, row: number) => screen.getByLabelText(`${name} baris ${row}`) as HTMLInputElement;

async function openForm(api: ReturnType<typeof installFakeApi>) {
  await screen.findAllByText('Klien 1');
  await waitFor(() => expect(api.calls('GET /api/v1/items').length).toBeGreaterThan(0));
  fireEvent.click(screen.getByText('Barang Keluar'));
  await screen.findByText('Pilih penerima', { selector: 'option' });
  await screen.findAllByText('Paku', { selector: 'option' });
  await screen.findAllByText('SPK-9', { selector: 'option' });
}

function fillHeader() {
  fireEvent.change(label('Nama Pengambil'), { target: { value: 'Rudi' } });
  fireEvent.change(label('Tujuan / Penerima'), { target: { value: 'PRODUKSI' } });
}

function fillRow(row: number, v: { spk: string; item: string; itemId: string; qty: string; pic: string }) {
  fireEvent.change(cell('No. SPK', row), { target: { value: v.spk } });
  fireEvent.change(cell('Nama item/project', row), { target: { value: v.item } });
  fireEvent.change(cell('Nama barang', row), { target: { value: v.itemId } });
  fireEvent.change(cell('Jumlah', row), { target: { value: v.qty } });
  fireEvent.change(cell('PIC', row), { target: { value: v.pic } });
}

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
    fireEvent.change(label('Cari'), { target: { value: 'maju' } });
    await waitFor(() => expect(lastQ(api).get('search')).toBe('maju'));
    expect(lastQ(api).get('page')).toBe('1');
    fireEvent.change(label('Tanggal'), { target: { value: '2025-02-14' } });
    await waitFor(() => expect(lastQ(api).get('startDate')).toBe('2025-02-14'));
    expect(lastQ(api).get('endDate')).toBe('2025-02-14');
    expect(label('Cari').maxLength).toBe(100);
  });
});

describe('BarangKeluar create', () => {
  it('validates header then lines', async () => {
    const api = setup();
    await openForm(api);
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText(/Lengkapi nama pengambil/)).not.toBeNull();
    fillHeader();
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText(/Isi No\. SPK, nama item/)).not.toBeNull();
    fireEvent.change(cell('Nama barang', 1), { target: { value: '1' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText(/Isi No\. SPK, nama item/)).not.toBeNull();
    expect(api.calls('POST /api/v1/outbound').length).toBe(0);
  });

  it('enforces input limits', async () => {
    const api = setup();
    await openForm(api);
    expect(label('Nama Pengambil').maxLength).toBe(191);
    expect(cell('Nama item/project', 1).maxLength).toBe(191);
    const q = cell('Jumlah', 1);
    fireEvent.change(q, { target: { value: 'e-1.5' } });
    expect(q.value).toBe('15');
    expect(q.maxLength).toBe(9);
    expect(cell('PIC', 1).maxLength).toBe(191);
  });

  it('groups rows per SPK/client/item into transactions, skipping blank rows', async () => {
    const api = setup({ 'POST /api/v1/outbound': { id: 5 } });
    await openForm(api);
    fillHeader();
    fillRow(1, { spk: 'SPK-9', item: 'Lemari', itemId: '1', qty: '4', pic: 'Andi' });
    fillRow(2, { spk: 'SPK-9', item: 'Lemari', itemId: '2', qty: '9', pic: 'Budi' });
    fillRow(3, { spk: 'SPK-7', item: 'Meja', itemId: '1', qty: '1', pic: 'Cici' });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/outbound').length).toBe(2));
    const [a, b] = api.calls('POST /api/v1/outbound').map((c) => c.body as Record<string, unknown>);
    expect(a).toMatchObject({ spk: 'SPK-9', itemName: 'Lemari', recipientType: 'PRODUKSI', notes: 'Pengambil: Rudi' });
    expect(a).not.toHaveProperty('clientName');
    expect(a).not.toHaveProperty('warehouseType');
    expect(a.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(a.lines).toEqual([{ itemId: 1, qty: 4, pic: 'Andi' }, { itemId: 2, qty: 9, pic: 'Budi' }]);
    expect(b).toMatchObject({ spk: 'SPK-7', itemName: 'Meja' });
    expect(b.lines).toEqual([{ itemId: 1, qty: 1, pic: 'Cici' }]);
    await waitFor(() => expect(screen.queryByText('Simpan')).toBeNull());
  });

  it('add-row button appends a line', async () => {
    const api = setup();
    await openForm(api);
    fireEvent.click(screen.getByLabelText('Tambah baris barang'));
    expect(cell('Jumlah', 4)).not.toBeNull();
  });

  it('shows backend error, keeps form open, disables Simpan while saving', async () => {
    const api = setup({ 'POST /api/v1/outbound': fail(409, 'Stok tidak cukup') });
    await openForm(api);
    fillHeader();
    fillRow(1, { spk: 'SPK-9', item: 'Lemari', itemId: '1', qty: '4', pic: 'Andi' });
    fireEvent.click(screen.getByText('Simpan'));
    expect((screen.getByText('Simpan') as HTMLButtonElement).disabled).toBe(true);
    expect(await screen.findByText('Stok tidak cukup')).not.toBeNull();
    expect((screen.getByText('Simpan') as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('BarangKeluar edit', () => {
  const baru = () => ({ ...trx(1), createdAt: new Date().toISOString() });

  it('opens the edit pop-up within 1 day and PUTs the whole transaction with the edited line', async () => {
    const api = setup({ 'PUT /api/v1/outbound/1': { id: 1 } }, paged([baru()]));
    await screen.findAllByText('Klien 1');
    await waitFor(() => expect(api.calls('GET /api/v1/items').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByLabelText('Edit barang keluar 1 Paku'));
    expect(label('Nama Client').value).toBe('Klien 1');
    expect(label('Jumlah').value).toBe('9');
    fireEvent.change(label('SPK'), { target: { value: 'SPK-9' } });
    expect(label('Nama Client').value).toBe('PT Maju');
    fireEvent.change(label('Jumlah'), { target: { value: '12' } });
    fireEvent.click(screen.getByText('Simpan Perubahan'));
    await waitFor(() => expect(api.calls('PUT /api/v1/outbound/1').length).toBe(1));
    expect(api.calls('PUT /api/v1/outbound/1')[0].body).toEqual({
      date: '2026-03-05', spk: 'SPK-9', itemName: 'Proyek 1', recipientType: 'KLIEN',
      lines: [{ itemId: 1, qty: 4, pic: 'Andi' }, { itemId: 2, qty: 12, pic: 'Andi' }],
    });
    await waitFor(() => expect(screen.queryByText('Simpan Perubahan')).toBeNull());
  });

  it('locks Edit after 1 day and shows a warning instead of the form', async () => {
    const api = setup({}, paged([trx(1)]));
    await screen.findAllByText('Klien 1');
    const tombol = screen.getByLabelText('Edit barang keluar 1 Triplex (terkunci)');
    expect(tombol.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(tombol);
    expect(screen.getByText(/sudah tidak bisa diedit/)).not.toBeNull();
    expect(screen.queryByText('Simpan Perubahan')).toBeNull();
    fireEvent.click(screen.getByText('Mengerti'));
    expect(screen.queryByText(/sudah tidak bisa diedit/)).toBeNull();
    expect(api.calls('PUT /api/v1/outbound/1').length).toBe(0);
  });
});

const who = (permissions: string[], isSuperadmin = false) => ({ id: 1, username: 'u', email: 'u@x.id', roleId: 2, roleName: 'Staff', isSuperadmin, permissions });

describe('permissions', () => {
  const open = async (user: ReturnType<typeof who>) => {
    installFakeApi({ 'GET /api/v1/outbound': paged([trx(1)]), 'GET /api/v1/items': items, ...tracking });
    render(<AuthUserProvider user={user}><BarangKeluar /></AuthUserProvider>);
    await screen.findAllByText('Klien 1');
  };

  it('hides mutation and download buttons from a view-only user but keeps the list', async () => {
    await open(who([]));
    expect(screen.queryByText('Barang Keluar')).toBeNull();
    expect(screen.queryByText('Download')).toBeNull();
  });

  it('shows them to a user with the permissions', async () => {
    await open(who(['outbound.create', 'outbound.update', 'report.view']));
    expect(screen.getByText('Barang Keluar')).not.toBeNull();
    expect(screen.getByText('Download')).not.toBeNull();
  });

  it('shows Edit only to a user with outbound.update', async () => {
    await open(who(['outbound.create']));
    expect(screen.queryAllByText('Edit')).toHaveLength(0);
  });

  it('shows them to a superadmin', async () => {
    await open(who([], true));
    expect(screen.getByText('Barang Keluar')).not.toBeNull();
  });
});
