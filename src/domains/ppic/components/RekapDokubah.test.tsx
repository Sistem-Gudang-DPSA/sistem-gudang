import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
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
const rows = [
  row(1, 'APPROVED', '2026-03-05', 1000, 400),
  row(2, 'APPROVED', '2026-04-05', 1000, 1200), // overbudget
  row(3, 'DRAFT', '2026-04-20', 2000, 0),
];

beforeEach(() => push.mockClear());
const bodyRows = () => screen.getAllByRole('row').slice(1);

describe('RekapDokubah', () => {
  it('requests the list and renders rows, sisa and summary cards', async () => {
    const api = installFakeApi({ 'GET /api/v1/dokubah': paged(rows) });
    render(<RekapDokubah />);
    expect(await screen.findByText('SPK-1')).toBeTruthy();
    expect(api.calls('GET /api/v1/dokubah')[0].query.get('pageSize')).toBe('100');
    expect(screen.getByText('2 Proyek', { selector: 'p.text-gray-900' })).toBeTruthy(); // aktif
    expect(screen.getByText('1 Proyek', { selector: 'p.text-red-600' })).toBeTruthy(); // overbudget
    // realisasi 1600 / kuota 4000 = 40%
    expect(screen.getByText('40 % dari total material')).toBeTruthy();
    expect(screen.getByText('Rp. 600')).toBeTruthy(); // sisa row 1
    expect(screen.getByText('-Rp. 200').className).toContain('text-red-600');
  });

  it('shows empty state with 0 summary and no division by zero', async () => {
    installFakeApi({ 'GET /api/v1/dokubah': paged([]) });
    render(<RekapDokubah />);
    expect(await screen.findByText('Data tidak ditemukan.')).toBeTruthy();
    expect(screen.getByText('0 % dari total material')).toBeTruthy();
  });

  it('shows backend error', async () => {
    installFakeApi({ 'GET /api/v1/dokubah': fail(403, 'Missing permission: report.view') });
    render(<RekapDokubah />);
    expect(await screen.findByText('Missing permission: report.view')).toBeTruthy();
  });

  it('periode options come from start month and filter rows; summary ignores the filter', async () => {
    installFakeApi({ 'GET /api/v1/dokubah': paged(rows) });
    render(<RekapDokubah />);
    await screen.findByText('SPK-1');
    expect(screen.getByText('Maret 2026')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Periode'), { target: { value: '2026-04' } });
    expect(screen.queryByText('SPK-1')).toBeNull();
    expect(bodyRows()).toHaveLength(2);
    expect(screen.getByText('2 Proyek', { selector: 'p.text-gray-900' })).toBeTruthy();
  });

  it('status filter and search (maxLength 100)', async () => {
    installFakeApi({ 'GET /api/v1/dokubah': paged(rows) });
    render(<RekapDokubah />);
    await screen.findByText('SPK-1');
    fireEvent.change(screen.getByLabelText('Status SPK'), { target: { value: 'Draft' } });
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText('SPK-3')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Status SPK'), { target: { value: '' } });
    const box = screen.getByLabelText('Cari Data') as HTMLInputElement;
    expect(box.maxLength).toBe(100);
    fireEvent.change(box, { target: { value: 'client 2' } });
    expect(bodyRows()).toHaveLength(1);
  });

  it('row click opens the detail; checkbox cell does not', async () => {
    installFakeApi({ 'GET /api/v1/dokubah': paged(rows) });
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
