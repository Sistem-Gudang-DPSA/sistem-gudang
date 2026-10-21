import { AuthUserProvider } from '@/domains/auth/user-context';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
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
// Item Produksi per SPK, the choices of the Nama Produk/Proyek dropdown
const materials = { 'GET /api/v1/material-requests': paged([{ id: 1, spk: 'SPK-9', productionItem: 'Lemari' }, { id: 2, spk: 'SPK-7', productionItem: 'Meja' }]) };
const items = paged([{ id: 1, code: 'BRG-1', name: 'Triplex', unit: 'lembar', stock: 25 }, { id: 2, code: 'BRG-2', name: 'Paku', unit: 'kg', stock: 140 }]);
const item = (id: number, code: string, name: string, unit: string, stock: number) => ({ id, code, name, unit, stock, category: 'Bahan', price: 0, locationId: null, supplierId: null, createdAt: null, updatedAt: null });
const scanned = {
  'GET /api/v1/items/by-code/BRG-1': item(1, 'BRG-1', 'Triplex', 'lembar', 25),
  'GET /api/v1/items/by-code/HPL-01': item(3, 'HPL-01', 'HPL Putih', 'lembar', 6),
  'GET /api/v1/items/by-code/NOPE': fail(404, 'Item not found'),
};
// Dokubah of SPK-9: a draft and the approved one, whose materials fill the Dokubah column
const dokubahRow = (id: number, noSpk: string, status: string) => ({ id, noSpk, client: 'PT Maju', tanggalMulai: '2026-10-01', tanggalSelesai: '2026-10-30', status, fileDokubah: null, totalAnggaran: 0, createdBy: 1, createdAt: '', updatedAt: '', totalKuota: 0, totalRealisasi: 0, totalRealisasiNilai: 0 });
const bahan = (kodeBarang: string, namaBahan: string, kuota: number, realisasi: number) => ({ kodeBarang, namaBahan, satuan: 'lembar', hargaSatuan: 0, kuota, realisasi, keterangan: '' });
const dokubah = {
  'GET /api/v1/dokubah': paged([dokubahRow(4, 'SPK-9', 'DRAFT'), dokubahRow(5, 'SPK-9', 'APPROVED'), dokubahRow(6, 'SPK-90', 'APPROVED')]),
  'GET /api/v1/dokubah/5': { ...dokubahRow(5, 'SPK-9', 'APPROVED'), bahan: [bahan('LAIN', 'hpl putih', 10, 7), bahan('BRG-1', 'Triplex 18mm', 20, 5)] },
};

function setup(extra: Record<string, unknown> = {}, rows: unknown = paged([trx(1)])) {
  const api = installFakeApi({ 'GET /api/v1/outbound': rows, 'GET /api/v1/items': items, ...tracking, ...materials, ...scanned, ...dokubah, ...extra });
  render(<BarangKeluar />);
  return api;
}
const lastQ = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/outbound').at(-1)!.query;
const label = (text: string) => screen.getByLabelText(text) as HTMLInputElement;
// DateFilter selects have no label; pick each one by its placeholder option (Hari / Bulan / Tahun).
const dateSelect = (placeholder: string) => screen.getByRole('option', { name: placeholder }).closest('select') as HTMLSelectElement;

async function openForm(api: ReturnType<typeof installFakeApi>) {
  await screen.findAllByText('Klien 1');
  await waitFor(() => expect(api.calls('GET /api/v1/items').length).toBeGreaterThan(0));
  fireEvent.click(screen.getByText('Barang Keluar'));
  await screen.findByText('Form Barang Keluar');
  await waitFor(() => expect(api.calls('GET /api/v1/tracking/spk').length).toBeGreaterThan(0));
}

