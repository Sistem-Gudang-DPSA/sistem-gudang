import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import DetailRekapPermintaan from './DetailRekapPermintaan';

vi.setConfig({ testTimeout: 30000 });
vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  useParams: () => ({ id: '9' }),
  usePathname: () => '/',
}));

const request = {
  id: 9, requestDate: '2026-10-01', spk: 'SPK-9', clientName: 'Proyek Hotel', productionItem: 'Lemari', toolGroup: 'Pak Joko',
  status: 'PROSES', notes: null, createdBy: 1, createdAt: '', updatedAt: '',
  lines: [
    { itemId: 1, itemCode: 'BRG-1', itemName: 'Triplex', unit: 'lbr', locationCode: null, qty: 5 },
    { itemId: 2, itemCode: 'BRG-2', itemName: 'Paku', unit: 'kg', locationCode: null, qty: 50 },
    { itemId: 3, itemCode: 'BRG-3', itemName: 'Lem', unit: 'kg', locationCode: null, qty: 1 },
  ],
};
const items = paged([
  { id: 1, stock: 40, name: 'Triplex' }, { id: 2, stock: 7, name: 'Paku' }, { id: 3, stock: 2, name: 'Lem' },
]);
const dokubahRow = { id: 3, noSpk: 'SPK-9', client: 'Proyek Hotel', tanggalMulai: '2026-10-05', tanggalSelesai: '2026-11-20', status: 'APPROVED', totalAnggaran: 0 };
const dokubahDetail = {
  ...dokubahRow,
  bahan: [
    { kodeBarang: 'BRG-1', namaBahan: 'Triplex', satuan: 'lbr', hargaSatuan: 1, kuota: 20, realisasi: 8, keterangan: '' }, // sisa 12 >= 5
    { kodeBarang: 'BRG-2', namaBahan: 'Paku', satuan: 'kg', hargaSatuan: 1, kuota: 30, realisasi: 0, keterangan: '' }, // sisa 30 < 50
  ],
};
const base = {
  'GET /api/v1/material-requests/9': request,
  'GET /api/v1/items': items,
};

const cellsOf = (name: string) => Array.from(screen.getByText(name).closest('tr')!.querySelectorAll('td')).map((td) => td.textContent);

describe('DetailRekapPermintaan', () => {
  it('shows remaining quota, status, stock and dokubah dates', async () => {
    const api = installFakeApi({
      ...base,
      'GET /api/v1/dokubah': paged([{ ...dokubahRow, id: 99, noSpk: 'SPK-LAIN' }, dokubahRow]),
      'GET /api/v1/dokubah/3': dokubahDetail,
    });
    render(<DetailRekapPermintaan />);
    expect(await screen.findByText('Triplex')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Approved')).toBeTruthy());

    expect(cellsOf('Triplex').slice(2, 6)).toEqual(['5', '12', '40', 'Approved']);
    expect(cellsOf('Paku').slice(2, 6)).toEqual(['50', '30', '7', 'Perlu Approval']);
    expect(cellsOf('Lem').slice(2, 6)).toEqual(['1', '-', '2', 'Belum Terdata']);
    expect(screen.getByText('5 Oktober 2026')).toBeTruthy();
    expect(screen.getByText('20 November 2026')).toBeTruthy();
    expect(screen.getByText('Pak Joko')).toBeTruthy();
    expect(screen.getByText('Proyek Hotel')).toBeTruthy();

    expect(api.calls('GET /api/v1/material-requests/9')).toHaveLength(1);
    expect(api.calls('GET /api/v1/dokubah')[0].query.get('search')).toBe('SPK-9');
    expect(api.calls('GET /api/v1/dokubah/3')).toHaveLength(1);
    expect(api.calls('GET /api/v1/items')).toHaveLength(1);
  });

  it('degrades when the dokubah list lookup fails', async () => {
    installFakeApi({ ...base, 'GET /api/v1/dokubah': fail(403, 'Missing permission: dokubah.view') });
    render(<DetailRekapPermintaan />);
    expect(await screen.findByText('Triplex')).toBeTruthy();
    expect(cellsOf('Triplex').slice(2, 6)).toEqual(['5', '-', '40', 'Belum Terdata']);
    expect(screen.queryByText('Missing permission: dokubah.view')).toBeNull();
    expect(screen.queryByText('5 Oktober 2026')).toBeNull();
  });

  it('degrades when the dokubah detail fails or no dokubah matches the SPK', async () => {
    const api = installFakeApi({ ...base, 'GET /api/v1/dokubah': paged([dokubahRow]), 'GET /api/v1/dokubah/3': fail(500, 'x') });
    const a = render(<DetailRekapPermintaan />);
    expect(await screen.findByText('Triplex')).toBeTruthy();
    await waitFor(() => expect(api.calls('GET /api/v1/dokubah/3')).toHaveLength(1));
    expect(cellsOf('Triplex')[5]).toBe('Belum Terdata');
    a.unmount();

    installFakeApi({ ...base, 'GET /api/v1/dokubah': paged([{ ...dokubahRow, noSpk: 'SPK-LAIN' }]) });
    render(<DetailRekapPermintaan />);
    expect(await screen.findByText('Triplex')).toBeTruthy();
    expect(cellsOf('Triplex')[5]).toBe('Belum Terdata');
  });

  it('shows an error when the request itself fails', async () => {
    installFakeApi({ 'GET /api/v1/material-requests/9': fail(404, 'Permintaan tidak ditemukan'), 'GET /api/v1/items': items });
    render(<DetailRekapPermintaan />);
    expect(await screen.findByText('Permintaan tidak ditemukan')).toBeTruthy();
  });
});
