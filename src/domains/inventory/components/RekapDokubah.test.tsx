import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import RekapDokubah from './RekapDokubah';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }) }));

vi.setConfig({ testTimeout: 30000 });

const KEY = 'GET /api/v1/dokubah';
const dk = (id: number, o = {}) => ({
  id, noSpk: `SPK-${id}`, client: `Klien ${id}`, tanggalMulai: '2026-10-01', tanggalSelesai: '2026-10-30', status: 'APPROVED',
  fileDokubah: null, totalAnggaran: 1000, createdBy: 1, createdAt: '', updatedAt: '', totalKuota: 10, totalRealisasi: 5, totalRealisasiNilai: 400, ...o,
});
const lastQuery = (api: ReturnType<typeof installFakeApi>) => api.calls(KEY).at(-1)!.query;
const stubPrint = () => {
  const write = vi.fn();
  vi.stubGlobal('open', vi.fn(() => ({ document: { write, close: vi.fn() }, focus: vi.fn(), print: vi.fn() })));
  return write;
};

describe('RekapDokubah', () => {
  it('shows rows and the cards from the API summary (not computed from the page)', async () => {
    installFakeApi({ [KEY]: paged([dk(1), dk(2)], { total: 57, summary: { totalDokubah: 57, totalApproved: 40, overbudgetCount: 3, totalKuota: 100, totalRealisasi: 50, nilaiKuota: 2000, nilaiRealisasi: 1900 } }) });
    render(<RekapDokubah />);
    expect(await screen.findByText('SPK-1')).toBeTruthy();
    expect(screen.getByText('Klien 2')).toBeTruthy();
    expect(screen.getByText('40 Proyek')).toBeTruthy();
    expect(screen.getByText('3 Proyek')).toBeTruthy();
    expect(screen.getByText(/95 % dari total material/)).toBeTruthy();
  });

  it('paginates on the server (page=2) and resets to page 1 when a filter changes', async () => {
    const api = installFakeApi({ [KEY]: (req: { query: URLSearchParams }) => paged([dk(1)], { total: 45, page: Number(req.query.get('page')) }) });
    render(<RekapDokubah />);
    await screen.findByText('SPK-1');
    expect(lastQuery(api).get('pageSize')).toBe('20');
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    await waitFor(() => expect(lastQuery(api).get('page')).toBe('2'));
    fireEvent.change(screen.getByPlaceholderText(/No. SPK atau klien/), { target: { value: 'x' } });
    await waitFor(() => expect(lastQuery(api).get('search')).toBe('x'));
    expect(lastQuery(api).get('page')).toBe('1');
  });

  it('labels the print as the current page when more rows exist', async () => {
    installFakeApi({ [KEY]: paged([dk(1)], { total: 45 }) });
    const write = stubPrint();
    render(<RekapDokubah />);
    await screen.findByText('SPK-1');
    fireEvent.click(screen.getByTitle('Print PDF'));
    expect(write.mock.calls[0][0]).toContain('Halaman ini (1 dari 45 data)');
  });

  it('shows empty state and API error', async () => {
    installFakeApi({ [KEY]: paged([]) });
    const a = render(<RekapDokubah />);
    expect(await screen.findByText('Data tidak ditemukan.')).toBeTruthy();
    a.unmount();
    installFakeApi({ [KEY]: fail(500, 'Gagal laporan') });
    render(<RekapDokubah />);
    expect(await screen.findByText('Gagal laporan')).toBeTruthy();
  });

  it('sends search, status and date range params', async () => {
    const api = installFakeApi({ [KEY]: paged([dk(1)]) });
    const { container } = render(<RekapDokubah />);
    await screen.findByText('SPK-1');
    expect(lastQuery(api).get('pageSize')).toBe('20');
    expect(lastQuery(api).get('startDate')).toBeNull();

    const [from, to] = Array.from(container.querySelectorAll('input[type=date]'));
    fireEvent.change(from, { target: { value: '2026-09-01' } });
    fireEvent.change(to, { target: { value: '2026-09-30' } });
    fireEvent.change(screen.getByPlaceholderText(/No. SPK atau klien/), { target: { value: 'hotel' } });
    fireEvent.change(container.querySelector('select')!, { target: { value: 'Pending' } });
    await waitFor(() => expect(lastQuery(api).get('status')).toBe('PENDING'));
    const q = lastQuery(api);
    expect(q.get('startDate')).toBe('2026-09-01');
    expect(q.get('endDate')).toBe('2026-09-30');
    expect(q.get('search')).toBe('hotel');
  });

  it('print PDF escapes HTML and prints only selected rows', async () => {
    installFakeApi({ [KEY]: paged([dk(1, { client: '<script>x</script>' }), dk(2), dk(3)]) });
    const write = stubPrint();
    render(<RekapDokubah />);
    await screen.findByText('SPK-2');

    fireEvent.click(screen.getByTitle('Print PDF'));
    let html = write.mock.calls[0][0] as string;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('SPK-3');

    fireEvent.click(screen.getAllByRole('checkbox')[2]); // SPK-2
    fireEvent.click(screen.getByTitle('Print PDF'));
    html = write.mock.calls[1][0] as string;
    expect(html).toContain('SPK-2');
    expect(html).not.toContain('SPK-1');
    expect(html).not.toContain('SPK-3');
  });
});
