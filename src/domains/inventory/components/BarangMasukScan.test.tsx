import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, fail, type FakeRequest } from '@/test/fake-api';
import BarangMasukScan from './BarangMasukScan';

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

const item = (id: number, code: string, name: string) => ({ id, code, name, unit: 'lbr', stock: 10, category: 'Lembaran', price: 0, locationId: 1, supplierId: 7 });
const routes = {
  'GET /api/v1/items/by-code/A1-01': item(1, 'A1-01', 'BB 18 MM'),
  'GET /api/v1/items/by-code/A1-02': item(2, 'A1-02', 'MP 15 MM'),
  'GET /api/v1/items/by-code/NOPE': fail(404, 'Item not found'),
};
const scanResult = { passCount: 2, returCount: 0, items: [], returnRequests: [] };

// The modal opens on the hub. Scanning happens on the "Barang Lolos QC" step.
function setup(extra: Record<string, unknown> = {}) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  const api = installFakeApi({ ...routes, ...extra });
  render(<BarangMasukScan onClose={onClose} onSaved={onSaved} />);
  return { api, onClose, onSaved };
}
const openPass = () => fireEvent.click(screen.getByText('Barang Lolos QC'));
const goHub = () => fireEvent.click(screen.getByText('Selesai, kembali'));
const review = () => { goHub(); fireEvent.click(screen.getByText('Tinjau & Simpan')); };
const scan = (code: string) => {
  const input = screen.getByLabelText('Hasil scan');
  fireEvent.change(input, { target: { value: code } });
  fireEvent.keyDown(input, { key: 'Enter' });
};
const qty = (name: string) => (screen.getByLabelText(`Jumlah ${name}`) as HTMLInputElement).value;

const setSecure = (value: boolean) => Object.defineProperty(window, 'isSecureContext', { value, configurable: true });

beforeEach(() => { setSecure(true); localStorage.clear(); qr.cb = null; qr.start.mockClear(); qr.stop.mockClear(); qr.destroy.mockClear(); });

describe('BarangMasukScan', () => {
  it('adds a line per scan and raises the qty when the same code is scanned again', async () => {
    const { api } = setup();
    openPass();
    scan('A1-01');
    await screen.findByText('BB 18 MM');
    expect(qty('BB 18 MM')).toBe('1');
    scan('A1-01');
    await waitFor(() => expect(qty('BB 18 MM')).toBe('2'));
    expect(api.calls('GET /api/v1/items/by-code/A1-01').length).toBe(1);
  });

  it('counts two scans of a new code that arrive before the first lookup finishes', async () => {
    setup();
    openPass();
    scan('A1-02');
    scan('A1-02');
    await screen.findByText('MP 15 MM');
    await waitFor(() => expect(qty('MP 15 MM')).toBe('2'));
    expect(screen.getAllByText('MP 15 MM').length).toBe(1);
  });

  it('shows an unknown code and adds no line', async () => {
    setup();
    openPass();
    scan('NOPE');
    expect(await screen.findByText('Kode "NOPE" tidak dikenal.')).not.toBeNull();
    expect(screen.getByText(/Belum ada barang/)).not.toBeNull();
  });

  it('keeps digits only and blocks leaving the scan step for an invalid qty', async () => {
    setup();
    openPass();
    scan('A1-01');
    await screen.findByText('BB 18 MM');
    const input = screen.getByLabelText('Jumlah BB 18 MM') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '1e2.5' } });
    expect(input.value).toBe('125');
    fireEvent.change(input, { target: { value: '0' } });
    expect((screen.getByText('Selesai, kembali') as HTMLButtonElement).disabled).toBe(true);
  });

  it('reviews first, then posts one batch with an Idempotency-Key and clears the draft', async () => {
    const { api, onSaved, onClose } = setup({ 'POST /api/v1/inbound/scan-batch': scanResult });
    openPass();
    scan('A1-01');
    await screen.findByText('BB 18 MM');
    scan('A1-02');
    await screen.findByText('MP 15 MM');
    fireEvent.change(screen.getByLabelText('Jumlah BB 18 MM'), { target: { value: '30' } });
    goHub();
    fireEvent.change(screen.getByLabelText('Tanggal'), { target: { value: '2026-10-15' } });
    fireEvent.click(screen.getByText('Tinjau & Simpan'));
    expect(screen.getByText('Barang Lolos QC (2 jenis, 31 unit)')).not.toBeNull();
    expect(api.calls('POST /api/v1/inbound/scan-batch').length).toBe(0);
    fireEvent.click(screen.getByText('Konfirmasi simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/inbound/scan-batch').length).toBe(1));
    const call = api.calls('POST /api/v1/inbound/scan-batch')[0];
    expect(call.body).toEqual({
      date: '2026-10-15',
      pass: [{ itemId: 1, qtyArrived: 30 }, { itemId: 2, qtyArrived: 1 }],
      retur: [],
    });
    expect(call.headers.get('Idempotency-Key')).toMatch(/^[\w-]{8,100}$/);
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
    expect(localStorage.getItem('barang-masuk-scan-draft')).toBeNull();
  });

  it('retries with the same key after a failed save', async () => {
    const keys: string[] = [];
    let n = 0;
    const { api, onSaved } = setup({
      'POST /api/v1/inbound/scan-batch': (req: FakeRequest) => {
        keys.push(req.headers.get('Idempotency-Key')!);
        return ++n === 1 ? fail(500, 'Server error') : scanResult;
      },
    });
    openPass();
    scan('A1-01');
    await screen.findByText('BB 18 MM');
    review();
    fireEvent.click(screen.getByText('Konfirmasi simpan'));
    expect(await screen.findByText('Server error')).not.toBeNull();
    fireEvent.click(screen.getByText('Konfirmasi simpan'));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(api.calls('POST /api/v1/inbound/scan-batch').length).toBe(2);
    expect(keys[0]).toBe(keys[1]);
  });

  it('shows a per-line error with the item name', async () => {
    setup({ 'POST /api/v1/inbound/scan-batch': fail(400, 'Validation failed', { 'pass.0.itemId': ['Item has no supplier yet, ask Purchasing to map one first'] }) });
    openPass();
    scan('A1-01');
    await screen.findByText('BB 18 MM');
    review();
    fireEvent.click(screen.getByText('Konfirmasi simpan'));
    expect(await screen.findByText(/BB 18 MM \(Barang Lolos QC\): Item has no supplier yet/)).not.toBeNull();
  });

  it('restores the draft after a reload, and Batalkan sesi clears it', async () => {
    const first = setup();
    openPass();
    scan('A1-01');
    await screen.findByText('BB 18 MM');
    first.onClose.mockClear();
    document.body.innerHTML = '';
    const { onClose } = setup();
    openPass();
    expect(await screen.findByText('BB 18 MM')).not.toBeNull();
    goHub();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByText('Batalkan sesi'));
    expect(onClose).toHaveBeenCalled();
    expect(localStorage.getItem('barang-masuk-scan-draft')).toBeNull();
  });

  it('plus and minus change the qty, minus stops at 1', async () => {
    setup();
    openPass();
    scan('A1-01');
    await screen.findByText('BB 18 MM');
    expect((screen.getByLabelText('Kurangi BB 18 MM') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Tambah BB 18 MM'));
    fireEvent.click(screen.getByLabelText('Tambah BB 18 MM'));
    expect(qty('BB 18 MM')).toBe('3');
    fireEvent.click(screen.getByLabelText('Kurangi BB 18 MM'));
    expect(qty('BB 18 MM')).toBe('2');
  });
});

