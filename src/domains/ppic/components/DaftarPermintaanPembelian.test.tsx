import { describe, expect, it, vi } from 'vitest';
vi.setConfig({ testTimeout: 30000 });
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { fail, installFakeApi, paged, type FakeRequest } from '@/test/fake-api';
import DaftarPermintaanPembelianPPIC from './DaftarPermintaanPembelian';

const row = (id: number, status: string, over: Record<string, unknown> = {}) => ({
  id, type: 'purchase-request', requestedBy: 1, requestedByDomainId: 1, currentStepOrder: 1, cycle: 1, status,
  createdAt: '2026-03-01T00:00:00Z',
  payload: {
    bagian: 'Produksi', namaPemohon: 'Budi', jabatan: 'Staff', tanggalPengajuan: '2026-03-05', notes: 'Segera',
    items: [{ namaBarang: 'Triplex', qty: 5, satuan: 'Lbr', proyek: 'Kantor', noSpk: 'SPK-1' }],
  },
  ...over,
});

describe('DaftarPermintaanPembelian', () => {
  it('loads purchase-request approvals and renders rows', async () => {
    const api = installFakeApi({ 'GET /api/v1/approvals': paged([row(1, 'pending')]) });
    render(<DaftarPermintaanPembelianPPIC />);
    expect(await screen.findByText('Produksi - 1 barang (Triplex)')).toBeTruthy();
    expect(screen.getByText('05-03-2026')).toBeTruthy();
    const q = api.calls('GET /api/v1/approvals')[0].query;
    expect(q.get('type')).toBe('purchase-request');
    expect(q.get('page')).toBe('1');
  });

  it.each([
    ['pending', 'Menunggu'],
    ['approved', 'Disetujui'],
    ['rejected', 'Ditolak'],
    ['revision_requested', 'Perlu Revisi'],
  ])('detail modal shows status label for %s', async (status, label) => {
    installFakeApi({ 'GET /api/v1/approvals': paged([row(1, status)]) });
    render(<DaftarPermintaanPembelianPPIC />);
    await screen.findByText('Produksi - 1 barang (Triplex)');
    fireEvent.click(screen.getByText('Detail'));
    const dialogStatus = screen.getByText('Status').parentElement as HTMLElement;
    expect(dialogStatus.textContent).toContain(label);
    expect(screen.getByText('Segera')).toBeTruthy();
    expect(screen.getByText('SPK-1')).toBeTruthy();
    fireEvent.click(screen.getByText('Tutup'));
    expect(screen.queryByText('Tanggal Pengajuan')).toBeNull();
  });

  it('shows the empty state', async () => {
    installFakeApi({ 'GET /api/v1/approvals': paged([]) });
    render(<DaftarPermintaanPembelianPPIC />);
    expect(await screen.findByText('Data tidak ditemukan untuk filter tersebut.')).toBeTruthy();
  });

  it('shows the error state', async () => {
    installFakeApi({ 'GET /api/v1/approvals': fail(500, 'Server mati') });
    render(<DaftarPermintaanPembelianPPIC />);
    expect(await screen.findByText('Server mati')).toBeTruthy();
  });

  it('requests page=2 from the pagination', async () => {
    const api = installFakeApi({ 'GET /api/v1/approvals': (req: FakeRequest) => paged([row(1, 'pending')], { total: 45, page: Number(req.query.get('page')) }) });
    render(<DaftarPermintaanPembelianPPIC />);
    await screen.findByText('Produksi - 1 barang (Triplex)');
    fireEvent.click(screen.getByRole('button', { name: 'Selanjutnya' }));
    await waitFor(() => expect(api.calls('GET /api/v1/approvals').some((c) => c.query.get('page') === '2')).toBe(true));
  });

  it('sends the search text and date range filter to the server', async () => {
    const api = installFakeApi({
      'GET /api/v1/approvals': paged([
        row(1, 'pending'),
        row(2, 'pending', { payload: { bagian: 'Gudang', namaPemohon: 'A', jabatan: 'B', tanggalPengajuan: '2026-03-06', items: [{ namaBarang: 'Paku', qty: 1, satuan: 'Kg', proyek: 'P', noSpk: 'S' }] } }),
      ]),
    });
    render(<DaftarPermintaanPembelianPPIC />);
    await screen.findByText('Gudang - 1 barang (Paku)');
    fireEvent.change(screen.getByPlaceholderText('Cari rincian permintaan...'), { target: { value: 'paku' } });
    await waitFor(() => expect(api.calls('GET /api/v1/approvals').at(-1)!.query.get('search')).toBe('paku'));
    fireEvent.change(screen.getByDisplayValue('Bulan'), { target: { value: '03' } });
    fireEvent.change(screen.getByDisplayValue('Tahun'), { target: { value: '2026' } });
    await waitFor(() => {
      const last = api.calls('GET /api/v1/approvals').at(-1)!;
      expect(last.query.get('startDate')).toBe('2026-03-01');
      expect(last.query.get('endDate')).toBe('2026-03-31');
    });
  });

  it('has a link to the tambah page', async () => {
    installFakeApi({ 'GET /api/v1/approvals': paged([]) });
    render(<DaftarPermintaanPembelianPPIC />);
    const link = screen.getByText('Tambah Data').closest('a');
    expect(link?.getAttribute('href')).toBe('/dashboard/ppic/transaksi/permintaan-pembelian/tambah');
    await within(document.body).findByText('Data tidak ditemukan untuk filter tersebut.');
  });
});
