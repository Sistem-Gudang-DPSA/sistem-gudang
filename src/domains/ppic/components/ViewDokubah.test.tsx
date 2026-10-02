import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import { vi as viTimeout } from 'vitest';
viTimeout.setConfig({ testTimeout: 30000 });
import ViewDokubah from './ViewDokubah';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: '7' }),
}));

const base = {
  id: 7, noSpk: 'SPK-007', client: 'PT Maju', tanggalMulai: '2026-05-01', tanggalSelesai: '2026-05-31',
  status: 'APPROVED', fileDokubah: null, totalAnggaran: 100000, createdBy: 1, createdAt: '', updatedAt: '',
  totalKuota: 0, totalRealisasi: 0, totalRealisasiNilai: 0,
  bahan: [
    { kodeBarang: 'A-1', namaBahan: 'Triplex', satuan: 'lembar', hargaSatuan: 1000, kuota: 20, realisasi: 25, keterangan: '' },
    { kodeBarang: 'B-2', namaBahan: 'Paku', satuan: 'kg', hargaSatuan: 500, kuota: 5, realisasi: 2, keterangan: '' },
  ],
};
const listRoute = paged([base, { ...base, id: 8, noSpk: 'SPK-008' }]);

beforeEach(() => replace.mockClear());

describe('ViewDokubah', () => {
  it('renders header fields, summary and material rows', async () => {
    installFakeApi({ 'GET /api/v1/dokubah/7': base, 'GET /api/v1/dokubah': listRoute });
    render(<ViewDokubah />);
    expect(await screen.findByText('Triplex')).toBeTruthy();
    expect((screen.getByLabelText('Nama Client') as HTMLInputElement).value).toBe('PT Maju');
    expect((screen.getByLabelText('Status Dokubah') as HTMLInputElement).value).toBe('Approved');
    expect((screen.getByLabelText('Tanggal Mulai') as HTMLInputElement).value).toBe('01/05/2026');
    expect(screen.getByText('Rp. 100.000')).toBeTruthy();
    // HPP = 25*1000 + 2*500 = 26.000 ; margin = 74.000
    expect(screen.getByText('Rp. 26.000')).toBeTruthy();
    expect(screen.getByText('Rp. 74.000')).toBeTruthy();
    expect(screen.getByText('20 lembar')).toBeTruthy();
    expect(screen.getByText('-5 lembar').className).toContain('text-red-600');
  });

  it('negative margin is shown in red', async () => {
    installFakeApi({ 'GET /api/v1/dokubah/7': { ...base, totalAnggaran: 1000 }, 'GET /api/v1/dokubah': listRoute });
    render(<ViewDokubah />);
    const m = await screen.findByText('-Rp. 25.000');
    expect(m.className).toContain('text-red-600');
  });

  it.each(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'])('status %s: shows it and offers the Edit link', async (status) => {
    installFakeApi({ 'GET /api/v1/dokubah/7': { ...base, status }, 'GET /api/v1/dokubah': listRoute });
    render(<ViewDokubah />);
    await screen.findByText('Triplex');
    const label = status[0] + status.slice(1).toLowerCase();
    expect((screen.getByLabelText('Status Dokubah') as HTMLInputElement).value).toBe(label);
    expect(screen.getAllByText('Edit').map((a) => a.closest('a')?.getAttribute('href'))).toEqual(
      Array(2).fill('/dashboard/ppic/transaksi/dokubah/edit-material/7'),
    );
  });

  it.fails('BUG: Edit material is offered even for APPROVED Dokubah (backend locks it)', async () => {
    installFakeApi({ 'GET /api/v1/dokubah/7': base, 'GET /api/v1/dokubah': listRoute });
    render(<ViewDokubah />);
    await screen.findByText('Triplex');
    expect(screen.queryAllByText('Edit')).toHaveLength(0);
  });

  it('empty materials state', async () => {
    installFakeApi({ 'GET /api/v1/dokubah/7': { ...base, bahan: [] }, 'GET /api/v1/dokubah': listRoute });
    render(<ViewDokubah />);
    expect(await screen.findByText('Belum ada bahan pada Dokubah ini.')).toBeTruthy();
  });

  it('shows backend error when the dokubah fails to load', async () => {
    installFakeApi({ 'GET /api/v1/dokubah/7': fail(404, 'Dokubah tidak ditemukan di server'), 'GET /api/v1/dokubah': listRoute });
    render(<ViewDokubah />);
    expect(await screen.findByText('Dokubah tidak ditemukan di server')).toBeTruthy();
  });

  it('SPK picker lists dokubah and navigates on change', async () => {
    installFakeApi({ 'GET /api/v1/dokubah/7': base, 'GET /api/v1/dokubah': listRoute });
    render(<ViewDokubah />);
    await screen.findByText('Triplex');
    await screen.findByText('SPK-008');
    fireEvent.change(screen.getByLabelText('Pilih SPK / Proyek'), { target: { value: '8' } });
    expect(replace).toHaveBeenCalledWith('/dashboard/ppic/transaksi/dokubah/view-dokubah/8');
  });
});
