import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.setConfig({ testTimeout: 30000 });
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { fail, installFakeApi } from '@/test/fake-api';
import Revisi from './PermintaanPembelianRevisi';
import { withUser } from './as-user';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ id: '5' }),
}));

const detail = (status: string) => ({
  request: {
    id: 5, type: 'purchase-request', requestedBy: 1, requestedByDomainId: 1, currentStepOrder: 1, cycle: 2, status, createdAt: '2026-03-01T00:00:00Z',
    payload: {
      bagian: 'Produksi', namaPemohon: 'Budi', jabatan: 'Staff', tanggalPengajuan: '2026-03-05', notes: 'Catatan awal',
      items: [{ namaBarang: 'Triplex', qty: 5, satuan: 'Lbr', proyek: 'Kantor', noSpk: 'SPK-1' }],
    },
  },
  actions: [],
});

beforeEach(() => push.mockReset());

describe('PermintaanPembelianRevisi', () => {
  it('shows a message unless the status is revision_requested', async () => {
    for (const s of ['pending', 'approved', 'rejected']) {
      installFakeApi({ 'GET /api/v1/approvals/5': detail(s) });
      const { unmount } = render(<Revisi />);
      expect(await screen.findByText('Permintaan ini tidak sedang menunggu revisi.')).toBeTruthy();
      expect(screen.queryByText('Kirim Ulang')).toBeNull();
      unmount();
    }
  });

  it('shows load errors', async () => {
    installFakeApi({ 'GET /api/v1/approvals/5': fail(404, 'Tidak ada') });
    render(<Revisi />);
    expect(await screen.findByText('Tidak ada')).toBeTruthy();
  });

  it('prefills the form and resubmits the edited payload with notes preserved', async () => {
    const api = installFakeApi({
      'GET /api/v1/approvals/5': detail('revision_requested'),
      'POST /api/v1/approvals/5/resubmit': { id: 5 },
    });
    render(<Revisi />);
    expect(await screen.findByText('Perbaiki Permintaan Pembelian')).toBeTruthy();
    expect(screen.getByDisplayValue('Produksi')).toBeTruthy();
    expect(screen.getByDisplayValue('Budi')).toBeTruthy();
    expect(screen.getByDisplayValue('Staff')).toBeTruthy();
    expect(screen.getByDisplayValue('2026-03-05')).toBeTruthy();
    expect(screen.getByDisplayValue('Triplex')).toBeTruthy();
    expect(screen.getByDisplayValue('5')).toBeTruthy();
    fireEvent.change(screen.getByDisplayValue('5'), { target: { value: '9' } });
    fireEvent.click(screen.getByText('Kirim Ulang'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/ppic/transaksi/permintaan-pembelian'));
    expect(api.calls('POST /api/v1/approvals/5/resubmit')[0].body).toEqual({
      payload: {
        bagian: 'Produksi', namaPemohon: 'Budi', jabatan: 'Staff', tanggalPengajuan: '2026-03-05', notes: 'Catatan awal',
        items: [{ namaBarang: 'Triplex', qty: 9, satuan: 'Lbr', proyek: 'Kantor', noSpk: 'SPK-1' }],
      },
    });
    expect(api.calls('POST /api/v1/approvals')).toHaveLength(0);
  });

  it('shows backend errors on resubmit', async () => {
    installFakeApi({
      'GET /api/v1/approvals/5': detail('revision_requested'),
      'POST /api/v1/approvals/5/resubmit': fail(409, 'Status berubah'),
    });
    render(<Revisi />);
    fireEvent.click(await screen.findByText('Kirim Ulang'));
    expect(await screen.findByText('Status berubah')).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });
});


describe('permissions', () => {
  it('a view-only user keeps the screen but not the actions', async () => {
    installFakeApi({ 'GET /api/v1/approvals/5': detail('revision_requested') });
    render(withUser(<Revisi />, ['approval.view']));
    await screen.findByText(/Anda tidak punya izin|Kirim Ulang/);
    expect(screen.getByText(/Anda tidak punya izin/)).toBeTruthy();
  });

  it.each([
    ['holds the permission', ['purchase-request.create'], false],
    ['is a superadmin', [], true],
  ])('a user who %s sees the actions', async (_label, perms, isSuperadmin) => {
    installFakeApi({ 'GET /api/v1/approvals/5': detail('revision_requested') });
    render(withUser(<Revisi />, perms, isSuperadmin));
    await screen.findByText(/Anda tidak punya izin|Kirim Ulang/);
    expect(screen.getAllByText(/Kirim Ulang/).length).toBeGreaterThan(0);
  });
});
