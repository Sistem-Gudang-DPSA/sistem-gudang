import { AuthUserProvider } from '@/domains/auth/user-context';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import BarangKeluar from './BarangKeluar';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => '/gudang/barang-keluar',
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

const trx = (id: number) => ({
  id, date: '2026-03-05T00:00:00.000Z', clientName: `Klien ${id}`, spk: `SPK-${id}`, itemName: `Proyek ${id}`,
  warehouseType: 'WIP', recipientType: 'KLIEN', notes: null, createdBy: 1, createdAt: '2026-03-05T00:00:00.000Z',
  lines: [{ itemId: 1, itemCode: 'BRG-1', itemName: 'Triplex', qty: 4, pic: 'Andi' }, { itemId: 2, itemCode: 'BRG-2', itemName: 'Paku', qty: 9, pic: 'Andi' }],
});
// Transaksi yang baru dicatat, jadi Edit masih terbuka
const baru = () => ({ ...trx(1), createdAt: new Date().toISOString() });
const tracking = { 'GET /api/v1/tracking/clients': ['Klien 1', 'PT Gagal', 'PT Jaya', 'PT Maju'].map((client) => ({ client })), 'GET /api/v1/tracking/spk': [{ noSpk: 'SPK-1', client: 'Klien 1' }, { noSpk: 'SPK-9', client: 'PT Maju' }, { noSpk: 'SPK-7', client: 'PT Jaya' }, { noSpk: 'SPK-8', client: 'PT Gagal' }] };
// Client and products of one SPK from tracking, the choices of the Nama Produk/Proyek dropdown
const trackingDetail = (noSpk: string, client: string, products: { name: string; qty: number; unit: string }[]) => ({ noSpk, client, projectName: `Proyek ${noSpk}`, products });
const details = {
  'GET /api/v1/tracking/spk/SPK-9': trackingDetail('SPK-9', 'PT Maju', [{ name: 'Lemari', qty: 2, unit: 'unit' }, { name: 'Meja', qty: 1, unit: 'unit' }]),
  'GET /api/v1/tracking/spk/SPK-7': trackingDetail('SPK-7', 'PT Jaya', []),
  'GET /api/v1/tracking/spk/SPK-8': fail(502, 'Tracking tidak tersedia'),
};
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
  const api = installFakeApi({ 'GET /api/v1/outbound': rows, 'GET /api/v1/items': items, ...tracking, ...details, ...scanned, ...dokubah, ...extra });
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
  fireEvent.click(screen.getByText('Barang Keluar SPK'));
  await screen.findByText('Form Barang Keluar SPK');
  await waitFor(() => expect(api.calls('GET /api/v1/tracking/clients').length).toBeGreaterThan(0));
}