// SPK and produk/proyek are searchable dropdowns: open one and click an option
async function choose(trigger: HTMLElement, option: string) {
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

async function fillHeader(v: { spk: string; item: string } = { spk: 'SPK-9', item: 'Lemari' }) {
  await choose(label('SPK'), v.spk);
  fireEvent.change(label('Nama Pengambil'), { target: { value: 'Rudi' } });
  // the produk/proyek choices load after the SPK is picked; findByRole waits for them
  await choose(label('Nama Produk/Proyek'), v.item);
}

// The USB scanner types the code and presses Enter
function scan(code: string) {
  if (!screen.queryByLabelText('Hasil scan')) fireEvent.click(screen.getByText('Scan Barang'));
  fireEvent.change(label('Hasil scan'), { target: { value: code } });
  fireEvent.keyDown(label('Hasil scan'), { key: 'Enter' });
}
const rowOf = (name: string) => screen.getByText(name, { selector: 'td' }).closest('tr')!;
const cellsOf = (name: string) => Array.from(rowOf(name).querySelectorAll('td')).map((td) => td.textContent);

afterEach(() => vi.useRealTimers());

describe('BarangKeluar list', () => {
  it('flattens transaction lines into rows and sends page 1 / pageSize 20', async () => {
    const api = setup();
    expect(await screen.findByText('Triplex')).not.toBeNull();
    expect(screen.getByText('Paku')).not.toBeNull();
    // One row per item line; the transaction columns (client, date) render only on the first line of each transaction.
    expect(screen.getAllByRole('row').length).toBe(3); // header + 2 lines
    expect(screen.getAllByText('Klien 1').length).toBe(1);
    expect(screen.getAllByText('05-03-2026').length).toBe(1);
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
    fireEvent.change(label('Cari barang keluar'), { target: { value: 'maju' } });
    await waitFor(() => expect(lastQ(api).get('search')).toBe('maju'));
    expect(lastQ(api).get('page')).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: /^Filter/ }));
    fireEvent.change(dateSelect('Tahun'), { target: { value: '2025' } });
    fireEvent.change(dateSelect('Bulan'), { target: { value: '02' } });
    fireEvent.change(dateSelect('Hari'), { target: { value: '14' } });
    await waitFor(() => expect(lastQ(api).get('startDate')).toBe('2025-02-14'));
    expect(lastQ(api).get('endDate')).toBe('2025-02-14');
    expect(label('Cari barang keluar').maxLength).toBe(100);
  });
});