describe('BarangMasukScan camera', () => {
  it('starts the camera, adds a line per decoded QR, and stops on toggle off', async () => {
    setup();
    openPass();
    fireEvent.click(screen.getByText('Kamera'));
    await waitFor(() => expect(qr.start).toHaveBeenCalled());
    qr.cb!({ data: 'A1-01' });
    await screen.findByText('BB 18 MM');
    expect(qty('BB 18 MM')).toBe('1');
    fireEvent.click(screen.getByText('Matikan kamera'));
    expect(qr.stop).toHaveBeenCalled();
    expect(qr.destroy).toHaveBeenCalled();
  });

  it('locks on the first QR and ignores other QRs until Scan lagi', async () => {
    const { api } = setup();
    openPass();
    fireEvent.click(screen.getByText('Kamera'));
    await waitFor(() => expect(qr.start).toHaveBeenCalled());
    qr.cb!({ data: 'A1-01' });
    qr.cb!({ data: 'A1-02' });
    await screen.findByText('BB 18 MM');
    expect(screen.getByText('A1-01', { selector: 'span' })).not.toBeNull();
    qr.cb!({ data: 'A1-02' });
    qr.cb!({ data: 'A1-01' });
    await Promise.resolve();
    expect(api.calls('GET /api/v1/items/by-code/A1-02').length).toBe(0);
    expect(screen.queryByText('MP 15 MM')).toBeNull();
    expect(qty('BB 18 MM')).toBe('1');
    fireEvent.click(screen.getByText('Scan lagi'));
    qr.cb!({ data: 'A1-02' });
    await screen.findByText('MP 15 MM');
    expect(api.calls('GET /api/v1/items/by-code/A1-02').length).toBe(1);
  });

  it('shows the red state when the code is unknown, and Scan lagi scans again', async () => {
    setup();
    openPass();
    fireEvent.click(screen.getByText('Kamera'));
    await waitFor(() => expect(qr.start).toHaveBeenCalled());
    qr.cb!({ data: 'NOPE' });
    expect(await screen.findByText('Kode tidak bisa dipakai. Tekan Scan lagi.')).not.toBeNull();
    fireEvent.click(screen.getByText('Scan lagi'));
    qr.cb!({ data: 'A1-01' });
    await screen.findByText('BB 18 MM');
  });

  it('explains when the camera cannot start', async () => {
    qr.start.mockRejectedValueOnce(new Error('NotAllowedError'));
    setup();
    openPass();
    fireEvent.click(screen.getByText('Kamera'));
    expect(await screen.findByText(/Kamera tidak bisa dibuka/)).not.toBeNull();
  });

  it('refuses to open the camera outside a secure context', async () => {
    setSecure(false);
    setup();
    openPass();
    fireEvent.click(screen.getByText('Kamera'));
    expect(await screen.findByText(/HTTPS atau localhost/)).not.toBeNull();
    expect(qr.start).not.toHaveBeenCalled();
  });
});
