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
const poLine = (id: number, itemId: number, over: Record<string, unknown> = {}) => ({
  id, lineIndex: itemId - 1, itemId, noSpk: `SPK-${itemId}`, kodeBarang: `BRG-${itemId}`,
  namaBarang: itemId === 3 ? 'Paku' : `Triplex ${itemId}`, satuan: itemId === 3 ? 'pcs' : 'lbr',
  jumlah: itemId === 3 ? 12 : 20, hargaSatuan: 1000, diskon: 0, qtyReceived: 0,
  sisa: itemId === 3 ? 12 : 20, receipts: [], ...over,
});
const poDetail = (id: number, supplierName: string, barang: unknown[], over: Record<string, unknown> = {}) => ({
  id, nomorPo: `PO-${id}`, approvalRequestId: null, tanggalPo: '2026-03-01', supplierId: supplierName === 'PT Kayu' ? 7 : 8,
  supplierName, status: id === 101 ? 'ISSUED' : 'PARTIALLY_RECEIVED', barang, ...over,
});
const po101 = poDetail(101, 'PT Kayu', [poLine(11, 1), poLine(12, 3)]);
const po102 = poDetail(102, 'PT Besi', [poLine(21, 2, { namaBarang: 'Triplex 2', sisa: 5, jumlah: 5 })]);
const poList = paged([
  { id: 101, nomorPo: 'PO-101', supplierName: 'PT Kayu', status: 'ISSUED' },
  { id: 102, nomorPo: 'PO-102', supplierName: 'PT Besi', status: 'PARTIALLY_RECEIVED' },
]);
const batchSuccess = { count: 1, items: [inbound(1)] };
const BATCH = 'POST /api/v1/inbound/batch';
const PO_LIST = 'GET /api/v1/purchase-orders';

function setup(extra: Record<string, unknown> = {}, rows: unknown = paged([inbound(1), inbound(2, { supplierName: null, source: 'KLIEN', clientName: 'Budi' })])) {
  const api = installFakeApi({
    'GET /api/v1/inbound': rows, 'GET /api/v1/items': items, 'GET /api/v1/suppliers': suppliers,
    [PO_LIST]: poList, 'GET /api/v1/purchase-orders/101': po101, 'GET /api/v1/purchase-orders/102': po102,
    [BATCH]: batchSuccess, ...extra,
  });
  const view = render(<BarangMasuk />);
  return { api, view };
}
const lastList = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/inbound').at(-1)!.query;
// DateFilter selects have no label; pick each one by its placeholder option (Tanggal / Bulan / Tahun).
const dateSelect = (placeholder: string) => screen.getByRole('option', { name: placeholder }).closest('select') as HTMLSelectElement;
const formDialog = () => screen.getByRole('dialog', { name: 'FORM BARANG MASUK' });
const previewDialog = () => screen.getByRole('dialog', { name: 'PREVIEW BARANG MASUK' });
const arrived = (name = 'Triplex 1') => screen.getByLabelText(`Jumlah Sesuai Kedatangan ${name}`) as HTMLInputElement;
const tableRow = (code: string) => within(screen.getByRole('dialog')).getByText(code).closest('tr')!;

async function pickPo(name = 'PO-101 — PT Kayu') {
  fireEvent.click(screen.getByRole('button', { name: 'Nomor PO' }));
  fireEvent.click(await screen.findByRole('option', { name }));
}
async function openBaru({ pilihPo = true, manual = true } = {}) {
  await screen.findByText('Triplex 1');
  fireEvent.click(screen.getByText('Barang Baru'));
  await screen.findByText('FORM BARANG MASUK');
  if (pilihPo) await pickPo();
  if (manual) fireEvent.click(screen.getByRole('button', { name: 'Input Manual' }));
}
async function pickItem(name = 'Triplex 1 (BRG-1) · SPK-1', index = 0) {
  fireEvent.click(within(formDialog()).getAllByRole('button', { name: /^Nama material/ })[index]);
  fireEvent.click(await screen.findByRole('option', { name }));
}
async function fillBaru() {
  await pickItem();
  fireEvent.change(arrived(), { target: { value: '15' } });
}
const scan = (code: string) => {
  const input = screen.getByLabelText('Hasil scan');
  fireEvent.change(input, { target: { value: code } });
  fireEvent.keyDown(input, { key: 'Enter' });
};
const confirm = () => fireEvent.click(screen.getByRole('button', { name: 'Konfirmasi Simpan' }));
const line1 = (qtyArrived: number, over = {}) => ({ itemId: 1, purchaseOrderId: 101, purchaseOrderLineId: 11, qtyArrived, qtyPurchased: 20, statusQc: 'PASS', ...over });