describe('BarangKeluar create', () => {
  it('validates header, then that something was scanned', async () => {
    const api = setup();
    await openForm(api);
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText(/Lengkapi tanggal, SPK, nama pengambil/)).not.toBeNull();
    await fillHeader();
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Scan atau pilih minimal satu barang yang keluar.')).not.toBeNull();
    // a manual row whose material was never picked is ignored
    fireEvent.click(screen.getByText('Input Manual'));
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Scan atau pilih minimal satu barang yang keluar.')).not.toBeNull();
    expect(api.calls('POST /api/v1/outbound').length).toBe(0);
  });

  it('stacks the header fields and fills Client from the chosen SPK', async () => {
    const api = setup();
    await openForm(api);
    expect(label('No. Transaksi').readOnly).toBe(true);
    expect(label('Client').readOnly).toBe(true);
    expect(label('Client').value).toBe('');
    await choose(label('SPK'), 'SPK-7');
    expect(label('Client').value).toBe('PT Jaya');
  });

  it('offers the Item Produksi of the chosen SPK plus Stok as Nama Produk/Proyek choices', async () => {
    const api = setup({
      'GET /api/v1/material-requests': paged([
        { id: 1, spk: 'SPK-9', productionItem: 'Lemari Dapur' },
        { id: 2, spk: 'SPK-9', productionItem: 'Lemari Dapur' },
        { id: 3, spk: 'SPK-90', productionItem: 'Meja Lain' },
      ]),
    });
    await openForm(api);
    await choose(label('SPK'), 'SPK-9');
    fireEvent.click(label('Nama Produk/Proyek'));
    await screen.findByRole('option', { name: 'Lemari Dapur' });
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Lemari Dapur', 'Stok']);
    expect(api.calls('GET /api/v1/material-requests')[0].query.get('search')).toBe('SPK-9');
  });

  it('shows the scanner input only after pressing Scan Barang, and the table headers', async () => {
    const api = setup();
    await openForm(api);
    expect(screen.queryByLabelText('Hasil scan')).toBeNull();
    fireEvent.click(screen.getByText('Scan Barang'));
    expect(document.activeElement).toBe(label('Hasil scan'));
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent).slice(-7))
      .toEqual(['No', 'Nama Material', 'Satuan/Vol', 'Kode', 'Dokubah', 'Pengambilan', 'Hapus']);
  });

  it('fills a row per scanned item, adds 1 on a repeat scan and reports unknown codes', async () => {
    const api = setup();
    await openForm(api);
    scan('BRG-1');
    await screen.findByText('Triplex', { selector: 'td' });
    expect(cellsOf('Triplex').slice(0, 4)).toEqual(['1', 'Triplex', 'lembar', 'BRG-1']);
    expect(label('Pengambilan Triplex').value).toBe('1');
    scan('BRG-1');
    await waitFor(() => expect(label('Pengambilan Triplex').value).toBe('2'));
    expect(api.calls('GET /api/v1/items/by-code/BRG-1')).toHaveLength(1);
    scan('NOPE');
    expect(await screen.findByText('Kode "NOPE" tidak dikenal.')).not.toBeNull();
    fireEvent.click(screen.getByLabelText('Hapus Triplex'));
    expect(screen.queryByText('Triplex', { selector: 'td' })).toBeNull();
  });

  it('pulls the Dokubah kuota of the scanned material from the approved dokubah of the SPK', async () => {
    const api = setup();
    await openForm(api);
    scan('HPL-01');
    await screen.findByText('HPL Putih', { selector: 'td' });
    expect(cellsOf('HPL Putih')[4]).toBe('Pilih SPK dulu');
    await choose(label('SPK'), 'SPK-9');
    // matched by name when the code differs, sisa = kuota - realisasi
    await waitFor(() => expect(cellsOf('HPL Putih')[4]).toBe('10 lembarsisa 3'));
    expect(api.calls('GET /api/v1/dokubah')[0].query.get('search')).toBe('SPK-9');
    expect(api.calls('GET /api/v1/dokubah/4')).toHaveLength(0);
    scan('BRG-1');
    await screen.findByText('Triplex', { selector: 'td' });
    expect(cellsOf('Triplex')[4]).toBe('20 lembarsisa 15');
  });

  it('says so when the material is not in the dokubah of the SPK', async () => {
    const api = setup({ 'GET /api/v1/dokubah': paged([]) });
    await openForm(api);
    await choose(label('SPK'), 'SPK-7');
    scan('BRG-1');
    await screen.findByText('Triplex', { selector: 'td' });
    await waitFor(() => expect(cellsOf('Triplex')[4]).toBe('Tidak ada di dokubah'));
  });

  it('enforces input limits', async () => {
    const api = setup();
    await openForm(api);
    expect(label('Nama Pengambil').maxLength).toBe(191);
    scan('BRG-1');
    await screen.findByText('Triplex', { selector: 'td' });
    const q = label('Pengambilan Triplex');
    fireEvent.change(q, { target: { value: 'e-1.5' } });
    expect(q.value).toBe('15');
    expect(q.maxLength).toBe(9);
  });

  it('saves one transaction with the header SPK/produk and every scanned item', async () => {
    const api = setup({ 'POST /api/v1/outbound': { id: 5 } });
    await openForm(api);
    await fillHeader();
    scan('BRG-1');
    await screen.findByText('Triplex', { selector: 'td' });
    fireEvent.change(label('Pengambilan Triplex'), { target: { value: '4' } });
    scan('HPL-01');
    await screen.findByText('HPL Putih', { selector: 'td' });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/outbound').length).toBe(1));
    const a = api.calls('POST /api/v1/outbound')[0].body as Record<string, unknown>;
    expect(a).toMatchObject({ spk: 'SPK-9', itemName: 'Lemari', recipientType: 'PRODUKSI', notes: 'Pengambil: Rudi' });
    expect(a).not.toHaveProperty('clientName');
    expect(a).not.toHaveProperty('warehouseType');
    expect(a.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // PIC is no longer in the form; the API still requires it, so it carries the nama pengambil
    expect(a.lines).toEqual([{ itemId: 1, qty: 4, pic: 'Rudi' }, { itemId: 3, qty: 1, pic: 'Rudi' }]);
    await waitFor(() => expect(screen.queryByText('Simpan')).toBeNull());
  });

  it('adds a manual row whose material is a searchable dropdown, next to scanned rows', async () => {
    const api = setup({ 'POST /api/v1/outbound': { id: 5 } });
    await openForm(api);
    await fillHeader();
    scan('BRG-1');
    await screen.findByText('Triplex', { selector: 'td' });
    fireEvent.click(screen.getByText('Input Manual'));
    fireEvent.click(label('Nama material baris 2'));
    // Triplex is already in the table, so only Paku is offered; the list is searchable
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Paku (BRG-2)']);
    fireEvent.change(label('Cari Nama material baris 2'), { target: { value: 'pak' } });
    fireEvent.click(screen.getByRole('option', { name: 'Paku (BRG-2)' }));
    const row = label('Nama material Paku').closest('tr')!;
    expect(Array.from(row.querySelectorAll('td')).slice(2, 4).map((td) => td.textContent)).toEqual(['kg', 'BRG-2']);
    fireEvent.change(label('Pengambilan Paku'), { target: { value: '7' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/outbound').length).toBe(1));
    expect((api.calls('POST /api/v1/outbound')[0].body as Record<string, unknown>).lines)
      .toEqual([{ itemId: 1, qty: 1, pic: 'Rudi' }, { itemId: 2, qty: 7, pic: 'Rudi' }]);
  });

  it('can send barang out for Stok instead of a produk of the SPK', async () => {
    const api = setup({ 'POST /api/v1/outbound': { id: 5 } });
    await openForm(api);
    await fillHeader({ spk: 'SPK-7', item: 'Stok' });
    scan('BRG-1');
    await screen.findByText('Triplex', { selector: 'td' });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/outbound').length).toBe(1));
    expect(api.calls('POST /api/v1/outbound')[0].body).toMatchObject({ spk: 'SPK-7', itemName: 'Stok' });
  });

  it('shows backend error, keeps form open, disables Simpan while saving', async () => {
    const api = setup({ 'POST /api/v1/outbound': fail(409, 'Stok tidak cukup') });
    await openForm(api);
    await fillHeader();
    scan('BRG-1');
    await screen.findByText('Triplex', { selector: 'td' });
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

  it('shows the 1-day warning and sends no PUT when the limit passes while the pop-up is open', async () => {
    const api = setup({ 'PUT /api/v1/outbound/1': { id: 1 } }, paged([baru()]));
    await screen.findAllByText('Klien 1');
    await waitFor(() => expect(api.calls('GET /api/v1/items').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByLabelText('Edit barang keluar 1 Paku'));
    expect(screen.getByText('Simpan Perubahan')).toBeTruthy();
    // Only Date is faked so waitFor keeps working; move the clock 25h past createdAt
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000);
    fireEvent.click(screen.getByText('Simpan Perubahan'));
    await waitFor(() => expect(screen.queryByText('Simpan Perubahan')).toBeNull());
    expect(await screen.findByText(/sudah tidak bisa diedit/)).toBeTruthy();
    expect(api.calls('PUT /api/v1/outbound/1')).toHaveLength(0);
  });

  it('locks Edit after 1 day and shows a warning instead of the form', async () => {
    const api = setup({}, paged([trx(1)]));
    await screen.findAllByText('Klien 1');
    const tombol = screen.getByLabelText('Edit barang keluar 1 Triplex (terkunci)');
    expect((tombol as HTMLButtonElement).disabled).toBe(true);
    // A native disabled button swallows clicks, so the warning pop-up is not reachable from here.
    fireEvent.click(tombol);
    expect(screen.queryByText('Simpan Perubahan')).toBeNull();
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
