import { AuthUserProvider } from '@/domains/auth/user-context';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within, act } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import * as inventoryApi from '@/domains/inventory/api';
import * as printFormulir from '@/domains/inventory/print-formulir';
import BarangMasuk from './BarangMasuk';

const qr = vi.hoisted(() => ({
  onScan: null as null | ((result: { data: string }) => void),
  start: vi.fn(async () => {}),
  stop: vi.fn(),
  destroy: vi.fn(),
}));
vi.mock('qr-scanner', () => ({
  default: class {
    constructor(_video: unknown, onScan: (result: { data: string }) => void) { qr.onScan = onScan; }
    start = qr.start;
    stop = qr.stop;
    destroy = qr.destroy;
  },
}));

beforeEach(() => {
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  qr.onScan = null;
  qr.start.mockClear();
  qr.stop.mockClear();
  qr.destroy.mockClear();
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => '/gudang/barang-masuk',
}));

const inbound = (id: number, over = {}) => ({ id, itemId: id, date: '2026-03-05T00:00:00.000Z', itemCode: `BRG-${id}`, itemName: `Triplex ${id}`, supplierId: 7, supplierName: 'PT Kayu', clientName: null, source: 'SUPPLIER', qtyArrived: 10, qtyPurchased: 12, ...over });
const scannedItem = { id: 3, code: 'BRG-3', name: 'Paku', unit: 'pcs', stock: 10, category: 'Material', price: 0, locationId: 1, supplierId: 7, supplierName: 'PT Kayu', createdAt: null, updatedAt: null };
const firstItem = { ...scannedItem, id: 1, code: 'BRG-1', name: 'Triplex 1', unit: 'lbr' };
const items = paged([firstItem]);
const suppliers = paged([{ id: 7, name: 'PT Kayu' }, { id: 8, name: 'PT Besi' }]);
const batchSuccess = { count: 1, items: [inbound(1)] };
const BATCH = 'POST /api/v1/inbound/batch';

function setup(extra: Record<string, unknown> = {}, rows: unknown = paged([inbound(1), inbound(2, { supplierName: null, source: 'KLIEN', clientName: 'Budi' })])) {
  const api = installFakeApi({ 'GET /api/v1/inbound': rows, 'GET /api/v1/items': items, 'GET /api/v1/suppliers': suppliers, [BATCH]: batchSuccess, ...extra });
  const view = render(<BarangMasuk />);
  return { api, view };
}
const lastList = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/inbound').at(-1)!.query;
// DateFilter selects have no label; pick each one by its placeholder option (Tanggal / Bulan / Tahun).
const dateSelect = (placeholder: string) => screen.getByRole('option', { name: placeholder }).closest('select') as HTMLSelectElement;
const formDialog = () => screen.getByRole('dialog', { name: 'FORM BARANG MASUK' });
const previewDialog = () => screen.getByRole('dialog', { name: 'PREVIEW BARANG MASUK' });
const arrived = (name = 'Triplex 1') => screen.getByLabelText(`Jumlah Sesuai Kedatangan ${name}`) as HTMLInputElement;
const purchased = (name = 'Triplex 1') => screen.getByLabelText(`Jumlah Sesuai Rekap Pembelian ${name}`) as HTMLInputElement;
const tableRow = (code: string) => within(screen.getByRole('dialog')).getByText(code).closest('tr')!;

async function pickSupplier(name = 'PT Kayu') {
  fireEvent.click(screen.getByRole('button', { name: 'Nama Supplier' }));
  fireEvent.click(await screen.findByRole('option', { name }));
}
async function openBaru({ supplier = true, manual = true } = {}) {
  await screen.findByText('Triplex 1');
  fireEvent.click(screen.getByText('Barang Baru'));
  await screen.findByText('FORM BARANG MASUK');
  if (supplier) await pickSupplier();
  if (manual) fireEvent.click(screen.getByRole('button', { name: 'Input Manual' }));
}
async function pickItem(name = 'Triplex 1 (BRG-1)', index = 0) {
  fireEvent.click(within(formDialog()).getAllByRole('button', { name: /^Nama material/ })[index]);
  fireEvent.click(await screen.findByRole('option', { name }));
}
async function fillBaru() {
  await pickItem();
  fireEvent.change(arrived(), { target: { value: '15' } });
  fireEvent.change(purchased(), { target: { value: '20' } });
}
const scan = (code: string) => {
  const input = screen.getByLabelText('Hasil scan');
  fireEvent.change(input, { target: { value: code } });
  fireEvent.keyDown(input, { key: 'Enter' });
};
const confirm = () => fireEvent.click(screen.getByRole('button', { name: 'Konfirmasi Simpan' }));

