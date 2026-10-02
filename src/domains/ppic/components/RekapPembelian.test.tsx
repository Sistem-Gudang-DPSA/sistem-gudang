import { describe, expect, it, vi } from 'vitest';
vi.setConfig({ testTimeout: 30000 });
import { fireEvent, render, screen } from '@testing-library/react';
import { fail, installFakeApi, paged } from '@/test/fake-api';
import RekapPembelian from './RekapPembelian';

const row = (id: number, status: string, notes?: string) => ({
  id, type: 'purchase-request', requestedBy: 1, requestedByDomainId: 1, currentStepOrder: 1, cycle: 1, status, createdAt: '2026-03-01T00:00:00Z',
  payload: { bagian: 'Produksi', namaPemohon: 'B', jabatan: 'S', tanggalPengajuan: '2026-03-05', notes, items: [{ namaBarang: 'X', qty: 1, satuan: 'Pcs', proyek: 'P', noSpk: 'S' }] },
});

describe('RekapPembelian', () => {
  it('loads approvals, maps status labels and links to the detail', async () => {
    const api = installFakeApi({
      'GET /api/v1/approvals': paged([row(7, 'pending'), row(8, 'approved', 'Beli kayu'), row(9, 'revision_requested'), row(10, 'rejected')]),
    });
    render(<RekapPembelian />);
    expect((await screen.findAllByText('Produksi - 1 barang')).length).toBe(3);
    expect(screen.getByText('Beli kayu')).toBeTruthy();
    for (const s of ['Belum Disetujui', 'Disetujui', 'Perlu Revisi', 'Ditolak']) expect(screen.getByText(s)).toBeTruthy();
    const links = screen.getAllByText('Lihat Permintaan');
    expect(links[0].getAttribute('href')).toBe('/dashboard/ppic/laporan/rekap-pembelian/permintaan-pembelian/7');
    const q = api.calls('GET /api/v1/approvals')[0].query;
    expect(q.get('type')).toBe('purchase-request');
    expect(q.get('pageSize')).toBe('100');
  });

  it('filters by search text and shows empty state', async () => {
    installFakeApi({ 'GET /api/v1/approvals': paged([row(8, 'approved', 'Beli kayu'), row(9, 'pending', 'Beli paku')]) });
    render(<RekapPembelian />);
    await screen.findByText('Beli kayu');
    fireEvent.change(screen.getByLabelText('Cari pembelian'), { target: { value: 'paku' } });
    expect(screen.queryByText('Beli kayu')).toBeNull();
    expect(screen.getByText('Beli paku')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Cari pembelian'), { target: { value: 'zzz' } });
    expect(screen.getByText('Data tidak ditemukan.')).toBeTruthy();
  });

  it('shows error', async () => {
    installFakeApi({ 'GET /api/v1/approvals': fail(500, 'Boom') });
    render(<RekapPembelian />);
    expect(await screen.findByText('Boom')).toBeTruthy();
  });
});
