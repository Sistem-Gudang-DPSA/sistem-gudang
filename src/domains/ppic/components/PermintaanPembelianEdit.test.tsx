import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PpicEditPage from '@/app/dashboard/ppic/transaksi/permintaan-pembelian/[id]/edit/page';
import GudangEditPage from '@/app/dashboard/gudang/transaksi/permintaan-pembelian/[id]/edit/page';
import { fail, installFakeApi, paged } from '@/test/fake-api';
import { withUser } from './as-user';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '7' }),
  useRouter: () => ({ push, back: vi.fn() }),
}));

const request = (status = 'pending', requestedBy = 1) => ({
  id: 7, type: 'purchase-request', requestedBy, requestedByDomainId: 1,
  currentStepOrder: 1, cycle: 1, status, createdAt: '2026-11-09T00:00:00Z',
  payload: {
    bagian: 'Gudang', namaPemohon: 'Fauzi', jabatan: 'Staff', tanggalPengajuan: '2026-11-09',
    periode: 'November 2026', notes: 'Segera',
    items: [{ itemId: 3, namaBarang: 'Paku', qty: 5, satuan: 'Kg', proyek: 'Hotel', supplier: 'PT Bahan' }],
  },
});

beforeEach(() => push.mockReset());

describe('purchase request edit routes', () => {
  it.each([
    ['PPIC', PpicEditPage, '/dashboard/ppic/transaksi/permintaan-pembelian', 'pending'],
    ['Gudang', GudangEditPage, '/dashboard/gudang/transaksi/permintaan-pembelian', 'pending'],
    ['Gudang revision', GudangEditPage, '/dashboard/gudang/transaksi/permintaan-pembelian', 'revision_requested'],
  ])('%s opens the selected request as an editable form and saves it', async (_label, Page, basePath, status) => {
    const api = installFakeApi({
      'GET /api/v1/approvals/7': { request: request(status), actions: [] },
      'GET /api/v1/items': paged([]),
      'PUT /api/v1/approvals/7': null,
    });
    render(withUser(<Page />, ['purchase-request.create']));
    expect(screen.getByRole('status').textContent).toBe('Memuat data...');
    expect(await screen.findByRole('heading', { name: 'Edit Permintaan Pembelian' })).toBeTruthy();
    expect((screen.getByLabelText('Nama pemohon') as HTMLInputElement).value).toBe('Fauzi');
    expect((screen.getByLabelText('Nama Barang baris 1') as HTMLInputElement).value).toBe('Paku');
    expect((screen.getByLabelText('QTY baris 1') as HTMLInputElement).value).toBe('5');
    expect(screen.queryByRole('heading', { name: 'DAFTAR PERMINTAAN PEMBELIAN' })).toBeNull();
    expect(push).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('QTY baris 1'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(basePath));
    expect(api.calls('GET /api/v1/approvals/7')).toHaveLength(1);
    expect(api.calls('GET /api/v1/approvals')).toHaveLength(0);
    expect(api.calls('POST /api/v1/approvals')).toHaveLength(0);
    expect(api.calls('PUT /api/v1/approvals/7')).toHaveLength(1);
    expect(api.calls('PUT /api/v1/approvals/7')[0].body).toMatchObject({
      payload: { namaPemohon: 'Fauzi', notes: 'Segera', items: [{ itemId: 3, namaBarang: 'Paku', qty: 8 }] },
    });
  });

  it.each(['approved', 'rejected'])('does not allow editing a request with status %s', async (status) => {
    installFakeApi({ 'GET /api/v1/approvals/7': { request: request(status), actions: [] } });
    render(withUser(<GudangEditPage />, ['purchase-request.create']));
    expect(await screen.findByText(/Permintaan ini tidak dapat diedit/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Simpan Perubahan' })).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it('does not allow editing another requester’s request', async () => {
    installFakeApi({ 'GET /api/v1/approvals/7': { request: request('pending', 42), actions: [] } });
    render(withUser(<GudangEditPage />, ['purchase-request.create']));
    expect(await screen.findByText(/Permintaan ini tidak dapat diedit/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Simpan Perubahan' })).toBeNull();
  });

  it('shows a loading error without navigating back to the list', async () => {
    installFakeApi({ 'GET /api/v1/approvals/7': fail(500, 'Gagal mengambil permintaan') });
    render(withUser(<GudangEditPage />, ['purchase-request.create']));
    expect((await screen.findByRole('alert')).textContent).toBe('Gagal mengambil permintaan');
    expect(screen.queryByRole('button', { name: 'Simpan Perubahan' })).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });
});