describe('BarangMasuk list', () => {
  it('shows rows incl. return rows and requests page 1 / pageSize 20', async () => {
    const { api } = setup();
    expect(screen.getByText('Memuat data...').closest('td')?.colSpan).toBe(7);
    expect(await screen.findByText('Triplex 1')).not.toBeNull();
    expect(screen.getAllByText('05-03-2026').length).toBe(2);
    const q = lastList(api);
    expect(q.get('page')).toBe('1');
    expect(q.get('pageSize')).toBe('20');
    expect(q.get('search')).toBeNull();
  });

  it('shows the supplier after item information and a dash for rows without a supplier', async () => {
    setup();
    const first = (await screen.findByText('Triplex 1')).closest('tr')!;
    const second = screen.getByText('Triplex 2').closest('tr')!;
    expect(screen.getAllByRole('columnheader').slice(1).map((cell) => cell.textContent))
      .toEqual(['No', 'Tanggal', 'Informasi Barang', 'Supplier', 'Jml Kedatangan', 'Jml Rekap']);
    expect(within(first).getAllByRole('cell').slice(4).map((cell) => cell.textContent)).toEqual(['PT Kayu', '10', '12']);
    expect(within(second).getAllByRole('cell')[4].textContent).toBe('-');
    expect(within(second).queryByText('Budi')).toBeNull();
  });

  it('shows empty state and API error', async () => {
    setup({}, paged([]));
    const message = await screen.findByText('Data tidak ditemukan untuk filter tersebut.');
    expect(message.closest('td')?.colSpan).toBe(7);
  });

  it('shows API error message', async () => {
    setup({ 'GET /api/v1/inbound': fail(500, 'Server rusak') });
    const message = await screen.findByText(/Server rusak|Gagal memuat/);
    expect(message.closest('td')?.colSpan).toBe(7);
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
    fireEvent.change(dateSelect('Tanggal'), { target: { value: '05' } });
    await waitFor(() => expect(lastList(api).get('startDate')).toBe('2026-03-05'));
    expect(lastList(api).get('endDate')).toBe('2026-03-05');
    expect(lastList(api).get('page')).toBe('1');
  });

  it('counts active date filters on the Filter button', async () => {
    setup();
    await screen.findByText('Triplex 1');
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    fireEvent.change(dateSelect('Tahun'), { target: { value: '2026' } });
    expect(screen.getByRole('button', { name: 'Filter (1)' })).not.toBeNull();
    fireEvent.change(dateSelect('Bulan'), { target: { value: '03' } });
    expect(screen.getByRole('button', { name: 'Filter (2)' })).not.toBeNull();
  });

  it('search input has maxLength 100', async () => {
    setup();
    expect((screen.getByPlaceholderText(/Cari kode/) as HTMLInputElement).maxLength).toBe(100);
  });
});

describe('BarangMasuk toolbar', () => {
  it('keeps Barang Baru, Print and Filter without scan or return actions', async () => {
    const { api } = setup();
    await screen.findByText('Triplex 1');
    expect(screen.getByRole('button', { name: 'Barang Baru' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Print' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Filter' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Scan Barang' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Barang Kembali' })).toBeNull();
    expect(screen.queryByLabelText('Hasil scan')).toBeNull();
    expect(screen.queryByText('FORM BARANG KEMBALI')).toBeNull();
    expect(api.calls('GET /api/v1/tracking/spk')).toHaveLength(0);
  });
});

