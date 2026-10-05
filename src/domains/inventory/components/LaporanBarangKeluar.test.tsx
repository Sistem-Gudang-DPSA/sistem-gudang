import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, fail } from '@/test/fake-api';
import { vi as viCfg } from 'vitest';
viCfg.setConfig({ testTimeout: 30000 });
import LaporanBarangKeluar from './LaporanBarangKeluar';

const trx = (o = {}) => ({
  id: 1, date: '2026-10-01', clientName: 'Klien A', spk: 'SPK-1', itemName: 'Meja', warehouseType: 'BAHAN_BAKU',
  recipientType: 'PRODUKSI', notes: null, createdBy: 1, createdAt: '2026-10-01',
  lines: [
    { itemId: 1, itemCode: 'BRG-1', itemName: 'Triplex', locationCode: 'A-01', qty: 3, pic: 'Budi' },
    { itemId: 2, itemCode: 'BRG-2', itemName: 'Paku', locationCode: null, qty: 8, pic: '' },
  ],
  ...o,
});
const report = (rows: unknown[], summary = { bahanBaku: 11, wip: 22, barangJadi: 33 }, total = rows.length) => ({ rows, total, page: 1, pageSize: 20, summary });
const KEY = 'GET /api/v1/reports/outbound';
const lastQuery = (api: ReturnType<typeof installFakeApi>) => api.calls(KEY).at(-1)!.query;

describe('LaporanBarangKeluar', () => {
  it('shows one table row per line and backend summary', async () => {
    installFakeApi({ [KEY]: report([trx()]) });
    render(<LaporanBarangKeluar />);
    expect(await screen.findByText('Triplex')).toBeTruthy();
    expect(screen.getByText('Paku')).toBeTruthy();
    expect(screen.getAllByText('SPK-1')).toHaveLength(2);
    expect(screen.getByText('11 Transaksi')).toBeTruthy();
    expect(screen.getByText('22 Transaksi')).toBeTruthy();
    expect(screen.getByText('33 Transaksi')).toBeTruthy();
  });

  it('shows the empty state', async () => {
    installFakeApi({ [KEY]: report([]) });
    render(<LaporanBarangKeluar />);
    expect(await screen.findByText('Tidak ada data barang keluar ditemukan.')).toBeTruthy();
  });

  it('shows the API error', async () => {
    installFakeApi({ [KEY]: fail(403, 'Missing permission: report.view') });
    render(<LaporanBarangKeluar />);
    expect(await screen.findByText('Missing permission: report.view')).toBeTruthy();
  });

  it('sends filters as query params', async () => {
    const api = installFakeApi({ [KEY]: report([trx()]) });
    const { container } = render(<LaporanBarangKeluar />);
    await screen.findByText('Triplex');
    expect(lastQuery(api).get('startDate')).toMatch(/^\d{4}-\d{2}-01$/);
    expect(lastQuery(api).get('pageSize')).toBe('20');
    expect(lastQuery(api).get('page')).toBe('1');

    const [from, to] = Array.from(container.querySelectorAll('input[type=date]'));
    const [gudang, penerima] = Array.from(container.querySelectorAll('select'));
    fireEvent.change(from, { target: { value: '2026-09-01' } });
    fireEvent.change(to, { target: { value: '2026-09-30' } });
    fireEvent.change(screen.getByPlaceholderText(/Cari Client/), { target: { value: 'spk-1' } });
    fireEvent.change(gudang, { target: { value: 'WIP' } });
    fireEvent.change(penerima, { target: { value: 'KLIEN' } });
    await waitFor(() => expect(lastQuery(api).get('recipientType')).toBe('KLIEN'));
    const q = lastQuery(api);
    expect(q.get('startDate')).toBe('2026-09-01');
    expect(q.get('endDate')).toBe('2026-09-30');
    expect(q.get('q')).toBe('spk-1');
    expect(q.get('warehouseType')).toBe('WIP');
  });

  it('paginates on the server and resets to page 1 when a filter changes', async () => {
    const api = installFakeApi({ [KEY]: report([trx()], undefined, 45) });
    const { container } = render(<LaporanBarangKeluar />);
    await screen.findByText('Triplex');
    fireEvent.click(screen.getByText('Selanjutnya'));
    await waitFor(() => expect(lastQuery(api).get('page')).toBe('2'));
    fireEvent.change(container.querySelector('select')!, { target: { value: 'WIP' } });
    await waitFor(() => expect(lastQuery(api).get('warehouseType')).toBe('WIP'));
    expect(lastQuery(api).get('page')).toBe('1');
  });

  it('exports with the current filters', async () => {
    const api = installFakeApi({ [KEY]: report([trx()]), 'GET /api/v1/reports/outbound/export': {} });
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }));
    const { container } = render(<LaporanBarangKeluar />);
    await screen.findByText('Triplex');
    fireEvent.change(container.querySelectorAll('select')[0], { target: { value: 'WIP' } });
    await waitFor(() => expect(lastQuery(api).get('warehouseType')).toBe('WIP'));
    await screen.findByText('Triplex');
    fireEvent.click(screen.getByTitle('Export Data ke CSV'));
    await waitFor(() => expect(api.calls('GET /api/v1/reports/outbound/export')).toHaveLength(1));
    expect(api.calls('GET /api/v1/reports/outbound/export')[0].query.get('warehouseType')).toBe('WIP');
  });

  it('print PDF escapes HTML', async () => {
    installFakeApi({ [KEY]: report([trx({ clientName: '<script>x</script>' })]) });
    const write = vi.fn();
    const win = { document: { write, close: vi.fn() }, focus: vi.fn(), print: vi.fn() };
    vi.stubGlobal('open', vi.fn(() => win));
    render(<LaporanBarangKeluar />);
    await screen.findByText('Triplex');
    fireEvent.click(screen.getByTitle('Print Data ke PDF'));
    const html = write.mock.calls[0][0] as string;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
