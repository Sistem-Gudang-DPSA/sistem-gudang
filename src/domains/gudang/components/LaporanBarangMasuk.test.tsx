import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, fail } from '@/test/fake-api';
import { vi as viCfg } from 'vitest';
viCfg.setConfig({ testTimeout: 30000 });
import LaporanBarangMasuk from './LaporanBarangMasuk';

const row = (o = {}) => ({
  id: 1, date: '2026-10-01T08:30:00', itemId: 1, itemCode: 'BRG-1', itemName: 'Triplex', locationCode: 'A-01',
  supplierId: 1, supplierName: 'PT Kayu', source: 'SUPPLIER', qtyArrived: 10, qtyPurchased: 12, statusQc: 'PASS',
  referenceNo: 'PO-001', supplierDeliveryNo: 'SJ-9', clientName: null, spk: null, notes: null, createdBy: 1, createdAt: '2026-10-01',
  ...o,
});
const report = (rows: unknown[], summary = { total: 7, supplier: 4, produksi: 3, klien: 0 }) => ({ rows, total: rows.length, page: 1, pageSize: 100, summary });
const KEY = 'GET /api/v1/reports/inbound';
const lastQuery = (api: ReturnType<typeof installFakeApi>) => api.calls(KEY).at(-1)!.query;

describe('LaporanBarangMasuk', () => {
  it('shows rows and transaction counts from the backend summary', async () => {
    installFakeApi({ [KEY]: report([row(), row({ id: 2, source: 'PRODUKSI', supplierName: null, clientName: 'Klien A', referenceNo: 'PR-2', supplierDeliveryNo: null, qtyArrived: 5, statusQc: 'PARTIAL_RETUR' })]) });
    render(<LaporanBarangMasuk />);
    expect(await screen.findByText('PO-001')).toBeTruthy();
    expect(screen.getByText('PT Kayu')).toBeTruthy();
    expect(screen.getByText('Pass (IPM)')).toBeTruthy();
    expect(screen.getByText('Part (Retur)')).toBeTruthy();
    expect(screen.getByText('15 Qty / 7 Transaksi')).toBeTruthy();
    expect(screen.getByText('10 Qty (4 Transaksi)')).toBeTruthy();
    expect(screen.getByText('5 Qty (3 Transaksi)')).toBeTruthy();
  });

  it('shows the empty state', async () => {
    installFakeApi({ [KEY]: report([], { total: 0, supplier: 0, produksi: 0, klien: 0 }) });
    render(<LaporanBarangMasuk />);
    expect(await screen.findByText('Tidak ada data penerimaan barang masuk ditemukan.')).toBeTruthy();
  });

  it('shows the API error', async () => {
    installFakeApi({ [KEY]: fail(500, 'Server mati') });
    render(<LaporanBarangMasuk />);
    expect(await screen.findByText('Server mati')).toBeTruthy();
  });

  it('sends default month range and pageSize, then filters', async () => {
    const api = installFakeApi({ [KEY]: report([row()]) });
    const { container } = render(<LaporanBarangMasuk />);
    await screen.findByText('PO-001');
    expect(lastQuery(api).get('startDate')).toMatch(/^\d{4}-\d{2}-01$/);
    expect(lastQuery(api).get('pageSize')).toBe('100');
    expect(lastQuery(api).get('source')).toBeNull();

    const [from, to] = Array.from(container.querySelectorAll('input[type=date]'));
    fireEvent.change(from, { target: { value: '2026-09-01' } });
    fireEvent.change(to, { target: { value: '2026-09-30' } });
    fireEvent.change(screen.getByPlaceholderText(/Cari No. PO/), { target: { value: 'kayu' } });
    fireEvent.change(container.querySelector('select')!, { target: { value: 'PRODUKSI' } });
    await waitFor(() => expect(lastQuery(api).get('source')).toBe('PRODUKSI'));
    const q = lastQuery(api);
    expect(q.get('startDate')).toBe('2026-09-01');
    expect(q.get('endDate')).toBe('2026-09-30');
    expect(q.get('q')).toBe('kayu');
  });

  it('exports with the current filters', async () => {
    const api = installFakeApi({ [KEY]: report([row()]), 'GET /api/v1/reports/inbound/export': {} });
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }));
    render(<LaporanBarangMasuk />);
    await screen.findByText('PO-001');
    fireEvent.click(screen.getByTitle('Export Data ke CSV'));
    await waitFor(() => expect(api.all().some((c) => c.path.endsWith('/export'))).toBe(true));
    const exp = api.calls('GET /api/v1/reports/inbound/export')[0].query;
    expect(exp.get('startDate')).toMatch(/^\d{4}-\d{2}-01$/);
    expect(exp.get('pageSize')).toBeNull();
  });

  it('print PDF escapes HTML', async () => {
    installFakeApi({ [KEY]: report([row({ supplierName: '<script>alert(1)</script>', referenceNo: '<img onerror=x>' })]) });
    const write = vi.fn();
    const win = { document: { write, close: vi.fn() }, focus: vi.fn(), print: vi.fn() };
    vi.stubGlobal('open', vi.fn(() => win));
    render(<LaporanBarangMasuk />);
    await screen.findByText('<img onerror=x>');
    fireEvent.click(screen.getByTitle('Print Data ke PDF'));
    const html = write.mock.calls[0][0] as string;
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img onerror');
    expect(html).toContain('&lt;script&gt;');
    expect(win.print).toHaveBeenCalled();
  });
});