describe('BarangMasuk create inbound', () => {
  it('shows the supplier/date header, scan/manual actions and an empty material table without Status QC', async () => {
    setup();
    await openBaru({ supplier: false, manual: false });
    const dialog = formDialog();
    expect(within(dialog).getByRole('button', { name: 'Nama Supplier' })).not.toBeNull();
    expect(within(dialog).getByLabelText('Tanggal')).not.toBeNull();
    expect((within(dialog).getByRole('button', { name: 'Scan Barang' }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(dialog).getByRole('button', { name: 'Input Manual' }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(dialog).getByText('Pilih nama supplier dulu')).not.toBeNull();
    expect(within(dialog).queryByText('Status QC')).toBeNull();
    expect(within(dialog).getByText(/Barang masuk yang diinput adalah barang yang sudah lolos QC/)).not.toBeNull();
    expect(within(dialog).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['No', 'Nama Material', 'Satuan/Vol', 'Kode', 'Rekap Pembelian', 'Kedatangan', 'Hapus']);
    expect(within(dialog).getByText(/Belum ada barang/)).not.toBeNull();
    expect(within(dialog).getByText(/Waktu Sekarang/)).not.toBeNull();
  });

  it('validates supplier, date, at least one item and unfinished manual rows before preview', async () => {
    const { api } = setup();
    await openBaru({ supplier: false, manual: false });
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Nama supplier dan tanggal wajib diisi.')).not.toBeNull();
    await pickSupplier();
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Tambahkan minimal satu barang.')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Input Manual' }));
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Baris 1: pilih material terlebih dahulu.')).not.toBeNull();
    expect(api.calls(BATCH)).toHaveLength(0);
  });

  it('keeps digits only in quantity fields with maxLength 9', async () => {
    setup();
    await openBaru();
    for (const input of screen.getAllByPlaceholderText('0') as HTMLInputElement[]) {
      fireEvent.change(input, { target: { value: '1e-2.5' } });
      expect(input.value).toBe('125');
      expect(input.maxLength).toBe(9);
    }
  });

  it('previews every field before posting one batch with QC PASS and closes on confirmation', async () => {
    const { api } = setup();
    await openBaru();
    await fillBaru();
    fireEvent.change(screen.getByLabelText('Tanggal'), { target: { value: '2026-04-01' } });
    fireEvent.click(screen.getByText('Simpan'));
    const preview = previewDialog();
    expect(within(preview).getByText('PT Kayu')).not.toBeNull();
    expect(within(preview).getByText('01-04-2026')).not.toBeNull();
    for (const value of ['Triplex 1', 'BRG-1', 'lbr', '15', '20']) expect(within(tableRow('BRG-1')).getByText(value)).not.toBeNull();
    expect(api.calls(BATCH)).toHaveLength(0);
    confirm();
    await waitFor(() => expect(api.calls(BATCH)).toHaveLength(1));
    expect(api.calls(BATCH)[0].body).toEqual({ date: '2026-04-01', source: 'SUPPLIER', lines: [{ itemId: 1, qtyArrived: 15, qtyPurchased: 20, statusQc: 'PASS' }] });
    expect(api.calls(BATCH)[0].headers.get('Idempotency-Key')).toMatch(/^[\w-]{8,100}$/);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(api.calls('GET /api/v1/inbound').length).toBeGreaterThan(1));
    expect(api.calls('POST /api/v1/inbound')).toHaveLength(0);
    expect(api.calls('POST /api/v1/inbound/returns')).toHaveLength(0);
    expect(api.calls('GET /api/v1/tracking/spk')).toHaveLength(0);
  });

  it('posts the selected item ID when two materials share a name', async () => {
    const { api } = setup({ 'GET /api/v1/items': paged([{ ...firstItem, name: 'Triplex' }, { ...firstItem, id: 2, code: 'BRG-2', name: 'Triplex' }]) });
    await openBaru();
    await pickItem('Triplex (BRG-2)');
    fireEvent.change(arrived('Triplex'), { target: { value: '1' } });
    fireEvent.change(purchased('Triplex'), { target: { value: '1' } });
    fireEvent.click(screen.getByText('Simpan'));
    confirm();
    await waitFor(() => expect(api.calls(BATCH)).toHaveLength(1));
    expect(api.calls(BATCH)[0].body).toMatchObject({ lines: [{ itemId: 2, qtyArrived: 1, qtyPurchased: 1, statusQc: 'PASS' }] });
  });

  it('searches materials on the server within the chosen supplier', async () => {
    const { api } = setup();
    await openBaru();
    fireEvent.click(screen.getByRole('button', { name: 'Nama material baris 1' }));
    fireEvent.change(screen.getByLabelText('Cari Nama material baris 1'), { target: { value: 'Triplex 1' } });
    await waitFor(() => expect(api.calls('GET /api/v1/items').some((call) => call.query.get('search') === 'Triplex 1' && call.query.get('supplierId') === '7')).toBe(true));
    expect(api.calls('GET /api/v1/items').every((call) => call.query.get('pageSize') !== '100')).toBe(true);
  });

  it('surfaces an item load failure without discarding the form', async () => {
    setup({ 'GET /api/v1/items': fail(500, 'Items down') });
    await openBaru();
    expect(await screen.findByText('Items down')).not.toBeNull();
    expect(formDialog()).not.toBeNull();
  });

  it('shows backend errors in the preview, blocks duplicate saves and lets the user edit and retry', async () => {
    let release!: () => void;
    const gate = new Promise<void>((done) => { release = done; });
    const { api } = setup({ [BATCH]: fail(409, 'Konflik data') });
    const originalSave = inventoryApi.createInboundBatch;
    vi.spyOn(inventoryApi, 'createInboundBatch').mockImplementation(async (input, key) => { await gate; return originalSave(input, key); });
    await openBaru();
    await fillBaru();
    fireEvent.click(screen.getByText('Simpan'));
    const button = screen.getByRole('button', { name: 'Konfirmasi Simpan' });
    fireEvent.click(button);
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Kembali Edit' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Tutup' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);
    expect(inventoryApi.createInboundBatch).toHaveBeenCalledTimes(1);
    await act(async () => { release(); await gate; });
    expect(await screen.findByText('Konflik data')).not.toBeNull();
    expect(previewDialog()).not.toBeNull();
    expect((screen.getByRole('button', { name: 'Konfirmasi Simpan' }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Kembali Edit' }));
    expect(arrived().value).toBe('15');
    fireEvent.change(arrived(), { target: { value: '18' } });
    fireEvent.click(screen.getByText('Simpan'));
    confirm();
    await waitFor(() => expect(api.calls(BATCH)).toHaveLength(2));
    expect(api.calls(BATCH)[1].body).toMatchObject({ lines: [{ itemId: 1, qtyArrived: 18, qtyPurchased: 20, statusQc: 'PASS' }] });
    expect(api.calls(BATCH)[1].headers.get('Idempotency-Key')).not.toBe(api.calls(BATCH)[0].headers.get('Idempotency-Key'));
    expect(await screen.findByText('Konflik data')).not.toBeNull();
  });
});

describe('BarangMasuk preview', () => {
  it('preserves supplier, date and quantities when returning to edit and saves only the corrected preview', async () => {
    const { api } = setup({ 'GET /api/v1/items': paged([firstItem, scannedItem]) });
    await openBaru();
    await fillBaru();
    fireEvent.change(screen.getByLabelText('Tanggal'), { target: { value: '2026-11-12' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(within(previewDialog()).getByText('12-11-2026')).not.toBeNull();
    expect(api.calls(BATCH)).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Kembali Edit' }));
    expect(screen.getByRole('button', { name: 'Nama Supplier' }).textContent).toContain('PT Kayu');
    expect(arrived().value).toBe('15');
    expect(purchased().value).toBe('20');
    expect((screen.getByLabelText('Tanggal') as HTMLInputElement).value).toBe('2026-11-12');
    await pickItem('Paku (BRG-3)');
    fireEvent.change(arrived('Paku'), { target: { value: '7' } });
    fireEvent.change(purchased('Paku'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Tanggal'), { target: { value: '2026-11-13' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(within(previewDialog()).getByText('13-11-2026')).not.toBeNull();
    for (const value of ['BRG-3', 'Paku', '7', '0']) expect(within(tableRow('BRG-3')).getByText(value)).not.toBeNull();
    confirm();
    await waitFor(() => expect(api.calls(BATCH)).toHaveLength(1));
    expect(api.calls(BATCH)[0].body).toEqual({ date: '2026-11-13', source: 'SUPPLIER', lines: [{ itemId: 3, qtyArrived: 7, qtyPurchased: 0, statusQc: 'PASS' }] });
  });

  it.each(['0', '100001'])('rejects an arrival quantity of %s before preview', async (value) => {
    const { api } = setup();
    await openBaru();
    await fillBaru();
    fireEvent.change(arrived(), { target: { value } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByRole('alert').textContent).toContain('jumlah kedatangan harus antara 1 dan 100.000.');
    expect(screen.queryByRole('dialog', { name: 'PREVIEW BARANG MASUK' })).toBeNull();
    expect(api.calls(BATCH)).toHaveLength(0);
  });

  it('requires a date and rekap quantity before previewing Simpan + Cetak', async () => {
    const { api } = setup();
    await openBaru();
    await fillBaru();
    fireEvent.change(screen.getByLabelText('Tanggal'), { target: { value: '' } });
    fireEvent.click(screen.getByText('Simpan + Cetak'));
    expect(screen.getByText('Nama supplier dan tanggal wajib diisi.')).not.toBeNull();
    fireEvent.change(screen.getByLabelText('Tanggal'), { target: { value: '2026-11-12' } });
    fireEvent.change(purchased(), { target: { value: '' } });
    fireEvent.click(screen.getByText('Simpan + Cetak'));
    expect(screen.getByRole('alert').textContent).toContain('isi jumlah rekap pembelian');
    expect(screen.queryByRole('dialog', { name: 'PREVIEW BARANG MASUK' })).toBeNull();
    expect(api.calls(BATCH)).toHaveLength(0);
  });

  it('saves the whole batch and prints every item only after confirming the print preview', async () => {
    const print = vi.spyOn(printFormulir, 'cetakFormulir').mockResolvedValue(undefined);
    const { api } = setup({
      'GET /api/v1/items': paged([firstItem, scannedItem]),
      [BATCH]: { count: 2, items: [inbound(1), inbound(3, { itemName: 'Paku' })] },
      'GET /api/v1/items/1': firstItem,
      'GET /api/v1/items/3': scannedItem,
    });
    await openBaru();
    await fillBaru();
    fireEvent.click(screen.getByRole('button', { name: 'Input Manual' }));
    await pickItem('Paku (BRG-3)', 1);
    fireEvent.change(purchased('Paku'), { target: { value: '3' } });
    fireEvent.click(screen.getByText('Simpan + Cetak'));
    expect(previewDialog()).not.toBeNull();
    expect(api.calls(BATCH)).toHaveLength(0);
    expect(print).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Konfirmasi + Cetak' }));
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    expect(api.calls(BATCH)).toHaveLength(1);
    expect(print.mock.calls[0][0]).toHaveLength(2);
    expect(print.mock.calls[0][0][0]).toContain('SK PENERIMAAN BARANG');
    expect(print.mock.calls[0][0][0]).toContain('Triplex 1');
    expect(print.mock.calls[0][0][0]).toContain('lbr');
    expect(print.mock.calls[0][0][1]).toContain('Paku');
    expect(print.mock.calls[0][0][1]).toContain('pcs');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('BarangMasuk scan inside Barang Baru', () => {
  it('adds a scanned item outside the search results and previews it before saving with QC PASS', async () => {
    const { api } = setup({ 'GET /api/v1/items/by-code/BRG-3': scannedItem });
    await openBaru({ manual: false });
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barang' }));
    expect(document.activeElement).toBe(screen.getByLabelText('Hasil scan'));
    scan(' BRG-3 ');
    await screen.findByLabelText('Jumlah Sesuai Kedatangan Paku');
    expect(within(tableRow('BRG-3')).getByText('Paku')).not.toBeNull();
    expect(within(tableRow('BRG-3')).getByText('pcs')).not.toBeNull();
    expect(api.calls('GET /api/v1/items/by-code/BRG-3')).toHaveLength(1);
    expect(api.calls(BATCH)).toHaveLength(0);
    expect(screen.queryByRole('dialog', { name: 'PREVIEW BARANG MASUK' })).toBeNull();
    fireEvent.change(arrived('Paku'), { target: { value: '10' } });
    fireEvent.change(purchased('Paku'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Tanggal'), { target: { value: '2026-11-12' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(within(tableRow('BRG-3')).getByText('Paku')).not.toBeNull();
    confirm();
    await waitFor(() => expect(api.calls(BATCH)).toHaveLength(1));
    expect(api.calls(BATCH)[0].body).toEqual({ date: '2026-11-12', source: 'SUPPLIER', lines: [{ itemId: 3, qtyArrived: 10, qtyPurchased: 12, statusQc: 'PASS' }] });
  });

  it('reports unknown codes without changing existing rows and can add more materials manually', async () => {
    const { api } = setup({ 'GET /api/v1/items': paged([firstItem, scannedItem]), 'GET /api/v1/items/by-code/NOPE': fail(404, 'Item not found') });
    await openBaru();
    await fillBaru();
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barang' }));
    fireEvent.change(screen.getByLabelText('Hasil scan'), { target: { value: 'NOPE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Baca Kode' }));
    expect(await screen.findByText('Kode "NOPE" tidak dikenal.')).not.toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText('Hasil scan'));
    expect(arrived().value).toBe('15');
    fireEvent.click(screen.getByRole('button', { name: 'Input Manual' }));
    await pickItem('Paku (BRG-3)', 1);
    expect(within(tableRow('BRG-1')).getByRole('button', { name: 'Nama material Triplex 1' })).not.toBeNull();
    expect(arrived('Paku').value).toBe('1');
    expect(api.calls(BATCH)).toHaveLength(0);
  });

  it('keeps a pending scan when adding a manual row, without replacing the manual choice', async () => {
    let resolve!: (item: typeof scannedItem) => void;
    setup();
    vi.spyOn(inventoryApi, 'getItemByCode').mockReturnValue(new Promise((done) => { resolve = done; }));
    await openBaru({ manual: false });
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barang' }));
    scan('BRG-3');
    expect((screen.getByRole('button', { name: 'Simpan' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Input Manual' }));
    await pickItem();
    await act(async () => { resolve(scannedItem); });
    expect(arrived().value).toBe('1');
    expect(arrived('Paku').value).toBe('1');
    expect(within(formDialog()).getAllByRole('row')).toHaveLength(3);
  });

  it('ignores a scan from a closed form when Barang Baru is reopened', async () => {
    let resolve!: (item: typeof scannedItem) => void;
    setup();
    vi.spyOn(inventoryApi, 'getItemByCode').mockReturnValue(new Promise((done) => { resolve = done; }));
    await openBaru({ manual: false });
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barang' }));
    scan('BRG-3');
    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    await openBaru();
    await pickItem();
    await act(async () => { resolve(scannedItem); });
    expect(arrived().value).toBe('1');
    expect(screen.queryByLabelText('Jumlah Sesuai Kedatangan Paku')).toBeNull();
    expect(within(formDialog()).getAllByRole('row')).toHaveLength(2);
  });

  it('reads a camera scan and stops the camera before previewing, preserving rows for further editing', async () => {
    setup({ 'GET /api/v1/items/by-code/BRG-3': scannedItem });
    await openBaru({ manual: false });
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barang' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kamera' }));
    await waitFor(() => expect(qr.start).toHaveBeenCalledTimes(1));
    act(() => { qr.onScan!({ data: 'BRG-3' }); });
    await screen.findByLabelText('Jumlah Sesuai Kedatangan Paku');
    fireEvent.change(arrived('Paku'), { target: { value: '3' } });
    fireEvent.change(purchased('Paku'), { target: { value: '4' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(previewDialog()).not.toBeNull();
    expect(qr.stop).toHaveBeenCalled();
    expect(qr.destroy).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Kembali Edit' }));
    expect(arrived('Paku').value).toBe('3');
    expect(screen.getByRole('button', { name: 'Kamera' })).not.toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText('Hasil scan'));
    fireEvent.click(screen.getByRole('button', { name: 'Input Manual' }));
    await pickItem();
    expect(arrived().value).toBe('1');
    expect(arrived('Paku').value).toBe('3');
  });

  it('reports a camera failure and still allows manual input', async () => {
    qr.start.mockRejectedValueOnce(new Error('Camera denied'));
    setup();
    await openBaru({ manual: false });
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barang' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kamera' }));
    expect(await screen.findByText('Kamera tidak bisa dibuka. Periksa izin kamera di browser.')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Kamera' }).getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Input Manual' }));
    await pickItem();
    expect(within(tableRow('BRG-1')).getByRole('button', { name: 'Nama material Triplex 1' })).not.toBeNull();
  });
});

describe('BarangMasuk multiple materials and suppliers', () => {
  it('combines manual input and repeat scans into one batch without duplicate materials', async () => {
    const { api } = setup({ 'GET /api/v1/items/by-code/BRG-3': scannedItem });
    await openBaru();
    await fillBaru();
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barang' }));
    scan('BRG-3');
    await screen.findByLabelText('Jumlah Sesuai Kedatangan Paku');
    scan('BRG-3');
    expect(arrived('Paku').value).toBe('2');
    scan('BRG-1');
    expect(arrived().value).toBe('16');
    fireEvent.change(purchased('Paku'), { target: { value: '5' } });
    expect(api.calls('GET /api/v1/items/by-code/BRG-3')).toHaveLength(1);
    expect(api.calls('GET /api/v1/items/by-code/BRG-1')).toHaveLength(0);
    expect(within(formDialog()).getAllByRole('row')).toHaveLength(3);
    fireEvent.click(screen.getByText('Simpan'));
    expect(within(tableRow('BRG-1')).getByText('16')).not.toBeNull();
    expect(within(tableRow('BRG-3')).getAllByRole('cell')[5].textContent).toBe('2');
    expect(api.calls(BATCH)).toHaveLength(0);
    confirm();
    await waitFor(() => expect(api.calls(BATCH)).toHaveLength(1));
    expect(api.calls(BATCH)[0].body).toMatchObject({ source: 'SUPPLIER', lines: [
      { itemId: 1, qtyArrived: 16, qtyPurchased: 20, statusQc: 'PASS' },
      { itemId: 3, qtyArrived: 2, qtyPurchased: 5, statusQc: 'PASS' },
    ] });
    expect(api.calls('POST /api/v1/inbound')).toHaveLength(0);
  });

  it('counts concurrent scans of the same new material without losing a scan', async () => {
    const resolvers: Array<(item: typeof scannedItem) => void> = [];
    setup();
    vi.spyOn(inventoryApi, 'getItemByCode').mockImplementation(() => new Promise((done) => { resolvers.push(done); }));
    await openBaru({ manual: false });
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barang' }));
    scan('BRG-3');
    scan('BRG-3');
    expect(resolvers).toHaveLength(2);
    await act(async () => { resolvers[1](scannedItem); });
    expect(arrived('Paku').value).toBe('1');
    expect((screen.getByRole('button', { name: 'Simpan' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { resolvers[0](scannedItem); });
    expect(arrived('Paku').value).toBe('2');
    expect(within(formDialog()).getAllByRole('row')).toHaveLength(2);
    expect((screen.getByRole('button', { name: 'Simpan' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('rejects duplicate manual choices and lets users adjust, remove and renumber rows', async () => {
    const { api } = setup({ 'GET /api/v1/items': paged([firstItem, scannedItem]) });
    await openBaru();
    await fillBaru();
    fireEvent.click(screen.getByRole('button', { name: 'Input Manual' }));
    await pickItem('Triplex 1 (BRG-1)', 1);
    expect(screen.getByRole('alert').textContent).toContain('sudah ada di baris 1');
    fireEvent.click(screen.getByRole('button', { name: 'Hapus baris 2' }));
    fireEvent.change(arrived(), { target: { value: '1' } });
    expect((screen.getByRole('button', { name: 'Kurangi Triplex 1' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Tambah Triplex 1' }));
    expect(arrived().value).toBe('2');
    fireEvent.click(screen.getByRole('button', { name: 'Kurangi Triplex 1' }));
    expect(arrived().value).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: 'Input Manual' }));
    await pickItem('Paku (BRG-3)', 1);
    fireEvent.change(purchased('Paku'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Hapus Triplex 1' }));
    expect(tableRow('BRG-3').querySelector('td')?.textContent).toBe('1');
    fireEvent.click(screen.getByText('Simpan'));
    confirm();
    await waitFor(() => expect(api.calls(BATCH)).toHaveLength(1));
    expect(api.calls(BATCH)[0].body).toMatchObject({ lines: [{ itemId: 3, qtyArrived: 1, qtyPurchased: 0, statusQc: 'PASS' }] });
  });

  it('searches suppliers on the server and reports supplier load errors', async () => {
    const { api } = setup({ 'GET /api/v1/suppliers': fail(500, 'Suppliers down') });
    await openBaru({ supplier: false, manual: false });
    expect(await screen.findByText('Suppliers down')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Nama Supplier' }));
    fireEvent.change(screen.getByLabelText('Cari Nama Supplier'), { target: { value: 'Kayu' } });
    await waitFor(() => expect(api.calls('GET /api/v1/suppliers').some((call) => call.query.get('search') === 'Kayu' && call.query.get('pageSize') === '50')).toBe(true));
    expect(api.calls(BATCH)).toHaveLength(0);
  });

  it('rejects scanned and manually selected materials from another supplier', async () => {
    const other = { ...scannedItem, supplierId: 8, supplierName: 'PT Besi' };
    const { api } = setup({ 'GET /api/v1/items': paged([firstItem, other]), 'GET /api/v1/items/by-code/BRG-3': other });
    await openBaru();
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barang' }));
    scan('BRG-3');
    expect(await screen.findByText('Barang "Paku" bukan dari supplier yang dipilih.')).not.toBeNull();
    expect(screen.queryByLabelText('Jumlah Sesuai Kedatangan Paku')).toBeNull();
    fireEvent.change(screen.getByLabelText('Hasil scan'), { target: { value: '' } });
    await pickItem('Paku (BRG-3)');
    expect(screen.getByRole('alert').textContent).toContain('bukan dari supplier yang dipilih');
    expect(screen.queryByLabelText('Jumlah Sesuai Kedatangan Paku')).toBeNull();
    expect(api.calls(BATCH)).toHaveLength(0);
  });

  it('keeps rows after a supplier correction and blocks saving until their materials match', async () => {
    const other = { ...scannedItem, supplierId: 8, supplierName: 'PT Besi' };
    const { api } = setup({ 'GET /api/v1/items': paged([firstItem, other]) });
    await openBaru();
    await fillBaru();
    await pickSupplier('PT Besi');
    expect(arrived().value).toBe('15');
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByRole('alert').textContent).toContain('barang bukan dari supplier yang dipilih');
    expect(api.calls(BATCH)).toHaveLength(0);
    await pickItem('Paku (BRG-3)');
    expect(arrived('Paku').value).toBe('15');
    fireEvent.click(screen.getByText('Simpan'));
    expect(within(previewDialog()).getByText('PT Besi')).not.toBeNull();
    confirm();
    await waitFor(() => expect(api.calls(BATCH)).toHaveLength(1));
    expect(api.calls(BATCH)[0].body).toMatchObject({ lines: [{ itemId: 3, qtyArrived: 15, qtyPurchased: 20, statusQc: 'PASS' }] });
  });

  it('ignores pending scans after the supplier changes', async () => {
    let resolve!: (item: typeof scannedItem) => void;
    setup();
    vi.spyOn(inventoryApi, 'getItemByCode').mockReturnValue(new Promise((done) => { resolve = done; }));
    await openBaru({ manual: false });
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barang' }));
    scan('BRG-3');
    await pickSupplier('PT Besi');
    await act(async () => { resolve(scannedItem); });
    expect(within(formDialog()).getByText(/Belum ada barang/)).not.toBeNull();
    expect(screen.queryByLabelText('Hasil scan')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('reuses the same key and body when retrying a failed batch', async () => {
    let count = 0;
    const { api } = setup({ [BATCH]: () => ++count === 1 ? fail(500, 'Coba lagi') : batchSuccess });
    await openBaru();
    await fillBaru();
    fireEvent.click(screen.getByText('Simpan'));
    confirm();
    expect(await screen.findByText('Coba lagi')).not.toBeNull();
    confirm();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(api.calls(BATCH)).toHaveLength(2);
    expect(api.calls(BATCH)[0].body).toEqual(api.calls(BATCH)[1].body);
    expect(api.calls(BATCH)[0].headers.get('Idempotency-Key')).toBe(api.calls(BATCH)[1].headers.get('Idempotency-Key'));
  });

  it('shows per-line batch errors with the material name and leaves every row available for editing', async () => {
    setup({ 'GET /api/v1/items': paged([firstItem, scannedItem]), [BATCH]: fail(400, 'Validation failed', { 'lines.1.itemId': ['Supplier tidak cocok'] }) });
    await openBaru();
    await fillBaru();
    fireEvent.click(screen.getByRole('button', { name: 'Input Manual' }));
    await pickItem('Paku (BRG-3)', 1);
    fireEvent.change(purchased('Paku'), { target: { value: '4' } });
    fireEvent.click(screen.getByText('Simpan'));
    confirm();
    expect(await screen.findByText('Paku: Supplier tidak cocok')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Kembali Edit' }));
    expect(arrived().value).toBe('15');
    expect(purchased('Paku').value).toBe('4');
    expect(within(formDialog()).getAllByRole('row')).toHaveLength(3);
  });
});

describe('BarangMasuk removed return flow', () => {
  it('opens and closes Barang Baru without return fields or SPK requests', async () => {
    const { api } = setup();
    await openBaru();
    expect(screen.queryByLabelText('SPK')).toBeNull();
    expect(screen.queryByText('FORM BARANG KEMBALI')).toBeNull();
    expect(screen.getAllByPlaceholderText('0')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    expect(screen.queryByText('FORM BARANG MASUK')).toBeNull();
    expect(screen.getByText('Triplex 1')).not.toBeNull();
    expect(api.calls('GET /api/v1/tracking/spk')).toHaveLength(0);
    expect(api.calls('POST /api/v1/inbound/returns')).toHaveLength(0);
  });
});

const who = (permissions: string[], isSuperadmin = false) => ({ id: 1, username: 'u', email: 'u@x.id', roleId: 2, roleName: 'Staff', isSuperadmin, permissions });

describe('permissions', () => {
  const open = async (user: ReturnType<typeof who>) => {
    installFakeApi({ 'GET /api/v1/inbound': paged([inbound(1)]), 'GET /api/v1/items': items, 'GET /api/v1/suppliers': suppliers });
    render(<AuthUserProvider user={user}><BarangMasuk /></AuthUserProvider>);
    await screen.findAllByText('Triplex 1');
    expect(screen.queryByRole('button', { name: 'Scan Barang' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Barang Kembali' })).toBeNull();
  };

  it('hides mutation buttons from a view-only user but keeps the list', async () => {
    await open(who([]));
    expect(screen.queryByText('Barang Baru')).toBeNull();
  });

  it('shows Barang Baru to a user with the permission', async () => {
    await open(who(['inbound.create']));
    expect(screen.getByText('Barang Baru')).not.toBeNull();
  });

  it('shows Barang Baru to a superadmin', async () => {
    await open(who([], true));
    expect(screen.getByText('Barang Baru')).not.toBeNull();
  });
});