describe('BarangMasuk list', () => {
  it('shows rows incl. return rows and loads every page with pageSize 100', async () => {
    const { api } = setup();
    expect(screen.getByText('Memuat data...').closest('td')?.colSpan).toBe(7);
    expect(await screen.findByText('Triplex 1')).not.toBeNull();
    expect(screen.getAllByText('05-03-2026').length).toBe(2);
    const q = lastList(api);
    expect(q.get('page')).toBe('1');
    expect(q.get('pageSize')).toBe('100');
    expect(q.get('search')).toBeNull();
    expect(screen.queryByText('Selanjutnya')).toBeNull();
  });

  it('loads every page of inbound rows', async () => {
    const { api } = setup({}, (req: { query: URLSearchParams }) => ({
      rows: req.query.get('page') === '2' ? [inbound(101)] : [inbound(1)],
      total: 150,
    }));
    await screen.findByText('Triplex 1');
    await screen.findByText('Triplex 101');
    expect(api.calls('GET /api/v1/inbound').some((call) => call.query.get('page') === '2')).toBe(true);
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

  it('sends search + date filters', async () => {
    const { api } = setup({}, paged([inbound(1)], { total: 45 }));
    await screen.findByText('Triplex 1');
    fireEvent.change(screen.getByPlaceholderText(/Cari kode/), { target: { value: 'kayu' } });
    await waitFor(() => expect(lastList(api).get('search')).toBe('kayu'));

    fireEvent.click(screen.getByRole('button', { name: /^Filter/ }));
    fireEvent.change(dateSelect('Tahun'), { target: { value: '2026' } });
    fireEvent.change(dateSelect('Bulan'), { target: { value: '03' } });
    fireEvent.change(dateSelect('Tanggal'), { target: { value: '05' } });
    await waitFor(() => expect(lastList(api).get('startDate')).toBe('2026-03-05'));
    expect(lastList(api).get('endDate')).toBe('2026-03-05');
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
  it('shows the PO/date header, scan/manual actions and an empty material table without Status QC', async () => {
    setup();
    await openBaru({ pilihPo: false, manual: false });
    const dialog = formDialog();
    expect(within(dialog).getByRole('button', { name: 'Nomor PO' })).not.toBeNull();
    expect(within(dialog).getByLabelText('Tanggal')).not.toBeNull();
    expect((within(dialog).getByRole('button', { name: 'Scan Barang' }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(dialog).getByRole('button', { name: 'Input Manual' }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(dialog).getByText('Pilih PO dulu')).not.toBeNull();
    expect(within(dialog).queryByText('Status QC')).toBeNull();
    expect(within(dialog).getByText(/Barang masuk yang diinput adalah barang yang sudah lolos QC/)).not.toBeNull();
    expect(within(dialog).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['No', 'Nama Material', 'Satuan/Vol', 'Kode', 'Rekap Pembelian', 'Kedatangan', 'Hapus']);
    expect(within(dialog).getByText(/Belum ada barang/)).not.toBeNull();
    expect(within(dialog).getByText(/Waktu Sekarang/)).not.toBeNull();
  });

  it('opens and closes Barang Baru without return fields or SPK requests', async () => {
    const { api } = setup();
    await openBaru({ pilihPo: false, manual: false });
    expect(screen.queryByLabelText('SPK')).toBeNull();
    expect(screen.queryByText('FORM BARANG KEMBALI')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    expect(screen.queryByText('FORM BARANG MASUK')).toBeNull();
    expect(screen.getByText('Triplex 1')).not.toBeNull();
    expect(api.calls('GET /api/v1/tracking/spk')).toHaveLength(0);
    expect(api.calls(BATCH)).toHaveLength(0);
  });

  it('loads only submitted POs and reports a PO load failure', async () => {
    const { api } = setup();
    await openBaru();
    expect(api.calls(PO_LIST).some((call) => call.query.get('status') === 'ISSUED')).toBe(true);
    expect(api.calls(PO_LIST).some((call) => call.query.get('status') === 'PARTIALLY_RECEIVED')).toBe(true);
    expect(api.calls('GET /api/v1/purchase-orders/101')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Nomor PO' }));
    expect(await screen.findByRole('option', { name: 'PO-102 — PT Besi' })).not.toBeNull();
  });

  it('does not offer DRAFT or CANCELLED purchase orders for receiving', async () => {
    setup({
      [PO_LIST]: paged([
        { id: 104, nomorPo: 'PO-104', supplierName: 'PT Kayu', status: 'DRAFT' },
        { id: 105, nomorPo: 'PO-105', supplierName: 'PT Besi', status: 'CANCELLED' },
        poList.rows[0],
      ]),
      'GET /api/v1/purchase-orders/104': poDetail(104, 'PT Kayu', [poLine(41, 1)], { status: 'DRAFT' }),
      'GET /api/v1/purchase-orders/105': poDetail(105, 'PT Besi', [poLine(51, 2)], { status: 'CANCELLED' }),
    });
    await screen.findByText('Triplex 1');
    fireEvent.click(screen.getByText('Barang Baru'));
    await screen.findByText('FORM BARANG MASUK');
    fireEvent.click(screen.getByRole('button', { name: 'Nomor PO' }));
    expect(await screen.findByRole('option', { name: 'PO-101 — PT Kayu' })).not.toBeNull();
    expect(screen.queryByRole('option', { name: 'PO-104 — PT Kayu' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'PO-105 — PT Besi' })).toBeNull();
  });

  it('surfaces a PO load failure without discarding the form', async () => {
    setup({ [PO_LIST]: fail(500, 'PO down') });
    await screen.findByText('Triplex 1');
    fireEvent.click(screen.getByText('Barang Baru'));
    expect(await screen.findByText('PO down')).not.toBeNull();
    expect(formDialog()).not.toBeNull();
  });

  it('validates PO, date, at least one item and unfinished manual rows before preview', async () => {
    const { api } = setup();
    await openBaru({ pilihPo: false, manual: false });
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Nomor PO dan tanggal wajib diisi.')).not.toBeNull();
    await pickPo();
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Tambahkan minimal satu barang.')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Input Manual' }));
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Baris 1: pilih material terlebih dahulu.')).not.toBeNull();
    expect(api.calls(BATCH)).toHaveLength(0);
  });

  it('accepts comma decimals and rejects invalid characters on arrival quantity', async () => {
    setup();
    await openBaru();
    await fillBaru();
    const input = arrived();
    expect(input.inputMode).toBe('decimal');
    fireEvent.change(input, { target: { value: '1,125' } });
    expect(input.value).toBe('1,125');
    for (const value of ['1e2', '-2', '1.5', '1,2,3', '1,1234']) {
      fireEvent.change(input, { target: { value } });
      expect(input.value).toBe('1,125');
      expect(input.getAttribute('aria-invalid')).toBe('true');
    }
    fireEvent.change(input, { target: { value: '0,5' } });
    expect(input.getAttribute('aria-invalid')).toBe('false');
  });

  it('previews comma decimals and sends numeric decimal quantities in the batch', async () => {
    const { api } = setup();
    await openBaru();
    await fillBaru();
    fireEvent.change(arrived(), { target: { value: '0,125' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(within(tableRow('BRG-1')).getByText('0,125')).not.toBeNull();
    expect(within(tableRow('BRG-1')).getByText('20')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Kembali Edit' }));
    expect(arrived().value).toBe('0,125');
    fireEvent.click(screen.getByText('Simpan'));
    confirm();
    await waitFor(() => expect(api.calls(BATCH)).toHaveLength(1));
    expect(api.calls(BATCH)[0].body).toMatchObject({ lines: [line1(0.125)] });
  });

  it('increments decimals by one and clamps buttons and repeated scans at the PO line remainder', async () => {
    setup();
    await openBaru();
    await fillBaru();
    fireEvent.change(arrived(), { target: { value: '1,125' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah Triplex 1' }));
    expect(arrived().value).toBe('2,125');
    fireEvent.click(screen.getByRole('button', { name: 'Kurangi Triplex 1' }));
    expect(arrived().value).toBe('1,125');
    fireEvent.change(arrived(), { target: { value: '19,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah Triplex 1' }));
    expect(arrived().value).toBe('20');
    fireEvent.change(arrived(), { target: { value: '19,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barang' }));
    scan('BRG-1');
    expect(arrived().value).toBe('20');
    expect((screen.getByRole('button', { name: 'Tambah Triplex 1' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('previews every field before posting one batch with QC PASS and closes on confirmation', async () => {
    const { api } = setup();
    await openBaru();
    await fillBaru();
    fireEvent.change(screen.getByLabelText('Tanggal'), { target: { value: '2026-04-01' } });
    fireEvent.click(screen.getByText('Simpan'));
    const preview = previewDialog();
    expect(within(preview).getByText(/PT Kayu/)).not.toBeNull();
    expect(within(preview).getByText('01-04-2026')).not.toBeNull();
    for (const value of ['Triplex 1', 'BRG-1', 'lbr', '15', '20']) expect(within(tableRow('BRG-1')).getByText(value)).not.toBeNull();
    expect(api.calls(BATCH)).toHaveLength(0);
    confirm();
    await waitFor(() => expect(api.calls(BATCH)).toHaveLength(1));
    expect(api.calls(BATCH)[0].body).toEqual({ date: '2026-04-01', source: 'SUPPLIER', lines: [line1(15)] });
    expect(api.calls(BATCH)[0].headers.get('Idempotency-Key')).toMatch(/^[\w-]{8,100}$/);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(api.calls('GET /api/v1/inbound').length).toBeGreaterThan(1));
    expect(api.calls('POST /api/v1/inbound')).toHaveLength(0);
    expect(api.calls('POST /api/v1/inbound/returns')).toHaveLength(0);
    expect(api.calls('GET /api/v1/tracking/spk')).toHaveLength(0);
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
    expect(api.calls(BATCH)[1].body).toMatchObject({ lines: [line1(18)] });
    expect(api.calls(BATCH)[1].headers.get('Idempotency-Key')).not.toBe(api.calls(BATCH)[0].headers.get('Idempotency-Key'));
    expect(await screen.findByText('Konflik data')).not.toBeNull();
  });
});

describe('BarangMasuk preview', () => {
  it('preserves PO, date and quantities when returning to edit and saves only the corrected preview', async () => {
    const { api } = setup();
    await openBaru();
    await fillBaru();
    fireEvent.change(screen.getByLabelText('Tanggal'), { target: { value: '2026-11-12' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(within(previewDialog()).getByText('12-11-2026')).not.toBeNull();
    expect(api.calls(BATCH)).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Kembali Edit' }));
    expect(screen.getByRole('button', { name: 'Nomor PO' }).textContent).toContain('PO-101');
    expect(arrived().value).toBe('15');
    expect(screen.getByLabelText('Tanggal')).toBeTruthy();
    expect((screen.getByLabelText('Tanggal') as HTMLInputElement).value).toBe('2026-11-12');
    fireEvent.click(screen.getByRole('button', { name: 'Input Manual' }));
    await pickItem('Paku (BRG-3) · SPK-3', 1);
    fireEvent.change(arrived('Paku'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Tanggal'), { target: { value: '2026-11-13' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(within(previewDialog()).getByText('13-11-2026')).not.toBeNull();
    for (const value of ['BRG-3', 'Paku', '7', '12']) expect(within(tableRow('BRG-3')).getByText(value)).not.toBeNull();
    confirm();
    await waitFor(() => expect(api.calls(BATCH)).toHaveLength(1));
    expect(api.calls(BATCH)[0].body).toEqual({ date: '2026-11-13', source: 'SUPPLIER', lines: [
      line1(15),
      { itemId: 3, purchaseOrderId: 101, purchaseOrderLineId: 12, qtyArrived: 7, qtyPurchased: 12, statusQc: 'PASS' },
    ] });
  });

  it.each(['0', '100001'])('rejects an arrival quantity of %s before preview', async (value) => {
    const { api } = setup();
    await openBaru();
    await fillBaru();
    fireEvent.change(arrived(), { target: { value } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText(`Baris 1 (Triplex 1): ${value === '0' ? 'Harus lebih dari 0.' : 'Maksimal 100.000.'}`)).not.toBeNull();
    expect(screen.queryByRole('dialog', { name: 'PREVIEW BARANG MASUK' })).toBeNull();
    expect(api.calls(BATCH)).toHaveLength(0);
  });

  it('rejects an arrival quantity above the PO line remainder', async () => {
    const { api } = setup();
    await openBaru();
    await fillBaru();
    fireEvent.change(arrived(), { target: { value: '21' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Baris 1 (Triplex 1): jumlah kedatangan melebihi sisa PO (20).')).not.toBeNull();
    expect(api.calls(BATCH)).toHaveLength(0);
  });

  it('requires a date before previewing Simpan + Cetak', async () => {
    const { api } = setup();
    await openBaru();
    await fillBaru();
    fireEvent.change(screen.getByLabelText('Tanggal'), { target: { value: '' } });
    fireEvent.click(screen.getByText('Simpan + Cetak'));
    expect(screen.getByText('Nomor PO dan tanggal wajib diisi.')).not.toBeNull();
    expect(screen.queryByRole('dialog', { name: 'PREVIEW BARANG MASUK' })).toBeNull();
    expect(api.calls(BATCH)).toHaveLength(0);
  });

  it('saves the whole batch and prints every item only after confirming the print preview', async () => {
    const print = vi.spyOn(printFormulir, 'cetakFormulir').mockResolvedValue(undefined);
    const { api } = setup({
      [BATCH]: { count: 2, items: [inbound(1), inbound(3, { itemName: 'Paku' })] },
      'GET /api/v1/items/1': firstItem,
      'GET /api/v1/items/3': scannedItem,
    });
    await openBaru();
    await fillBaru();
    fireEvent.click(screen.getByRole('button', { name: 'Input Manual' }));
    await pickItem('Paku (BRG-3) · SPK-3', 1);
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
  it('adds an item from the selected PO line and previews it before saving with QC PASS', async () => {
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
    fireEvent.change(screen.getByLabelText('Tanggal'), { target: { value: '2026-11-12' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(within(tableRow('BRG-3')).getByText('Paku')).not.toBeNull();
    confirm();
    await waitFor(() => expect(api.calls(BATCH)).toHaveLength(1));
    expect(api.calls(BATCH)[0].body).toEqual({ date: '2026-11-12', source: 'SUPPLIER', lines: [
      { itemId: 3, purchaseOrderId: 101, purchaseOrderLineId: 12, qtyArrived: 10, qtyPurchased: 12, statusQc: 'PASS' },
    ] });
  });

  it('reports unknown codes and items outside the selected PO without changing rows', async () => {
    const { api } = setup({ 'GET /api/v1/items/by-code/NOPE': fail(404, 'Item not found'), 'GET /api/v1/items/by-code/BRG-1': firstItem });
    await openBaru();
    await fillBaru();
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barang' }));
    fireEvent.change(screen.getByLabelText('Hasil scan'), { target: { value: 'NOPE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Baca Kode' }));
    expect(await screen.findByText('Kode "NOPE" tidak dikenal.')).not.toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText('Hasil scan'));
    expect(arrived().value).toBe('15');
    await pickPo('PO-102 — PT Besi');
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barang' }));
    scan('BRG-1');
    expect(await screen.findByText('Barang "Triplex 1" tidak ada di PO yang dipilih.')).not.toBeNull();
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
    expect(within(formDialog()).getByRole('button', { name: 'Nama material Triplex 1' })).not.toBeNull();
  });
});

describe('BarangMasuk multiple PO lines in one batch', () => {
  it('posts the exact PO line ID when two lines share a material name', async () => {
    const { api } = setup({
      [PO_LIST]: paged([{ id: 103, nomorPo: 'PO-103', supplierName: 'PT Kayu', status: 'ISSUED' }]),
      'GET /api/v1/purchase-orders/103': poDetail(103, 'PT Kayu', [
        poLine(31, 1), poLine(32, 3, { namaBarang: 'Triplex 1' }),
      ]),
    });
    await screen.findByText('Triplex 1');
    fireEvent.click(screen.getByText('Barang Baru'));
    await screen.findByText('FORM BARANG MASUK');
    await pickPo('PO-103 — PT Kayu');
    fireEvent.click(screen.getByRole('button', { name: 'Input Manual' }));
    fireEvent.click(within(formDialog()).getAllByRole('button', { name: /^Nama material/ })[0]);
    fireEvent.click(await screen.findByRole('option', { name: 'Triplex 1 (BRG-3) · SPK-3' }));
    fireEvent.click(screen.getByText('Simpan'));
    confirm();
    await waitFor(() => expect(api.calls(BATCH)).toHaveLength(1));
    expect(api.calls(BATCH)[0].body).toEqual({ date: expect.any(String), source: 'SUPPLIER', lines: [
      { itemId: 3, purchaseOrderId: 103, purchaseOrderLineId: 32, qtyArrived: 1, qtyPurchased: 12, statusQc: 'PASS' },
    ] });
  });

  it('distinguishes PO lines that share an item code by their SPK', async () => {
    const { api } = setup({
      [PO_LIST]: paged([{ id: 103, nomorPo: 'PO-103', supplierName: 'PT Kayu', status: 'ISSUED' }]),
      'GET /api/v1/purchase-orders/103': poDetail(103, 'PT Kayu', [
        poLine(31, 1), poLine(32, 1, { kodeBarang: 'BRG-1', noSpk: 'SPK-9' }),
      ]),
    });
    await screen.findByText('Triplex 1');
    fireEvent.click(screen.getByText('Barang Baru'));
    await screen.findByText('FORM BARANG MASUK');
    await pickPo('PO-103 — PT Kayu');
    fireEvent.click(screen.getByRole('button', { name: 'Input Manual' }));
    fireEvent.click(within(formDialog()).getAllByRole('button', { name: /^Nama material/ })[0]);
    expect(await screen.findByRole('option', { name: 'Triplex 1 (BRG-1) · SPK-1' })).not.toBeNull();
    expect(screen.getByRole('option', { name: 'Triplex 1 (BRG-1) · SPK-9' })).not.toBeNull();
    fireEvent.click(screen.getByRole('option', { name: 'Triplex 1 (BRG-1) · SPK-9' }));
    fireEvent.click(screen.getByText('Simpan'));
    confirm();
    await waitFor(() => expect(api.calls(BATCH)).toHaveLength(1));
    expect(api.calls(BATCH)[0].body).toEqual({ date: expect.any(String), source: 'SUPPLIER', lines: [
      { itemId: 1, purchaseOrderId: 103, purchaseOrderLineId: 32, qtyArrived: 1, qtyPurchased: 20, statusQc: 'PASS' },
    ] });
  });

  it('combines manual input and repeat scans into one batch without duplicate lines', async () => {
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
      line1(16),
      { itemId: 3, purchaseOrderId: 101, purchaseOrderLineId: 12, qtyArrived: 2, qtyPurchased: 12, statusQc: 'PASS' },
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
    const { api } = setup();
    await openBaru();
    await fillBaru();
    fireEvent.click(screen.getByRole('button', { name: 'Input Manual' }));
    await pickItem('Triplex 1 (BRG-1) · SPK-1', 1);
    expect(screen.getByText('Barang "Triplex 1" sudah ada di baris 1. Ubah jumlah di baris tersebut.').getAttribute('role')).toBe('alert');
    fireEvent.click(within(within(formDialog()).getAllByRole('row')[2]).getByRole('button', { name: /^Hapus/ }));
    fireEvent.change(arrived(), { target: { value: '1' } });
    expect((screen.getByRole('button', { name: 'Kurangi Triplex 1' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Tambah Triplex 1' }));
    expect(arrived().value).toBe('2');
    fireEvent.click(screen.getByRole('button', { name: 'Kurangi Triplex 1' }));
    expect(arrived().value).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: 'Input Manual' }));
    await pickItem('Paku (BRG-3) · SPK-3', 1);
    fireEvent.click(screen.getByRole('button', { name: 'Hapus Triplex 1' }));
    expect(tableRow('BRG-3').querySelector('td')?.textContent).toBe('1');
    fireEvent.click(screen.getByText('Simpan'));
    confirm();
    await waitFor(() => expect(api.calls(BATCH)).toHaveLength(1));
    expect(api.calls(BATCH)[0].body).toMatchObject({ lines: [
      { itemId: 3, purchaseOrderId: 101, purchaseOrderLineId: 12, qtyArrived: 1, qtyPurchased: 12, statusQc: 'PASS' },
    ] });
  });

  it('lets the user switch PO so one batch mixes POs and shows both suppliers', async () => {
    const { api } = setup();
    await openBaru();
    await fillBaru();
    await pickPo('PO-102 — PT Besi');
    fireEvent.click(screen.getByRole('button', { name: 'Input Manual' }));
    await pickItem('Triplex 2 (BRG-2) · SPK-2', 1);
    expect(arrived('Triplex 2').value).toBe('1');
    fireEvent.click(screen.getByText('Simpan'));
    expect(within(previewDialog()).getByText(/PT Kayu, PT Besi/)).not.toBeNull();
    confirm();
    await waitFor(() => expect(api.calls(BATCH)).toHaveLength(1));
    expect(api.calls(BATCH)[0].body).toEqual({ date: expect.any(String), source: 'SUPPLIER', lines: [
      line1(15),
      { itemId: 2, purchaseOrderId: 102, purchaseOrderLineId: 21, qtyArrived: 1, qtyPurchased: 5, statusQc: 'PASS' },
    ] });
  });

  it('ignores pending scans after the selected PO changes', async () => {
    let resolve!: (item: typeof scannedItem) => void;
    setup();
    vi.spyOn(inventoryApi, 'getItemByCode').mockReturnValue(new Promise((done) => { resolve = done; }));
    await openBaru({ manual: false });
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barang' }));
    scan('BRG-3');
    await pickPo('PO-102 — PT Besi');
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
    setup({ [BATCH]: fail(400, 'Validation failed', { 'lines.1.itemId': ['Supplier tidak cocok'] }) });
    await openBaru();
    await fillBaru();
    fireEvent.click(screen.getByRole('button', { name: 'Input Manual' }));
    await pickItem('Paku (BRG-3) · SPK-3', 1);
    fireEvent.click(screen.getByText('Simpan'));
    confirm();
    expect(await screen.findByText('Paku: Supplier tidak cocok')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Kembali Edit' }));
    expect(arrived().value).toBe('15');
    expect(within(formDialog()).getAllByRole('row')).toHaveLength(3);
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

describe('BarangMasuk search', () => {
  it('sends one request for several quick keystrokes', async () => {
    const { api } = setup();
    await screen.findByText('Triplex 1');
    const before = api.calls('GET /api/v1/inbound').length;
    const input = screen.getByPlaceholderText(/Cari kode/);
    for (const v of ['T', 'Tr', 'Tri']) fireEvent.change(input, { target: { value: v } });
    expect(api.calls('GET /api/v1/inbound').length).toBe(before);
    await waitFor(() => expect(lastList(api).get('search')).toBe('Tri'));
    expect(api.calls('GET /api/v1/inbound').length).toBe(before + 1);
  });
});

describe('BarangMasuk selection', () => {
  it('keeps the checked rows when the filter changes and clears them on demand', async () => {
    setup();
    await screen.findByText('Triplex 1');
    const box = () => screen.getByLabelText('Centang Triplex 1') as HTMLInputElement;
    const header = () => screen.getByLabelText('Centang semua baris') as HTMLInputElement;
    fireEvent.click(box());
    expect(box().checked).toBe(true);
    expect(header().indeterminate).toBe(true);
    fireEvent.change(screen.getByPlaceholderText(/Cari kode/), { target: { value: 'Triplex' } });
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('1 baris dipilih'));
    expect(box().checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Bersihkan pilihan' }));
    expect(box().checked).toBe(false);
    expect(header().indeterminate).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
