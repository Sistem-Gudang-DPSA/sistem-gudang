import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import RekapDokubah from './RekapDokubah';

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
  it('shows rows and aggregate cards (computed client-side, the API has no summary)', async () => {
    installFakeApi({ [KEY]: paged([dk(1), dk(2, { totalRealisasiNilai: 1500 })]) });
    render(<RekapDokubah />);
    expect(await screen.findByText('SPK-1')).toBeTruthy();
    expect(screen.getByText('Klien 2')).toBeTruthy();
    expect(screen.getByText('2 SPK')).toBeTruthy();
    expect(screen.getByText('1 SPK')).toBeTruthy(); // overbudget: 1500 > 1000
    expect(screen.getByText(/95\.0% dari anggaran/)).toBeTruthy(); // (400+1500)/2000
  });

  it('shows empty state and API error', async () => {
    installFakeApi({ [KEY]: paged([]) });
    const a = render(<RekapDokubah />);
    expect(await screen.findByText('Tidak ada data dokubah ditemukan.')).toBeTruthy();
    a.unmount();
    installFakeApi({ [KEY]: fail(500, 'Gagal laporan') });
    render(<RekapDokubah />);
    expect(await screen.findByText('Gagal laporan')).toBeTruthy();
  });

  it('sends search, status and date range params', async () => {
    const api = installFakeApi({ [KEY]: paged([dk(1)]) });
    const { container } = render(<RekapDokubah />);
    await screen.findByText('SPK-1');
    expect(lastQuery(api).get('pageSize')).toBe('100');
    expect(lastQuery(api).get('startDate')).toBeNull();

    const [from, to] = Array.from(container.querySelectorAll('input[type=date]'));
    fireEvent.change(from, { target: { value: '2026-09-01' } });
    fireEvent.change(to, { target: { value: '2026-09-30' } });
    fireEvent.change(screen.getByPlaceholderText(/Cari No. SPK/), { target: { value: 'hotel' } });
    fireEvent.change(container.querySelector('select')!, { target: { value: 'PENDING' } });
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

    fireEvent.click(screen.getByTitle('Print Data ke PDF'));
    let html = write.mock.calls[0][0] as string;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('SPK-3');

    fireEvent.click(screen.getAllByRole('checkbox')[2]); // SPK-2
    fireEvent.click(screen.getByTitle('Print Data ke PDF'));
    html = write.mock.calls[1][0] as string;
    expect(html).toContain('SPK-2');
    expect(html).not.toContain('SPK-1');
    expect(html).not.toContain('SPK-3');
  });
});
