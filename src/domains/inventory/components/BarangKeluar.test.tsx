import { AuthUserProvider } from '@/domains/auth/user-context';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act, render, screen, waitFor, fireEvent, within } from '@testing-library/react';
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
const disetujui = () => ({ ...baru(), editRequest: { id: 1, outboundId: 1, status: 'APPROVED', requestedBy: 1, requestedAt: new Date().toISOString(), reviewedBy: 2, reviewedAt: new Date().toISOString(), editedAt: null } });

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
function setup(extra: Record<string, unknown> = {}, rows: unknown = paged([trx(1)])) {
  const api = installFakeApi({ 'GET /api/v1/outbound': rows, 'GET /api/v1/items': items, ...tracking, ...details, ...scanned, ...extra });
  render(<BarangKeluar />);
  return api;
}
const lastQ = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/outbound').at(-1)!.query;
const label = (text: string) => screen.getByLabelText(text) as HTMLInputElement;
// DateFilter selects have no label; pick each one by its placeholder option (Tanggal / Bulan / Tahun).
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

afterEach(() => {
  vi.useRealTimers();
  document.querySelectorAll('iframe[title="Cetak barang keluar"]').forEach((frame) => frame.remove());
});

describe('BarangKeluar list', () => {
  it('prints two checked SPKs as separate forms on the same sheet with their own materials', async () => {
    setup({
      'GET /api/v1/items/1': item(1, 'BRG-1', 'Triplex', 'lembar', 25),
      'GET /api/v1/items/2': item(2, 'BRG-2', 'Paku', 'kg', 140),
    }, paged([
      { ...trx(1), lines: [trx(1).lines[0]] },
      { ...trx(2), lines: [trx(2).lines[1]] },
      trx(3),
    ]));
    await screen.findByText('Klien 3');
    fireEvent.click(label('Centang transaksi 1'));
    fireEvent.click(label('Centang transaksi 2'));
    fireEvent.click(screen.getByText('Print'));
    await waitFor(() => expect(document.querySelector('iframe[title="Cetak barang keluar"]')).not.toBeNull());
    const frame = document.querySelector<HTMLIFrameElement>('iframe[title="Cetak barang keluar"]')!;
    try {
      const printed = new DOMParser().parseFromString(frame.srcdoc, 'text/html');
      expect(printed.querySelectorAll('.kertas')).toHaveLength(1);
      const forms = printed.querySelectorAll('.kertas > .lembar');
      expect(forms).toHaveLength(2);
      expect(forms[0].textContent).toContain('SPK-1');
      expect(forms[0].textContent).toContain('Triplex');
      expect(forms[0].textContent).not.toContain('Paku');
      expect(forms[1].textContent).toContain('SPK-2');
      expect(forms[1].textContent).toContain('Paku');
      expect(forms[1].textContent).not.toContain('Triplex');
      expect(printed.body.textContent).not.toContain('SPK-3');
    } finally {
      frame.remove();
    }
  });

  it('prints only checked transactions using the compact form without empty rows', async () => {
    setup({
      'GET /api/v1/items/1': item(1, 'BRG-1', 'Triplex', 'lembar', 25),
      'GET /api/v1/items/2': item(2, 'BRG-2', 'Paku', 'kg', 140),
    }, paged([trx(1), trx(2)]));
    await screen.findByText('Klien 2');
    fireEvent.click(label('Centang transaksi 2'));
    fireEvent.click(screen.getByText('Print'));
    await waitFor(() => expect(document.querySelector('iframe[title="Cetak barang keluar"]')).not.toBeNull());
    const frame = document.querySelector<HTMLIFrameElement>('iframe[title="Cetak barang keluar"]')!;
    try {
      const printed = new DOMParser().parseFromString(frame.srcdoc, 'text/html');
      expect(printed.body.textContent).toContain('Klien 2');
      expect(printed.body.textContent).not.toContain('Klien 1');
      expect(printed.querySelectorAll('.material tbody tr')).toHaveLength(2);
      expect(printed.querySelector('.baris-kosong')).toBeNull();
      expect(printed.querySelector('style')!.textContent).toContain('width: 138mm');
      expect(printed.body.textContent).toContain('lembar');
      expect(printed.body.textContent).toContain('kg');
    } finally {
      frame.remove();
    }
  });

  it('checks and unchecks every transaction on the page', async () => {
    setup({}, paged([trx(1), trx(2)]));
    await screen.findByText('Klien 2');
    fireEvent.click(label('Centang semua transaksi'));
    expect(label('Centang transaksi 1').checked).toBe(true);
    expect(label('Centang transaksi 2').checked).toBe(true);
    fireEvent.click(label('Centang semua transaksi'));
    expect(label('Centang transaksi 1').checked).toBe(false);
    expect(label('Centang transaksi 2').checked).toBe(false);
  });

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
    setup({}, paged([disetujui()]));
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

  it('totals the qty and exposes Edit on the collapsed transaction after approval', async () => {
    setup({}, paged([disetujui()]));
    await screen.findByText('Triplex');
    const row = screen.getByText('+1 barang lainnya').closest('tr')!;
    expect(row.querySelectorAll('td')[6].textContent).toBe('13');
    expect(row.querySelector('button[aria-label^="Edit"]')).not.toBeNull();
  });

  it('shows Edit directly in the row of a single-line transaction, without a chevron', async () => {
    setup({}, paged([{ ...disetujui(), lines: [trx(1).lines[0]] }]));
    await screen.findAllByText('Klien 1');
    expect(screen.queryByRole('button', { name: /rincian barang/ })).toBeNull();
    expect(screen.queryByText(/barang lainnya/)).toBeNull();
    const row = screen.getByLabelText('Edit barang keluar 1 Triplex').closest('tr')!;
    expect(row.querySelectorAll('td')[6].textContent).toBe('4');
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });

  it('shows Dicatat in Asia/Jakarta time from the UTC createdAt', async () => {
    setup({}, paged([{ ...trx(1), createdAt: '2026-03-05T03:30:00.000Z' }, { ...trx(2), createdAt: '2026-03-05T20:15:00.000Z' }]));
    await screen.findAllByText('Klien 2');
    fireEvent.click(screen.getAllByRole('button', { name: 'Lihat rincian 1' })[0]);
    expect(within(screen.getByRole('dialog', { name: 'Rincian Barang Keluar' })).getByText('05-03-2026 10:30')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Tutup rincian'));
    // 20:15 UTC is already the next day in Jakarta
    fireEvent.click(screen.getAllByRole('button', { name: 'Lihat rincian 2' })[0]);
    expect(within(screen.getByRole('dialog', { name: 'Rincian Barang Keluar' })).getByText('06-03-2026 03:15')).toBeTruthy();
  });

  it('opens the rincian pop-up from the transaction number with every line and the edit status', async () => {
    setup();
    await screen.findAllByText('Klien 1');
    // The number, the Nama Item/Projek and the Barang name all open the same pop-up
    fireEvent.click(screen.getAllByRole('button', { name: 'Lihat rincian 1' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Rincian Barang Keluar' });
    expect(within(dialog).getByText('Triplex')).toBeTruthy();
    expect(within(dialog).getByText('Paku')).toBeTruthy();
    expect(within(dialog).getByText(/Ajukan edit ke superadmin/)).toBeTruthy();
    expect(within(dialog).getByText(/\d{2}-\d{2}-2026 \d{2}:\d{2}/)).toBeTruthy(); // Dicatat
    fireEvent.click(within(dialog).getByLabelText('Tutup rincian'));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByText('Proyek 1'));
    expect(screen.getByRole('dialog', { name: 'Rincian Barang Keluar' })).toBeTruthy();
  });

  it('edits a line from the rincian pop-up, which closes before the edit form opens', async () => {
    const api = setup({}, paged([disetujui()]));
    await screen.findAllByText('Klien 1');
    await waitFor(() => expect(api.calls('GET /api/v1/items').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole('button', { name: 'Lihat rincian 1' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Rincian Barang Keluar' });
    expect(within(dialog).getByText(/Disetujui superadmin/)).toBeTruthy();
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
    // The search is debounced: typing alone sends nothing, the request follows once typing pauses.
    expect(api.calls('GET /api/v1/outbound').some((c) => c.query.get('search') === 'maju')).toBe(false);
    await waitFor(() => expect(lastQ(api).get('search')).toBe('maju'));
    expect(lastQ(api).get('page')).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: /^Filter/ }));
    fireEvent.change(dateSelect('Tahun'), { target: { value: '2025' } });
    fireEvent.change(dateSelect('Bulan'), { target: { value: '02' } });
    fireEvent.change(dateSelect('Tanggal'), { target: { value: '14' } });
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

  it('keeps the typed Dokubah of each row in a text input', async () => {
    const api = setup();
    await openForm(api);
    typePengambil();
    scan('BRG-1');
    await screen.findByText('Triplex', { selector: 'td' });
    expect(label('Dokubah Triplex').value).toBe('');
    fireEvent.change(label('Dokubah Triplex'), { target: { value: 'DKB-12' } });
    expect(label('Dokubah Triplex').value).toBe('DKB-12');
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
    expect(q.value).toBe('e-1.5');
    expect(q.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toContain('Gunakan angka saja');
    expect(q.inputMode).toBe('decimal');
    expect(q.maxLength).toBe(12);
  });

  it.each(['abc', '1..5', '1.234', '0', '-1', '1000000000', ''])('warns and prevents saving invalid quantity %s until corrected', async (value) => {
    const api = setup({ 'POST /api/v1/outbound': { id: 5 } });
    await openForm(api);
    await fillHeader();
    scan('BRG-1');
    await screen.findByText('Triplex', { selector: 'td' });
    const q = label('Pengambilan Triplex');
    fireEvent.change(q, { target: { value } });
    expect(q.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(q.getAttribute('aria-describedby')!)?.textContent).toBeTruthy();
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.queryByText('Konfirmasi Simpan')).toBeNull();
    expect(api.calls('POST /api/v1/outbound')).toHaveLength(0);
    fireEvent.change(q, { target: { value: '0,75' } });
    expect(q.getAttribute('aria-invalid')).toBe('false');
    expect(q.hasAttribute('aria-describedby')).toBe(false);
    fireEvent.click(screen.getByText('Simpan'));
    expect(await screen.findByText('Konfirmasi Simpan')).toBeTruthy();
  });

  it('saves decimal quantities from scanned and manual rows, accepting commas and dots', async () => {
    const api = setup({ 'POST /api/v1/outbound': { id: 5 } });
    await openForm(api);
    await fillHeader();
    scan('BRG-1');
    await screen.findByText('Triplex', { selector: 'td' });
    fireEvent.change(label('Pengambilan Triplex'), { target: { value: '0,5' } });
    expect(label('Pengambilan Triplex').value).toBe('0.5');
    fireEvent.click(screen.getByText('Input Manual'));
    await choose(label('Nama material baris 2'), 'Paku (BRG-2)');
    fireEvent.change(label('Pengambilan Paku'), { target: { value: '1.25' } });
    fireEvent.click(screen.getByText('Simpan'));
    fireEvent.click(await screen.findByText('Konfirmasi Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/outbound')).toHaveLength(1));
    expect(api.calls('POST /api/v1/outbound')[0].body).toMatchObject({
      lines: [{ itemId: 1, qty: 0.5, pic: 'Rudi' }, { itemId: 2, qty: 1.25, pic: 'Rudi' }],
    });
  });

  it('saves a decimal quantity when editing an approved transaction', async () => {
    const api = setup({ 'PUT /api/v1/outbound/1': { id: 1 } }, paged([disetujui()]));
    await screen.findAllByText('Klien 1');
    fireEvent.click(screen.getByLabelText('Edit barang keluar 1 Triplex'));
    fireEvent.change(label('Jumlah'), { target: { value: 'abc' } });
    expect(label('Jumlah').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toContain('Gunakan angka saja');
    fireEvent.click(screen.getByText('Simpan'));
    expect(api.calls('PUT /api/v1/outbound/1')).toHaveLength(0);
    fireEvent.change(label('Jumlah'), { target: { value: '0,75' } });
    expect(label('Jumlah').getAttribute('aria-invalid')).toBe('false');
    expect(label('Jumlah').value).toBe('0.75');
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('PUT /api/v1/outbound/1')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/outbound/1')[0].body).toMatchObject({
      lines: [{ itemId: 1, qty: 0.75, pic: 'Andi' }, { itemId: 2, qty: 9, pic: 'Andi' }],
    });
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
    fireEvent.click(await screen.findByText('Konfirmasi Simpan'));
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
    fireEvent.click(await screen.findByRole('option', { name: 'Paku (BRG-2)' }));
    const row = label('Nama material Paku').closest('tr')!;
    expect(Array.from(row.querySelectorAll('td')).slice(2, 4).map((td) => td.textContent)).toEqual(['kg', 'BRG-2']);
    fireEvent.change(label('Pengambilan Paku'), { target: { value: '7' } });
    fireEvent.click(screen.getByText('Simpan'));
    fireEvent.click(await screen.findByText('Konfirmasi Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/outbound').length).toBe(1));
    expect((api.calls('POST /api/v1/outbound')[0].body as Record<string, unknown>).lines)
      .toEqual([{ itemId: 1, qty: 1, pic: 'Rudi' }, { itemId: 2, qty: 7, pic: 'Rudi' }]);
  });

  it('saves a stock/internal outbound with a manually entered ID and item name', async () => {
    const api = setup({ 'POST /api/v1/outbound': { id: 9 } });
    await screen.findAllByText('Klien 1');
    fireEvent.click(screen.getByText('Barang Keluar Stok / Internal'));
    await screen.findByText('Form Barang Keluar Stok / Internal');
    expect(screen.queryByLabelText('SPK')).toBeNull();
    const id = screen.getByRole('textbox', { name: 'ID Stok / Internal' }) as HTMLInputElement;
    const name = screen.getByRole('textbox', { name: 'Nama Item' }) as HTMLInputElement;
    expect(id.value).toBe('');
    expect(name.disabled).toBe(false);
    expect(id.maxLength).toBe(100);
    expect(name.maxLength).toBe(191);
    fireEvent.change(id, { target: { value: ' OPS-0911 ' } });
    fireEvent.change(name, { target: { value: ' Rak kerja bengkel ' } });
    // Updating the manual ID must not erase an independently typed item name.
    fireEvent.change(id, { target: { value: ' OPS-0912 ' } });
    expect(name.value).toBe(' Rak kerja bengkel ');
    typePengambil();
    scan('BRG-1');
    await screen.findByText('Triplex', { selector: 'td' });
    fireEvent.click(screen.getByText('Simpan'));
    const preview = await screen.findByRole('dialog', { name: 'Preview Barang Keluar' });
    expect(within(preview).getByText('OPS-0912')).toBeTruthy();
    fireEvent.click(within(preview).getByText('Konfirmasi Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/outbound')).toHaveLength(1));
    expect(api.calls('POST /api/v1/outbound')[0].body).toMatchObject({ spk: 'OPS-0912', itemName: 'Rak kerja bengkel', recipientType: 'INTERNAL', lines: [{ itemId: 1, qty: 1, pic: 'Rudi' }] });
    expect(api.calls('GET /api/v1/tracking/spk/OPS-0912')).toHaveLength(0);
  });

  it('requires a manual stock/internal ID and item before opening the preview', async () => {
    const api = setup();
    await screen.findAllByText('Klien 1');
    fireEvent.click(screen.getByText('Barang Keluar Stok / Internal'));
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Lengkapi tanggal, ID stok/internal, nama pengambil, dan nama item.')).toBeTruthy();
    fireEvent.change(label('ID Stok / Internal'), { target: { value: '  ' } });
    fireEvent.change(label('Nama Item'), { target: { value: 'Meja internal' } });
    typePengambil();
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.queryByRole('dialog', { name: 'Preview Barang Keluar' })).toBeNull();
    expect(api.calls('POST /api/v1/outbound')).toHaveLength(0);
  });

  it('shows backend error, keeps form open, disables Simpan while saving', async () => {
    const api = setup({ 'POST /api/v1/outbound': fail(409, 'Stok tidak cukup') });
    await openForm(api);
    await fillHeader();
    scan('BRG-1');
    await screen.findByText('Triplex', { selector: 'td' });
    fireEvent.click(screen.getByText('Simpan'));
    fireEvent.click(await screen.findByText('Konfirmasi Simpan'));
    // while saving the form and preview buttons read Menyimpan... and every save button is disabled
    expect(screen.getAllByText('Menyimpan...').every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    expect((screen.getByText('Simpan + Cetak') as HTMLButtonElement).disabled).toBe(true);
    expect((await screen.findAllByText('Stok tidak cukup')).length).toBeGreaterThan(0);
    expect((screen.getByText('Simpan') as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('BarangKeluar edit', () => {
  it('edits the manually typed stock/internal reference after superadmin approval', async () => {
    const api = setup({ 'PUT /api/v1/outbound/1': { id: 1 } }, paged([{ ...disetujui(), spk: 'OPS-1', clientName: 'Internal', recipientType: 'INTERNAL' }]));
    await screen.findByText('Internal');
    fireEvent.click(screen.getByLabelText('Edit barang keluar 1 Triplex'));
    expect(screen.queryByLabelText('SPK')).toBeNull();
    fireEvent.change(label('ID Stok / Internal'), { target: { value: 'OPS-2' } });
    fireEvent.change(label('Nama Item/Projek'), { target: { value: 'Rak internal baru' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('PUT /api/v1/outbound/1')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/outbound/1')[0].body).toMatchObject({ spk: 'OPS-2', itemName: 'Rak internal baru', recipientType: 'INTERNAL' });
  });

  it('saves all materials together using a single approval', async () => {
    const api = setup({ 'PUT /api/v1/outbound/1': { id: 1 } }, paged([disetujui()]));
    await screen.findAllByText('Klien 1');
    await waitFor(() => expect(api.calls('GET /api/v1/items').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Buka rincian barang 1' }));
    fireEvent.click(screen.getByLabelText('Edit barang keluar 1 Paku'));
    expect(label('Nama Client').value).toBe('Klien 1');
    expect(label('Jumlah').value).toBe('9');
    await choose(label('SPK'), 'SPK-9');
    expect(label('Nama Client').value).toBe('PT Maju');
    fireEvent.change(label('Jumlah'), { target: { value: '12' } });
    fireEvent.change(label('Jumlah Barang 1'), { target: { value: '6' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('PUT /api/v1/outbound/1').length).toBe(1));
    expect(api.calls('PUT /api/v1/outbound/1')[0].body).toEqual({
      date: '2026-03-05', spk: 'SPK-9', itemName: 'Proyek 1', recipientType: 'KLIEN',
      lines: [{ itemId: 1, qty: 6, pic: 'Andi' }, { itemId: 2, qty: 12, pic: 'Andi' }],
    });
    await waitFor(() => expect(screen.queryByText('Simpan')).toBeNull());
  });

  it('keeps an approved edit usable after the 24-hour request window', async () => {
    const api = setup({ 'PUT /api/v1/outbound/1': { id: 1 } }, paged([{ ...disetujui(), createdAt: '2020-01-01T00:00:00Z' }]));
    await screen.findAllByText('Klien 1');
    fireEvent.click(screen.getByLabelText('Edit barang keluar 1 Triplex'));
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('PUT /api/v1/outbound/1')).toHaveLength(1));
  });

  it('shows the Client of the SPK even when it is outside the first 50 of the list', async () => {
    const api = setup({ 'GET /api/v1/tracking/spk': [{ noSpk: 'SPK-1', client: 'Klien 1' }] }, paged([{ ...disetujui(), spk: 'SPK-9' }]));
    await screen.findAllByText('Klien 1');
    fireEvent.click(screen.getByRole('button', { name: 'Buka rincian barang 1' }));
    fireEvent.click(screen.getByLabelText('Edit barang keluar 1 Paku'));
    await waitFor(() => expect(label('Nama Client').value).toBe('PT Maju'));
    expect(screen.getByLabelText('SPK').textContent).toContain('SPK-9');
    expect(api.calls('GET /api/v1/tracking/spk/SPK-9')).toHaveLength(1);
  });

  it('hides the request action for an expired transaction and never exposes direct editing', async () => {
    const api = setup({}, paged([{ ...trx(1), createdAt: '2020-01-01T00:00:00Z' }]));
    await screen.findAllByText('Klien 1');
    expect(screen.queryByRole('button', { name: 'Ajukan edit barang keluar 1' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Edit barang keluar/ })).toBeNull();
    expect(api.calls('PUT /api/v1/outbound/1')).toHaveLength(0);
  });

  it('submits a request and shows pending approval with no Edit or repeat request', async () => {
    const row = { ...baru(), editRequest: null as null | ReturnType<typeof disetujui>['editRequest'] };
    const api = setup({
      'GET /api/v1/outbound': () => paged([row]),
      'POST /api/v1/outbound/1/edit-request': () => { row.editRequest = { ...disetujui().editRequest, status: 'PENDING' }; return row; },
    }, paged([row]));
    await screen.findAllByText('Klien 1');
    expect(screen.queryByLabelText('Edit barang keluar 1 Triplex')).toBeNull();
    const button = screen.getByRole('button', { name: 'Ajukan edit barang keluar 1' });
    fireEvent.click(button); fireEvent.click(button);
    expect(await screen.findByText('Menunggu persetujuan')).toBeTruthy();
    expect(api.calls('POST /api/v1/outbound/1/edit-request')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Ajukan edit barang keluar 1' })).toBeNull();
    // A superadmin approval is picked up when the warehouse tab regains focus.
    row.editRequest = { ...disetujui().editRequest, status: 'APPROVED' };
    fireEvent(window, new Event('focus'));
    expect(await screen.findByLabelText('Edit barang keluar 1 Triplex')).toBeTruthy();
  });

  it('removes Ajukan Edit at the exact 24-hour deadline without a reload', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    const createdAt = new Date(Date.now() - 24 * 3600_000 + 500).toISOString();
    setup({}, paged([{ ...baru(), createdAt }]));
    // Flush fetch responses while keeping the deadline in the future.
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByRole('button', { name: 'Ajukan edit barang keluar 1' })).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(screen.queryByRole('button', { name: 'Ajukan edit barang keluar 1' })).toBeNull();
  });

  it('locks the edited transaction and exposes its before/after history', async () => {
    const approved = disetujui();
    const used = { ...approved, editRequest: { ...approved.editRequest, status: 'USED', editedAt: new Date().toISOString() } };
    setup({ 'GET /api/v1/outbound/1/edit-history': { ...used.editRequest, requestedByName: 'Admin Gudang', reviewedByName: 'Superadmin', beforeValues: approved, afterValues: { ...used, lines: [{ ...used.lines[0], qty: 7 }] } } }, paged([used]));
    expect(await screen.findByText('Sudah diedit 1 kali')).toBeTruthy();
    expect(screen.queryByLabelText('Edit barang keluar 1 Triplex')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ajukan edit barang keluar 1' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Riwayat edit barang keluar 1' }));
    const dialog = await screen.findByRole('dialog', { name: 'Riwayat Edit Barang Keluar #1' });
    expect(await within(dialog).findByText('Sebelum')).toBeTruthy();
    expect(within(dialog).getByText('Sesudah')).toBeTruthy();
    expect(within(dialog).getByRole('cell', { name: '7' })).toBeTruthy();
    expect(within(dialog).getByText(/Superadmin ·/)).toBeTruthy();
  });

  it('keeps an approved edit hidden from a different warehouse admin', async () => {
    installFakeApi({ 'GET /api/v1/outbound': paged([disetujui()]), 'GET /api/v1/items': items, ...tracking });
    render(<AuthUserProvider user={{ ...who(['outbound.update']), id: 9 }}><BarangKeluar /></AuthUserProvider>);
    expect(await screen.findByText('Disetujui untuk pengaju')).toBeTruthy();
    expect(screen.queryByLabelText('Edit barang keluar 1 Triplex')).toBeNull();
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

// The print iframe holds the whole form in srcdoc
async function printedDoc() {
  await waitFor(() => expect(document.querySelector('iframe[title="Cetak barang keluar"]')).not.toBeNull());
  return new DOMParser().parseFromString(document.querySelector<HTMLIFrameElement>('iframe[title="Cetak barang keluar"]')!.srcdoc, 'text/html');
}

// Holds the answer of one by-code request until release() so a scan stays pending
function holdScan(api: ReturnType<typeof installFakeApi>, code: string) {
  const real = api.fetchMock.getMockImplementation()!;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  api.fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).includes(`/items/by-code/${code}`)) await gate;
    return real(input, init);
  });
  return release;
}

describe('BarangKeluar safety paths', () => {
  it('saves and prints after Konfirmasi + Cetak with the units, pengambil and SPK of the draft', async () => {
    const api = setup({ 'POST /api/v1/outbound': { id: 5 } });
    await openForm(api);
    await fillHeader();
    scan('BRG-1');
    await screen.findByText('Triplex', { selector: 'td' });
    fireEvent.click(screen.getByText('Simpan + Cetak'));
    fireEvent.click(await screen.findByText('Konfirmasi + Cetak'));
    await waitFor(() => expect(api.calls('POST /api/v1/outbound')).toHaveLength(1));
    const printed = await printedDoc();
    expect(printed.body.textContent).toContain('SPK-9');
    expect(printed.body.textContent).toContain('PT Maju');
    expect(printed.body.textContent).toContain('Lemari');
    expect(printed.body.textContent).toContain('Triplex');
    expect(printed.body.textContent).toContain('lembar');
    expect(printed.body.textContent).toContain('Rudi');
    await waitFor(() => expect(screen.queryByText('Form Barang Keluar SPK')).toBeNull());
  });

  it('tells the user the data is saved when the print dialog fails after Konfirmasi + Cetak', async () => {
    const api = setup({ 'POST /api/v1/outbound': { id: 5 } });
    await openForm(api);
    await fillHeader();
    scan('BRG-1');
    await screen.findByText('Triplex', { selector: 'td' });
    fireEvent.click(screen.getByText('Simpan + Cetak'));
    const confirm = await screen.findByText('Konfirmasi + Cetak');
    const spy = vi.spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue(null);
    try {
      fireEvent.click(confirm);
      expect(await screen.findByText('Data sudah tersimpan, tetapi dialog cetak gagal dibuka. Dokumen cetak tidak dapat dibuka.')).toBeTruthy();
      expect(api.calls('POST /api/v1/outbound')).toHaveLength(1);
      expect(screen.queryByText('Form Barang Keluar SPK')).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });

  it('saves an edit and prints it with Simpan + Cetak', async () => {
    const api = setup({
      'PUT /api/v1/outbound/1': { id: 1 },
      'GET /api/v1/items/1': item(1, 'BRG-1', 'Triplex', 'lembar', 25),
      'GET /api/v1/items/2': item(2, 'BRG-2', 'Paku', 'kg', 140),
    }, paged([disetujui()]));
    await screen.findAllByText('Klien 1');
    await waitFor(() => expect(api.calls('GET /api/v1/items').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByLabelText('Edit barang keluar 1 Triplex'));
    fireEvent.change(label('Jumlah'), { target: { value: '5' } });
    fireEvent.click(screen.getByText('Simpan + Cetak'));
    await waitFor(() => expect(api.calls('PUT /api/v1/outbound/1')).toHaveLength(1));
    const printed = await printedDoc();
    expect(printed.body.textContent).toContain('SPK-1');
    expect(printed.body.textContent).toContain('Triplex');
    expect(printed.body.textContent).toContain('Paku');
    expect(printed.body.textContent).toContain('lembar');
    expect(printed.body.textContent).toContain('kg');
    expect(printed.body.textContent).toContain('Andi');
  });

  it('shows the edit save as done but reports a failed print dialog', async () => {
    const api = setup({
      'PUT /api/v1/outbound/1': { id: 1 },
      'GET /api/v1/items/1': item(1, 'BRG-1', 'Triplex', 'lembar', 25),
      'GET /api/v1/items/2': item(2, 'BRG-2', 'Paku', 'kg', 140),
    }, paged([disetujui()]));
    await screen.findAllByText('Klien 1');
    await waitFor(() => expect(api.calls('GET /api/v1/items').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByLabelText('Edit barang keluar 1 Triplex'));
    const spy = vi.spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue(null);
    try {
      fireEvent.click(screen.getByText('Simpan + Cetak'));
      expect(await screen.findByText('Perubahan sudah tersimpan, tetapi dialog cetak gagal dibuka. Dokumen cetak tidak dapat dibuka.')).toBeTruthy();
      expect(screen.queryByText('Edit Barang Keluar')).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });

  it('warns "Tidak Bisa Diedit" and closes the form when the approval no longer belongs to the user', async () => {
    const api = installFakeApi({ 'GET /api/v1/outbound': paged([disetujui()]), 'GET /api/v1/items': items, ...tracking });
    const { rerender } = render(<AuthUserProvider user={{ ...who(['outbound.update']), id: 1 }}><BarangKeluar /></AuthUserProvider>);
    fireEvent.click(await screen.findByLabelText('Edit barang keluar 1 Triplex'));
    expect(screen.getByText('Edit Barang Keluar')).toBeTruthy();
    rerender(<AuthUserProvider user={{ ...who(['outbound.update']), id: 9 }}><BarangKeluar /></AuthUserProvider>);
    fireEvent.click(screen.getByText('Simpan'));
    const dialog = await screen.findByRole('alertdialog', { name: 'Tidak Bisa Diedit' });
    expect(within(dialog).getByText(/Ajukan edit ke superadmin dan tunggu persetujuan/)).toBeTruthy();
    expect(screen.queryByText('Edit Barang Keluar')).toBeNull();
    expect(api.calls('PUT /api/v1/outbound/1')).toHaveLength(0);
    fireEvent.click(within(dialog).getByText('Mengerti'));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('blocks a quantity above the stock and names the material', async () => {
    const api = setup();
    await openForm(api);
    await fillHeader();
    scan('BRG-1');
    await screen.findByText('Triplex', { selector: 'td' });
    fireEvent.change(label('Pengambilan Triplex'), { target: { value: '26' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Jumlah Triplex melebihi stok 25 lembar.')).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Preview Barang Keluar' })).toBeNull();
    expect(api.calls('POST /api/v1/outbound')).toHaveLength(0);
  });

  it('disables Simpan while a scan is pending and refuses a submit that slips through', async () => {
    const api = setup();
    const release = holdScan(api, 'HPL-01');
    await openForm(api);
    await fillHeader();
    scan('HPL-01');
    expect((await screen.findByRole('status')).textContent).toBe('Membaca 1 scan barang...');
    expect((screen.getByText('Simpan') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('Simpan + Cetak') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(label('Nama Pengambil').closest('form')!);
    expect(screen.getByText('Tunggu proses scan barang selesai sebelum menyimpan.')).toBeTruthy();
    release();
    await screen.findByText('HPL Putih', { selector: 'td' });
    expect(screen.queryByRole('status')).toBeNull();
    expect((screen.getByText('Simpan') as HTMLButtonElement).disabled).toBe(false);
  });

  it('ignores a scan that comes back after the form was closed and reopened', async () => {
    const api = setup();
    const release = holdScan(api, 'HPL-01');
    await openForm(api);
    typePengambil();
    scan('HPL-01');
    await screen.findByRole('status');
    fireEvent.click(screen.getByLabelText('Tutup form'));
    fireEvent.click(screen.getByText('Barang Keluar SPK'));
    await screen.findByText('Form Barang Keluar SPK');
    release();
    await waitFor(() => expect(api.calls('GET /api/v1/items/by-code/HPL-01')).toHaveLength(1));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(screen.queryByText('HPL Putih', { selector: 'td' })).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('ignores a failed scan that comes back after the form was closed', async () => {
    const api = setup();
    const release = holdScan(api, 'NOPE');
    await openForm(api);
    typePengambil();
    scan('NOPE');
    await screen.findByRole('status');
    fireEvent.click(screen.getByLabelText('Tutup form'));
    release();
    await waitFor(() => expect(api.calls('GET /api/v1/items/by-code/NOPE')).toHaveLength(1));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(screen.queryByText('Kode "NOPE" tidak dikenal.')).toBeNull();
  });

  it('exports with the current search and shows the API message when the export fails', async () => {
    const created = vi.fn(() => 'blob:export');
    Object.assign(URL, { createObjectURL: created, revokeObjectURL: vi.fn() });
    const api = installFakeApi({ 'GET /api/v1/outbound': paged([trx(1)]), 'GET /api/v1/items': items, ...tracking, 'GET /api/v1/reports/outbound/export': { ok: true } });
    render(<AuthUserProvider user={who(['report.view'])}><BarangKeluar /></AuthUserProvider>);
    await screen.findAllByText('Klien 1');
    fireEvent.change(label('Cari barang keluar'), { target: { value: 'maju' } });
    fireEvent.click(screen.getByText('Export'));
    await waitFor(() => expect(created).toHaveBeenCalledTimes(1));
    expect(api.calls('GET /api/v1/reports/outbound/export')[0].query.get('q')).toBe('maju');
    expect(screen.queryByText('Mengekspor...')).toBeNull();
  });

  it('shows the export failure message', async () => {
    installFakeApi({ 'GET /api/v1/outbound': paged([trx(1)]), 'GET /api/v1/items': items, ...tracking, 'GET /api/v1/reports/outbound/export': fail(500, 'Server ekspor mati') });
    render(<AuthUserProvider user={who(['report.view'])}><BarangKeluar /></AuthUserProvider>);
    await screen.findAllByText('Klien 1');
    fireEvent.click(screen.getByText('Export'));
    expect(await screen.findByText('Server ekspor mati')).toBeTruthy();
  });

  it('prints the unit of a line whose item is outside the item search results', async () => {
    const api = setup({
      'PUT /api/v1/outbound/1': { id: 1 },
      'GET /api/v1/items': paged([{ id: 2, code: 'BRG-2', name: 'Paku', unit: 'kg', stock: 140 }]),
      'GET /api/v1/items/1': item(1, 'BRG-1', 'Triplex', 'lembar', 25),
    }, paged([disetujui()]));
    await screen.findAllByText('Klien 1');
    await waitFor(() => expect(api.calls('GET /api/v1/items').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByLabelText('Edit barang keluar 1 Triplex'));
    fireEvent.click(screen.getByText('Simpan + Cetak'));
    const printed = await printedDoc();
    expect(printed.body.textContent).toContain('lembar');
    expect(printed.body.textContent).toContain('kg');
    expect(api.calls('GET /api/v1/items/2')).toHaveLength(0);
  });

  it('rejects an edit that picks the same material on two lines', async () => {
    const api = setup({ 'PUT /api/v1/outbound/1': { id: 1 } }, paged([disetujui()]));
    await screen.findAllByText('Klien 1');
    await waitFor(() => expect(api.calls('GET /api/v1/items').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Buka rincian barang 1' }));
    fireEvent.click(screen.getByLabelText('Edit barang keluar 1 Paku'));
    await choose(label('Nama Barang'), 'Triplex');
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Barang ini sudah ada pada baris lain di transaksi yang sama.')).toBeTruthy();
    expect(api.calls('PUT /api/v1/outbound/1')).toHaveLength(0);
  });
});

describe('permissions', () => {
  const open = async (user: ReturnType<typeof who>) => {
    installFakeApi({ 'GET /api/v1/outbound': paged([trx(1)]), 'GET /api/v1/items': items, ...tracking });
    render(<AuthUserProvider user={user}><BarangKeluar /></AuthUserProvider>);
    await screen.findAllByText('Klien 1');
  };

  it('hides mutation and download buttons from a view-only user but keeps the list', async () => {
    await open(who([]));
    expect(screen.queryByText('Barang Keluar')).toBeNull();
    expect(screen.queryByText('Export')).toBeNull();
  });

  it('shows them to a user with the permissions', async () => {
    await open(who(['outbound.create', 'outbound.update', 'report.view']));
    expect(screen.getByText('Barang Keluar SPK')).not.toBeNull();
    expect(screen.getByText('Export')).not.toBeNull();
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

describe('cancel transaction', () => {
  const batal = { cancelledAt: '2026-03-06T03:00:00.000Z', cancelledByName: 'Admin Utama', cancelReason: 'Salah input' };
  const openDetail = async (user: ReturnType<typeof who>, row: unknown, extra: Record<string, unknown> = {}) => {
    const api = installFakeApi({ 'GET /api/v1/outbound': paged([row]), 'GET /api/v1/items': items, ...tracking, ...extra });
    render(<AuthUserProvider user={user}><BarangKeluar /></AuthUserProvider>);
    await screen.findAllByText('Klien 1');
    fireEvent.click(screen.getAllByRole('button', { name: 'Lihat rincian 1' })[0]);
    return { api, dialog: screen.getByRole('dialog', { name: 'Rincian Barang Keluar' }) };
  };

  it('lets a superadmin cancel with a reason and refreshes the list', async () => {
    const { api, dialog } = await openDetail(who([], true), trx(1), { 'POST /api/v1/outbound/1/cancel': { ...trx(1), ...batal } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Batalkan' }));
    fireEvent.change(screen.getByLabelText('Alasan pembatalan'), { target: { value: '  Salah input  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Batalkan Transaksi' }));
    await screen.findByRole('status');
    expect(api.calls('POST /api/v1/outbound/1/cancel')[0].body).toEqual({ reason: 'Salah input' });
    expect(within(dialog).getByText(/Alasan: Salah input/)).toBeTruthy();
    expect(within(dialog).queryByRole('button', { name: 'Batalkan' })).toBeNull();
  });

  it('hides the button from a non-superadmin', async () => {
    const { dialog } = await openDetail(who(['outbound.update']), trx(1));
    expect(within(dialog).queryByRole('button', { name: 'Batalkan' })).toBeNull();
  });

  it('shows the badge in the list, the reason in the detail, and no edit actions for a cancelled row', async () => {
    const { dialog } = await openDetail(who(['outbound.update'], true), { ...disetujui(), ...batal });
    expect(screen.getAllByText('Dibatalkan superadmin').length).toBeGreaterThan(1);
    expect(within(dialog).getByText(/Admin Utama/)).toBeTruthy();
    expect(within(dialog).queryByRole('button', { name: 'Batalkan' })).toBeNull();
    expect(screen.queryByLabelText('Edit barang keluar 1 Triplex')).toBeNull();
    expect(screen.queryByLabelText('Ajukan edit barang keluar 1')).toBeNull();
  });
});
