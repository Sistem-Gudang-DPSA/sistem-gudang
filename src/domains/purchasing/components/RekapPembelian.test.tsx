import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import RekapPembelian from './RekapPembelian';

vi.setConfig({ testTimeout: 20000 });

const row = (id: number, status: string, notes?: string) => ({
  id, type: 'purchase-request', requestedBy: 1, requestedByDomainId: 1, currentStepOrder: 1, cycle: 1, status, createdAt: '2026-03-01T00:00:00Z',
  payload: { bagian: 'Produksi', namaPemohon: 'B', jabatan: 'S', tanggalPengajuan: '2026-03-05', notes, items: [{ namaBarang: 'X', qty: 1, satuan: 'Pcs', proyek: 'P', noSpk: 'S' }] },
});

describe('purchasing RekapPembelian', () => {
  it('loads purchase requests, shows status labels and links to the purchasing detail route', async () => {
    const api = installFakeApi({ 'GET /api/v1/approvals': paged([row(7, 'pending', 'Beli kayu'), row(8, 'approved', 'Beli paku')]) });
    render(<RekapPembelian />);
    expect(await screen.findByText('Beli kayu')).not.toBeNull();
    expect(screen.getByText('Belum Disetujui')).not.toBeNull();
    expect(screen.getByText('Disetujui')).not.toBeNull();
    expect(screen.getAllByText('05/03/2026').length).toBe(2);
    expect(screen.getAllByText('Lihat Permintaan')[0].getAttribute('href')).toBe('/dashboard/purchasing/laporan/rekap-pembelian/permintaan-pembelian/7');
    expect(api.calls('GET /api/v1/approvals')[0].query.get('type')).toBe('purchase-request');
  });

  it('sends the search text to the server, resets to page 1 and shows the empty state', async () => {
    const api = installFakeApi({ 'GET /api/v1/approvals': paged([row(8, 'approved', 'Beli kayu')], { total: 45 }) });
    render(<RekapPembelian />);
    await screen.findByText('Beli kayu');
    fireEvent.click(screen.getByText('2'));
    await waitFor(() => expect(api.calls('GET /api/v1/approvals').at(-1)!.query.get('page')).toBe('2'));
    fireEvent.change(screen.getByLabelText('Cari pembelian'), { target: { value: 'paku' } });
    await waitFor(() => expect(api.calls('GET /api/v1/approvals').at(-1)!.query.get('search')).toBe('paku'));
    expect(api.calls('GET /api/v1/approvals').at(-1)!.query.get('page')).toBe('1');
  });

  it('shows the empty state', async () => {
    installFakeApi({ 'GET /api/v1/approvals': paged([]) });
    render(<RekapPembelian />);
    expect(await screen.findByText('Data tidak ditemukan.')).toBeTruthy();
  });

  it('shows load error', async () => {
    installFakeApi({ 'GET /api/v1/approvals': fail(500, 'Server error') });
    render(<RekapPembelian />);
    expect(await screen.findByText('Server error')).not.toBeNull();
  });
});
