import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, fail } from '@/test/fake-api';
import RekapPermintaan from './RekapPermintaan';

vi.setConfig({ testTimeout: 30000 });

const req = (id: number, o = {}) => ({
  id, requestDate: '2026-10-01', spk: `SPK-${id}`, clientName: `Klien ${id}`, productionItem: 'Lemari', toolGroup: 'Group A',
  status: 'PENDING', notes: null, createdBy: 1, createdAt: '', updatedAt: '', lineCount: 2, ...o,
});
const report = (rows: unknown[], total = rows.length) => ({ rows, total, page: 1, pageSize: 20 });
const KEY = 'GET /api/v1/reports/requests';
const EXPORT = 'GET /api/v1/reports/requests/export';
const lastQuery = (api: ReturnType<typeof installFakeApi>) => api.calls(KEY).at(-1)!.query;
const stubDownload = () => vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }));
const stubPrint = () => {
  const write = vi.fn();
  vi.stubGlobal('open', vi.fn(() => ({ document: { write, close: vi.fn() }, focus: vi.fn(), print: vi.fn() })));
  return write;
};

describe('RekapPermintaan', () => {
  it('shows rows with status labels', async () => {
    installFakeApi({ [KEY]: report([req(1), req(2, { status: 'SELESAI' })]) });
    render(<RekapPermintaan />);
    expect(await screen.findByText('SPK-1')).toBeTruthy();
    expect(screen.getByText('Klien 2')).toBeTruthy();
    const badges = Array.from(document.querySelectorAll('tbody span')).map((e) => e.textContent);
    expect(badges).toContain('Menunggu PPIC');
    expect(badges).toContain('Selesai');
    expect(screen.getAllByText('01-10-2026')).toHaveLength(2);
  });

  it('shows empty state and API error', async () => {
    installFakeApi({ [KEY]: report([]) });
    const a = render(<RekapPermintaan />);
    expect(await screen.findByText('Tidak ada data permintaan ditemukan.')).toBeTruthy();
    a.unmount();
    installFakeApi({ [KEY]: fail(500, 'Boom') });
    render(<RekapPermintaan />);
    expect(await screen.findByText('Boom')).toBeTruthy();
  });

  it('sends page and pageSize=20, next goes to page 2, filter change resets to page 1', async () => {
    const api = installFakeApi({ [KEY]: report([req(1)], 45) });
    const { container } = render(<RekapPermintaan />);
    await screen.findByText('SPK-1');
    expect(lastQuery(api).get('page')).toBe('1');
    expect(lastQuery(api).get('pageSize')).toBe('20');
    expect(lastQuery(api).get('startDate')).toMatch(/^\d{4}-\d{2}-01$/);

    fireEvent.click(screen.getByText('Selanjutnya'));
    await waitFor(() => expect(lastQuery(api).get('page')).toBe('2'));

    fireEvent.change(container.querySelector('select')!, { target: { value: 'PROSES' } });
    await waitFor(() => expect(lastQuery(api).get('status')).toBe('PROSES'));
    expect(lastQuery(api).get('page')).toBe('1');

    fireEvent.change(screen.getByPlaceholderText(/Cari SPK/), { target: { value: 'abc' } });
    await waitFor(() => expect(lastQuery(api).get('q')).toBe('abc'));
    const [from, to] = Array.from(container.querySelectorAll('input[type=date]'));
    fireEvent.change(from, { target: { value: '2026-08-01' } });
    fireEvent.change(to, { target: { value: '2026-08-31' } });
    await waitFor(() => expect(lastQuery(api).get('endDate')).toBe('2026-08-31'));
    expect(lastQuery(api).get('startDate')).toBe('2026-08-01');
    expect(lastQuery(api).get('page')).toBe('1');
  });

  it('export sends filters when nothing selected and ids when rows are selected', async () => {
    const api = installFakeApi({ [KEY]: report([req(1), req(2), req(3)]), [EXPORT]: {} });
    stubDownload();
    render(<RekapPermintaan />);
    await screen.findByText('SPK-1');

    fireEvent.click(screen.getByTitle('Export Data ke CSV'));
    await waitFor(() => expect(api.calls(EXPORT)).toHaveLength(1));
    expect(api.calls(EXPORT)[0].query.get('ids')).toBeNull();
    expect(api.calls(EXPORT)[0].query.get('startDate')).toMatch(/^\d{4}-\d{2}-01$/);

    const boxes = screen.getAllByRole('checkbox');
    fireEvent.click(boxes[1]); // SPK-1 (boxes[0] is select-all)
    fireEvent.click(boxes[2]); // SPK-2
    expect(screen.getByText(/2 dipilih/)).toBeTruthy();
    fireEvent.click(screen.getByTitle('Export Data ke CSV'));
    await waitFor(() => expect(api.calls(EXPORT)).toHaveLength(2));
    const q = api.calls(EXPORT)[1].query;
    expect(q.get('ids')).toBe('1,2');
    expect(q.get('startDate')).toBeNull();
  });

  it('clears the selection when the filters or the page change', async () => {
    installFakeApi({ [KEY]: report([req(1), req(2)], 45) });
    const { container } = render(<RekapPermintaan />);
    await screen.findByText('SPK-1');
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    expect(screen.getByText(/1 dipilih/)).toBeTruthy();
    fireEvent.click(screen.getByText('Selanjutnya'));
    await waitFor(() => expect(screen.queryByText(/dipilih/)).toBeNull());
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    expect(screen.getByText(/1 dipilih/)).toBeTruthy();
    fireEvent.change(container.querySelector('select')!, { target: { value: 'PROSES' } });
    await waitFor(() => expect(screen.queryByText(/dipilih/)).toBeNull());
  });

  it('shows export error', async () => {
    installFakeApi({ [KEY]: report([req(1)]), [EXPORT]: fail(500, 'Export gagal') });
    render(<RekapPermintaan />);
    await screen.findByText('SPK-1');
    fireEvent.click(screen.getByTitle('Export Data ke CSV'));
    expect(await screen.findByText('Export gagal')).toBeTruthy();
  });

  it('print PDF escapes HTML and prints only selected rows', async () => {
    installFakeApi({ [KEY]: report([req(1, { clientName: '<script>alert(1)</script>' }), req(2), req(3)]) });
    const write = stubPrint();
    render(<RekapPermintaan />);
    await screen.findByText('SPK-2');

    fireEvent.click(screen.getByTitle('Print Data ke PDF'));
    let html = write.mock.calls[0][0] as string;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('SPK-3');

    const boxes = screen.getAllByRole('checkbox');
    fireEvent.click(boxes[2]); // SPK-2
    fireEvent.click(screen.getByTitle('Print Data ke PDF'));
    html = write.mock.calls[1][0] as string;
    expect(html).toContain('SPK-2');
    expect(html).not.toContain('SPK-1');
    expect(html).not.toContain('SPK-3');
    expect(html).toContain('1 baris dipilih');
  });

  it('shows an error when the popup is blocked', async () => {
    installFakeApi({ [KEY]: report([req(1)]) });
    vi.stubGlobal('open', vi.fn(() => null));
    render(<RekapPermintaan />);
    await screen.findByText('SPK-1');
    fireEvent.click(screen.getByTitle('Print Data ke PDF'));
    expect(await screen.findByText(/Pop-up diblokir/)).toBeTruthy();
  });

  it('opens the detail modal from /material-requests/{id}', async () => {
    const api = installFakeApi({
      [KEY]: report([req(1)]),
      'GET /api/v1/material-requests/1': { ...req(1), lines: [{ itemId: 4, itemCode: 'BRG-4', itemName: 'Lem', unit: 'kg', locationCode: null, qty: 6 }] },
    });
    render(<RekapPermintaan />);
    fireEvent.click(await screen.findByText('View Detail'));
    expect(await screen.findByText('BRG-4 - Lem')).toBeTruthy();
    expect(screen.getByText('6 kg')).toBeTruthy();
    expect(api.calls('GET /api/v1/material-requests/1')).toHaveLength(1);
  });
});
