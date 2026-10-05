import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import { vi as viTimeout } from 'vitest';
viTimeout.setConfig({ testTimeout: 30000 });
import RekapDokubah from './RekapDokubah';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }) }));

const row = (id: number, status: string, mulai: string, anggaran: number, nilai: number) => ({
  id, noSpk: `SPK-${id}`, client: `Client ${id}`, tanggalMulai: mulai, tanggalSelesai: '2026-12-31', status,
  fileDokubah: null, totalAnggaran: anggaran, createdBy: 1, createdAt: '', updatedAt: '',
  totalKuota: 0, totalRealisasi: 0, totalRealisasiNilai: nilai,
});
const summary = { totalDokubah: 3, totalApproved: 2, overbudgetCount: 1, totalKuota: 0, totalRealisasi: 0, nilaiKuota: 4000, nilaiRealisasi: 1600 };
const rows = [
  row(1, 'APPROVED', '2026-03-05', 1000, 400),
  row(2, 'APPROVED', '2026-04-05', 1000, 1200), // overbudget
  row(3, 'DRAFT', '2026-04-20', 2000, 0),
];

beforeEach(() => push.mockClear());
const bodyRows = () => screen.getAllByRole('row').slice(1);

describe('RekapDokubah', () => {
  it('requests the list and renders rows, sisa and summary cards', async () => {
    const api = installFakeApi({ 'GET /api/v1/dokubah': paged(rows, { summary }) });
    render(<RekapDokubah />);
    expect(await screen.findByText('SPK-1')).toBeTruthy();
    expect(api.calls('GET /api/v1/dokubah')[0].query.get('pageSize')).toBe('20');
    expect(screen.getByText('2 Proyek', { selector: 'p.text-gray-900' })).toBeTruthy(); // aktif (summary.totalApproved)
    expect(screen.getByText('1 Proyek', { selector: 'p.text-red-600' })).toBeTruthy(); // overbudget
    // nilaiRealisasi 1600 / nilaiKuota 4000 = 40%
    expect(screen.getByText('40 % dari total material')).toBeTruthy();
    expect(screen.getByText('Rp. 600')).toBeTruthy(); // sisa row 1
    expect(screen.getByText('-Rp. 200').className).toContain('text-red-600');
  });

  it('shows empty state with 0 summary and no division by zero', async () => {
    installFakeApi({ 'GET /api/v1/dokubah': paged([], { summary: { ...summary, totalApproved: 0, overbudgetCount: 0, nilaiKuota: 0, nilaiRealisasi: 0 } }) });
    render(<RekapDokubah />);
    expect(await screen.findByText('Data tidak ditemukan.')).toBeTruthy();
    expect(screen.getByText('0 % dari total material')).toBeTruthy();
  });

  it('shows backend error', async () => {
    installFakeApi({ 'GET /api/v1/dokubah': fail(403, 'Missing permission: report.view') });
    render(<RekapDokubah />);
    expect(await screen.findByText('Missing permission: report.view')).toBeTruthy();
  });

  const lastQuery = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/dokubah').at(-1)!.query;

  it('sends periode dates, status and search to the API; summary comes from the API', async () => {
    const api = installFakeApi({ 'GET /api/v1/dokubah': paged(rows, { summary }) });
    render(<RekapDokubah />);
    await screen.findByText('SPK-1');
    fireEvent.change(screen.getByLabelText('Periode dari'), { target: { value: '2026-04-01' } });
    fireEvent.change(screen.getByLabelText('Periode sampai'), { target: { value: '2026-04-30' } });
    fireEvent.change(screen.getByLabelText('Status SPK'), { target: { value: 'Draft' } });
    const box = screen.getByLabelText('Cari Data') as HTMLInputElement;
    expect(box.maxLength).toBe(100);
    fireEvent.change(box, { target: { value: 'client 2' } });
    await waitFor(() => expect(lastQuery(api).get('search')).toBe('client 2'));
    const q = lastQuery(api);
    expect(q.get('startDate')).toBe('2026-04-01');
    expect(q.get('endDate')).toBe('2026-04-30');
    expect(q.get('status')).toBe('DRAFT');
    expect(screen.getByText('2 Proyek', { selector: 'p.text-gray-900' })).toBeTruthy();
  });

  it('paginates on the server (page=2) and resets to page 1 when a filter changes', async () => {
    const api = installFakeApi({ 'GET /api/v1/dokubah': (req: { query: URLSearchParams }) => paged(rows, { summary, total: 45, page: Number(req.query.get('page')) }) });
    render(<RekapDokubah />);
    await screen.findByText('SPK-1');
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    await waitFor(() => expect(lastQuery(api).get('page')).toBe('2'));
    fireEvent.change(screen.getByLabelText('Status SPK'), { target: { value: 'Draft' } });
    await waitFor(() => expect(lastQuery(api).get('status')).toBe('DRAFT'));
    expect(lastQuery(api).get('page')).toBe('1');
  });

  it('row click opens the detail; checkbox cell does not', async () => {
    installFakeApi({ 'GET /api/v1/dokubah': paged(rows, { summary }) });
    render(<RekapDokubah />);
    await screen.findByText('SPK-1');
    fireEvent.click(screen.getByLabelText('Centang SPK-1'));
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(within(bodyRows()[1]).getByText('Client 2'));
    expect(push).toHaveBeenCalledWith('/dashboard/ppic/laporan/rekap-dokubah/detail-rekap-dokubah/2');
  });

  it('status badges render for every status', async () => {
    installFakeApi({ 'GET /api/v1/dokubah': paged([row(1, 'PENDING', '2026-03-05', 1, 0), row(2, 'REJECTED', '2026-03-05', 1, 0), row(3, 'DRAFT', '2026-03-05', 1, 0), row(4, 'APPROVED', '2026-03-05', 1, 0)]) });
    render(<RekapDokubah />);
    await screen.findByText('SPK-1');
    const cells = bodyRows().map((r) => r.querySelectorAll('td')[6].textContent?.trim());
    expect(cells).toEqual(['Pending', 'Rejected', 'Draft', 'Approved']);
  });
});