// SPK and produk/proyek are searchable dropdowns: open one and click an option
async function choose(trigger: HTMLElement, option: string) {
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

// Scan Barang and the camera stay disabled until the Nama Pengambil is filled
const typePengambil = () => fireEvent.change(label('Nama Pengambil'), { target: { value: 'Rudi' } });

const clientOfSpk: Record<string, string> = { 'SPK-9': 'PT Maju', 'SPK-7': 'PT Jaya', 'SPK-8': 'PT Gagal' };
// Client first, then one of its SPKs
async function pickSpk(spk: string) {
  await choose(label('Client'), clientOfSpk[spk]);
  await choose(label('SPK'), spk);
}

async function fillHeader(v: { spk: string; item: string } = { spk: 'SPK-9', item: 'Lemari (2 unit)' }) {
  await pickSpk(v.spk);
  typePengambil();
  // the produk/proyek choices load after the SPK is picked; findByRole waits for them
  await choose(label('Nama Item'), v.item);
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
  it('shows one collapsed row per transaction and sends page 1 / pageSize 20', async () => {
    const api = setup();
    expect(await screen.findByText('Triplex')).not.toBeNull();
    // The second line stays behind the chevron until the transaction is expanded
    expect(screen.queryByText('Paku')).toBeNull();
    expect(screen.getByText('+1 barang lainnya')).not.toBeNull();
    expect(screen.getAllByRole('row').length).toBe(2); // header + 1 transaction
    expect(screen.getAllByText('Klien 1').length).toBe(1);
    expect(screen.getAllByText('05-03-2026').length).toBe(1);
    expect(lastQ(api).get('page')).toBe('1');
    expect(lastQ(api).get('pageSize')).toBe('20');
  });

  it('shows the Pengambil once per transaction, right after Nama Item/Projek', async () => {
    setup({}, paged([{ ...trx(1), lines: [{ itemId: 1, itemCode: 'BRG-1', itemName: 'Triplex', qty: 4, pic: 'Andi' }, { itemId: 2, itemCode: 'BRG-2', itemName: 'Paku', qty: 9, pic: 'Budi' }] }]));
    await screen.findByText('Triplex');
    expect(screen.getAllByRole('columnheader').slice(0, 8).map((th) => th.textContent))
      .toEqual(['No', 'Transaksi', 'Client / SPK', 'Nama Item/Projek', 'Pengambil', 'Barang', 'Jumlah', 'Action']);
    // Pengambil (5th td) is the first line's pic on the collapsed row; the sub-row of Paku leaves it empty
    const pengambilOf = (name: string) => screen.getByText(name).closest('tr')!.querySelectorAll('td')[4].textContent;
    expect(pengambilOf('Triplex')).toBe('Andi');
    fireEvent.click(screen.getByRole('button', { name: 'Buka rincian barang 1' }));
    expect(pengambilOf('Paku')).toBe('');
  });

  it('highlights every row of a transaction, sub-rows included, while one of its rows is hovered', async () => {
    setup();
    await screen.findByText('Triplex');
    fireEvent.click(screen.getByRole('button', { name: 'Buka rincian barang 1' }));
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((r) => r.dataset.hover)).toEqual([undefined, undefined, undefined]);
    fireEvent.mouseEnter(screen.getByText('Paku').closest('tr')!);
    expect(rows.map((r) => r.dataset.hover)).toEqual(['true', 'true', 'true']);
    fireEvent.mouseLeave(screen.getByText('Paku').closest('tr')!);
    expect(rows.map((r) => r.dataset.hover)).toEqual([undefined, undefined, undefined]);
  });

  it('expands a multi-line transaction into one sub-row per line, each with its own Edit', async () => {
    setup({}, paged([baru()]));
    await screen.findAllByText('Klien 1');
    expect(screen.queryByLabelText('Edit barang keluar 1 Paku')).toBeNull();
    const chevron = screen.getByRole('button', { name: 'Buka rincian barang 1' });
    expect(chevron.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(chevron);
    expect(screen.getByRole('button', { name: 'Tutup rincian barang 1' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('row')).toHaveLength(4); // header, transaksi, 2 barang
    expect(screen.getByLabelText('Edit barang keluar 1 Triplex')).toBeTruthy();
    expect(screen.getByLabelText('Edit barang keluar 1 Paku')).toBeTruthy();
    expect(screen.getByText('Paku').closest('tr')!.querySelectorAll('td')[6].textContent).toBe('9');
    fireEvent.click(screen.getByRole('button', { name: 'Tutup rincian barang 1' }));
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });

  it('totals the qty of a multi-line transaction on its collapsed row, without an Edit button there', async () => {
    setup({}, paged([baru()]));
    await screen.findByText('Triplex');
    const row = screen.getByText('+1 barang lainnya').closest('tr')!;
    expect(row.querySelectorAll('td')[6].textContent).toBe('13');
    expect(row.querySelector('button[aria-label^="Edit"]')).toBeNull();
  });

  it('shows Edit directly in the row of a single-line transaction, without a chevron', async () => {
    setup({}, paged([{ ...baru(), lines: [trx(1).lines[0]] }]));
    await screen.findAllByText('Klien 1');
    expect(screen.queryByRole('button', { name: /rincian barang/ })).toBeNull();
    expect(screen.queryByText(/barang lainnya/)).toBeNull();
    const row = screen.getByLabelText('Edit barang keluar 1 Triplex').closest('tr')!;
    expect(row.querySelectorAll('td')[6].textContent).toBe('4');
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });

  it('opens the rincian pop-up from the transaction number with every line and the edit status', async () => {
    setup();
    await screen.findAllByText('Klien 1');
    // The number, the Nama Item/Projek and the Barang name all open the same pop-up
    fireEvent.click(screen.getAllByRole('button', { name: 'Lihat rincian 1' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Rincian Barang Keluar' });
    expect(within(dialog).getByText('Triplex')).toBeTruthy();
    expect(within(dialog).getByText('Paku')).toBeTruthy();
    expect(within(dialog).getByText('Sudah lewat 1 hari, tidak bisa diedit')).toBeTruthy();
    expect(within(dialog).getByText(/\d{2}-\d{2}-2026 \d{2}:\d{2}/)).toBeTruthy(); // Dicatat
    fireEvent.click(within(dialog).getByLabelText('Tutup rincian'));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByText('Proyek 1'));
    expect(screen.getByRole('dialog', { name: 'Rincian Barang Keluar' })).toBeTruthy();
  });

  it('edits a line from the rincian pop-up, which closes before the edit form opens', async () => {
    const api = setup({}, paged([baru()]));
    await screen.findAllByText('Klien 1');
    await waitFor(() => expect(api.calls('GET /api/v1/items').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole('button', { name: 'Lihat rincian 1' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Rincian Barang Keluar' });
    expect(within(dialog).getByText(/Bisa diedit sampai/)).toBeTruthy();
    fireEvent.click(within(dialog).getByLabelText('Edit barang keluar 1 Paku'));
    expect(screen.queryByRole('dialog', { name: 'Rincian Barang Keluar' })).toBeNull();
    expect(label('Jumlah').value).toBe('9');
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
    expect(screen.getByText(/Lengkapi tanggal, client, SPK, nama pengambil/)).not.toBeNull();
    await fillHeader();
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Scan atau pilih minimal satu barang yang keluar.')).not.toBeNull();
    // a manual row whose material was never picked is ignored
    fireEvent.click(screen.getByText('Input Manual'));
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Scan atau pilih minimal satu barang yang keluar.')).not.toBeNull();
    expect(api.calls('POST /api/v1/outbound').length).toBe(0);
  });

  it('keeps Scan Barang and the camera disabled until Nama Pengambil is filled', async () => {
    const api = setup();
    await openForm(api);
    const scanBtn = screen.getByText('Scan Barang').closest('button') as HTMLButtonElement;
    expect(scanBtn.disabled).toBe(true);
    expect(screen.getByText('Isi Nama Pengambil dulu')).not.toBeNull();
    fireEvent.click(scanBtn);
    expect(screen.queryByLabelText('Hasil scan')).toBeNull();
    typePengambil();
    expect(scanBtn.disabled).toBe(false);
    expect(screen.queryByText('Isi Nama Pengambil dulu')).toBeNull();
    fireEvent.click(scanBtn);
    expect((screen.getByText('Kamera').closest('button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('picks the Client first; its SPKs are fetched with that client and a new client clears the SPK', async () => {
    const api = setup();
    await openForm(api);
    expect(screen.getByText('No. Transaksi :')).not.toBeNull();
    await pickSpk('SPK-7');
    expect(api.calls('GET /api/v1/tracking/spk').some((c) => c.query.get('client') === 'PT Jaya')).toBe(true);
    expect(label('SPK').textContent).toContain('SPK-7');
    await choose(label('Client'), 'PT Maju');
    expect(label('SPK').textContent).not.toContain('SPK-7');
  });

  it('searches SPK on the server with the typed text, not only the loaded list', async () => {
    const api = setup();
    await openForm(api);
    await choose(label('Client'), 'PT Maju');
    fireEvent.click(label('SPK'));
    fireEvent.change(await screen.findByLabelText('Cari SPK'), { target: { value: ' maju ' } });
    await waitFor(() => expect(api.calls('GET /api/v1/tracking/spk').some((c) => c.query.get('search') === 'maju')).toBe(true));
    const cari = api.calls('GET /api/v1/tracking/spk').find((c) => c.query.get('search') === 'maju')!;
    expect(cari.query.get('limit')).toBe('50');
  });

  it('offers the products of the chosen SPK from tracking as Nama Item choices', async () => {
    const api = setup();
    await openForm(api);
    await pickSpk('SPK-9');
    fireEvent.click(label('Nama Item'));
    await screen.findByRole('option', { name: 'Lemari (2 unit)' });
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Lemari (2 unit)', 'Meja (1 unit)']);
    expect(api.calls('GET /api/v1/tracking/spk/SPK-9')).toHaveLength(1);
  });

  it('offers no item when tracking has no products for the SPK', async () => {
    const api = setup();
    await openForm(api);
    await pickSpk('SPK-7');
    await waitFor(() => expect(api.calls('GET /api/v1/tracking/spk/SPK-7')).toHaveLength(1));
    fireEvent.click(label('Nama Item'));
    expect(await screen.findByText('Tidak ada item pada SPK ini')).not.toBeNull();
    expect(within(screen.getByRole('listbox')).queryAllByRole('option')).toHaveLength(0);
  });

  it('shows a message under Nama Produk/Proyek when the tracking detail fails', async () => {
    const api = setup();
    await openForm(api);
    await pickSpk('SPK-8');
    expect(await screen.findByText('Gagal memuat produk dari tracking. Pilih SPK lagi.')).not.toBeNull();
    expect(api.calls('GET /api/v1/tracking/spk/SPK-8')).toHaveLength(1);
  });

  it('shows the scanner input only after pressing Scan Barang, and the table headers', async () => {
    const api = setup();
    await openForm(api);
    typePengambil();
    expect(screen.queryByLabelText('Hasil scan')).toBeNull();
    fireEvent.click(screen.getByText('Scan Barang'));
    expect(document.activeElement).toBe(label('Hasil scan'));
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent).slice(-7))
      .toEqual(['No', 'Nama Material', 'Satuan/Vol', 'Kode', 'Dokubah', 'Pengambilan', 'Hapus']);
  });

  it('fills a row per scanned item, adds 1 on a repeat scan and reports unknown codes', async () => {
    const api = setup();
    await openForm(api);
    typePengambil();
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
    typePengambil();
    scan('HPL-01');
    await screen.findByText('HPL Putih', { selector: 'td' });
    expect(cellsOf('HPL Putih')[4]).toBe('Pilih Item');
    await pickSpk('SPK-9');
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
    await pickSpk('SPK-7');
    typePengambil();
    scan('BRG-1');
    await screen.findByText('Triplex', { selector: 'td' });
    await waitFor(() => expect(cellsOf('Triplex')[4]).toBe('Tidak ada di dokubah'));
  });

  it('enforces input limits', async () => {
    const api = setup();
    await openForm(api);
    expect(label('Nama Pengambil').maxLength).toBe(191);
    typePengambil();
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
    expect(api.calls('POST /api/v1/outbound')[0].headers.get('Idempotency-Key')).toMatch(/^[\w-]{8,100}$/);
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

  // BE has no stock outbound yet (POST /outbound needs a known SPK), so the Stok form cannot save
  it('opens a Stok form whose Simpan stays disabled', async () => {
    const api = setup();
    await screen.findAllByText('Klien 1');
    fireEvent.click(screen.getByText('Barang Keluar Stok'));
    await screen.findByText('Form Barang Keluar Stok');
    expect(screen.queryByLabelText('SPK')).toBeNull();
    // Until PPIC issues stock IDs the field starts with a manual STOCK-{yyyy-mm-dd}
    expect(label('ID Stok').value).toMatch(/^STOCK-\d{4}-\d{2}-\d{2}$/);
    expect((screen.getByLabelText('Nama Item') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.change(label('ID Stok'), { target: { value: '' } });
    expect((screen.getByLabelText('Nama Item') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('Simpan') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Data stok belum tersedia.')).not.toBeNull();
    expect(api.calls('POST /api/v1/outbound').length).toBe(0);
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
  it('opens the edit pop-up within 1 day and PUTs the whole transaction with the edited line', async () => {
    const api = setup({ 'PUT /api/v1/outbound/1': { id: 1 } }, paged([baru()]));
    await screen.findAllByText('Klien 1');
    await waitFor(() => expect(api.calls('GET /api/v1/items').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Buka rincian barang 1' }));
    fireEvent.click(screen.getByLabelText('Edit barang keluar 1 Paku'));
    expect(label('Nama Client').value).toBe('Klien 1');
    expect(label('Jumlah').value).toBe('9');
    await choose(label('SPK'), 'SPK-9');
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
    fireEvent.click(screen.getByRole('button', { name: 'Buka rincian barang 1' }));
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

  it('shows the Client of the SPK even when it is outside the first 50 of the list', async () => {
    const api = setup({ 'GET /api/v1/tracking/spk': [{ noSpk: 'SPK-1', client: 'Klien 1' }] }, paged([{ ...baru(), spk: 'SPK-9' }]));
    await screen.findAllByText('Klien 1');
    fireEvent.click(screen.getByRole('button', { name: 'Buka rincian barang 1' }));
    fireEvent.click(screen.getByLabelText('Edit barang keluar 1 Paku'));
    await waitFor(() => expect(label('Nama Client').value).toBe('PT Maju'));
    expect(screen.getByLabelText('SPK').textContent).toContain('SPK-9');
    expect(api.calls('GET /api/v1/tracking/spk/SPK-9')).toHaveLength(1);
  });

  it('locks Edit after 1 day and shows a warning instead of the form', async () => {
    const api = setup({}, paged([trx(1)]));
    await screen.findAllByText('Klien 1');
    fireEvent.click(screen.getByRole('button', { name: 'Buka rincian barang 1' }));
    const tombol = screen.getByLabelText('Edit barang keluar 1 Triplex (terkunci)');
    expect((tombol as HTMLButtonElement).disabled).toBe(true);
    // A native disabled button swallows clicks, so the warning pop-up is not reachable from here.
    fireEvent.click(tombol);
    expect(screen.queryByText('Simpan Perubahan')).toBeNull();
    expect(api.calls('PUT /api/v1/outbound/1').length).toBe(0);
  });
});

describe('BarangKeluar camera', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    qr.cb = null; qr.start.mockClear(); qr.stop.mockClear(); qr.destroy.mockClear();
  });

  it('starts the camera, adds a line per decoded QR and stops it on toggle off', async () => {
    const api = setup();
    await openForm(api);
    typePengambil();
    fireEvent.click(screen.getByText('Scan Barang'));
    fireEvent.click(screen.getByText('Kamera'));
    await waitFor(() => expect(qr.start).toHaveBeenCalled());
    qr.cb!({ data: 'BRG-1' });
    await screen.findByText('Triplex', { selector: 'td' });
    expect(label('Pengambilan Triplex').value).toBe('1');
    fireEvent.click(screen.getByText('Matikan kamera'));
    expect(qr.stop).toHaveBeenCalled();
    expect(qr.destroy).toHaveBeenCalled();
  });

  it('locks on the first QR and ignores others until Scan lagi', async () => {
    const api = setup();
    await openForm(api);
    typePengambil();
    fireEvent.click(screen.getByText('Scan Barang'));
    fireEvent.click(screen.getByText('Kamera'));
    await waitFor(() => expect(qr.start).toHaveBeenCalled());
    qr.cb!({ data: 'BRG-1' });
    await screen.findByText('Triplex', { selector: 'td' });
    qr.cb!({ data: 'HPL-01' });
    qr.cb!({ data: 'BRG-1' });
    await Promise.resolve();
    expect(api.calls('GET /api/v1/items/by-code/HPL-01').length).toBe(0);
    expect(label('Pengambilan Triplex').value).toBe('1');
    fireEvent.click(screen.getByText('Scan lagi'));
    qr.cb!({ data: 'HPL-01' });
    await waitFor(() => expect(api.calls('GET /api/v1/items/by-code/HPL-01').length).toBe(1));
  });

  it('stops the camera when the form is closed', async () => {
    const api = setup();
    await openForm(api);
    typePengambil();
    fireEvent.click(screen.getByText('Scan Barang'));
    fireEvent.click(screen.getByText('Kamera'));
    await waitFor(() => expect(qr.start).toHaveBeenCalled());
    fireEvent.click(screen.getByLabelText('Tutup form'));
    await waitFor(() => expect(qr.stop).toHaveBeenCalled());
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
    expect(screen.getByText('Barang Keluar SPK')).not.toBeNull();
    expect(screen.getByText('Download')).not.toBeNull();
  });

  it('shows Edit only to a user with outbound.update', async () => {
    await open(who(['outbound.create']));
    expect(screen.queryAllByText('Edit')).toHaveLength(0);
  });

  it('shows them to a superadmin', async () => {
    await open(who([], true));
    expect(screen.getByText('Barang Keluar SPK')).not.toBeNull();
  });
});
