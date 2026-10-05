import { describe, expect, it, vi } from 'vitest';
vi.setConfig({ testTimeout: 30000 });
import { fireEvent, render, screen } from '@testing-library/react';
import { fail, installFakeApi } from '@/test/fake-api';
import PermintaanPembelianPPIC from './PermintaanPembelian';
import { withUser } from './as-user';

vi.mock('next/navigation', () => ({ useParams: () => ({ id: '5' }), useRouter: () => ({ push: vi.fn() }) }));

const detail = (status: string, extra: Record<string, unknown> = {}) => ({
  request: {
    id: 5, type: 'purchase-request', requestedBy: 1, requestedByDomainId: 1, currentStepOrder: 1, cycle: 1, status, createdAt: '2026-03-01T00:00:00Z',
    payload: {
      bagian: 'Produksi', namaPemohon: 'Budi', jabatan: 'Staff', tanggalPengajuan: '2026-03-05',
      items: [{ namaBarang: 'Triplex', qty: 1500, satuan: 'Lbr', proyek: 'Kantor', noSpk: 'SPK-1' }],
    },
  },
  actions: [],
  ...extra,
});

describe('PermintaanPembelian detail (PPIC)', () => {
  it('loads the detail and renders fields and items', async () => {
    const api = installFakeApi({ 'GET /api/v1/approvals/5': detail('pending') });
    render(<PermintaanPembelianPPIC />);
    expect(await screen.findByText('Triplex')).toBeTruthy();
    expect(screen.getByDisplayValue('Produksi')).toBeTruthy();
    expect(screen.getByDisplayValue('Budi')).toBeTruthy();
    expect(screen.getByDisplayValue('05/03/2026')).toBeTruthy();
    expect(screen.getByText('1.500')).toBeTruthy();
    expect(screen.getByText('Belum Disetujui')).toBeTruthy();
    expect(screen.getAllByText('Tidak ada lampiran')).toHaveLength(2);
    expect(screen.queryByText('Riwayat Persetujuan')).toBeNull();
    expect(api.calls('GET /api/v1/approvals/5')).toHaveLength(1);
  });

  it.each([
    ['pending', 'Belum Disetujui'],
    ['approved', 'Disetujui'],
    ['rejected', 'Ditolak'],
    ['revision_requested', 'Perlu Revisi'],
  ])('status %s shows %s and the revisi link only for revision_requested', async (status, label) => {
    installFakeApi({ 'GET /api/v1/approvals/5': detail(status) });
    render(<PermintaanPembelianPPIC />);
    await screen.findByText('Triplex');
    expect(screen.getByText(label, { selector: 'span' })).toBeTruthy();
    const link = screen.queryByText('Perbaiki dan Kirim Ulang');
    if (status === 'revision_requested') {
      expect(link?.getAttribute('href')).toBe('/dashboard/ppic/transaksi/permintaan-pembelian/5/revisi');
    } else {
      expect(link).toBeNull();
    }
  });

  it('renders the riwayat table with Indonesian action labels', async () => {
    const act = (id: number, action: string, note: string | null) => ({ id, approvalRequestId: 5, stepOrder: 1, cycle: id, domainId: 2, actorId: 3, actorName: id === 1 ? 'budi' : undefined, action, note, createdAt: `2026-03-0${id}T10:00:00Z` });
    installFakeApi({
      'GET /api/v1/approvals/5': detail('approved', { actions: [act(1, 'revision_requested', 'Kurang jelas'), act(2, 'rejected', null), act(3, 'approved', 'OK'), act(4, 'custom', null)] }),
    });
    render(<PermintaanPembelianPPIC />);
    expect(await screen.findByText('Riwayat Persetujuan')).toBeTruthy();
    expect(screen.getByText('Minta Revisi')).toBeTruthy();
    expect(screen.getByText('Ditolak', { selector: 'td' })).toBeTruthy();
    expect(screen.getByText('Disetujui', { selector: 'td' })).toBeTruthy();
    expect(screen.getByText('custom')).toBeTruthy();
    expect(screen.getByText('Kurang jelas')).toBeTruthy();
    expect(screen.getByText('01/03/2026')).toBeTruthy();
    expect(screen.getAllByText('-', { selector: 'td' })).toHaveLength(5);
    expect(screen.getByText('Oleh', { selector: 'th' })).toBeTruthy();
    expect(screen.getByText('budi', { selector: 'td' })).toBeTruthy();
  });

  it('shows the empty items row', async () => {
    const d = detail('pending');
    d.request.payload.items = [];
    installFakeApi({ 'GET /api/v1/approvals/5': d });
    render(<PermintaanPembelianPPIC />);
    expect(await screen.findByText('Belum ada barang pada permintaan ini.')).toBeTruthy();
  });

  it('shows the error state', async () => {
    installFakeApi({ 'GET /api/v1/approvals/5': fail(404, 'Tidak ketemu') });
    render(<PermintaanPembelianPPIC />);
    expect(await screen.findByText('Tidak ketemu')).toBeTruthy();
  });

  it('uses the actions render prop instead of the status and can reload', async () => {
    const api = installFakeApi({ 'GET /api/v1/approvals/5': detail('revision_requested') });
    render(<PermintaanPembelianPPIC backPath="/x" actions={(p, reload) => <button onClick={reload}>Aksi {p.status}</button>} />);
    const btn = await screen.findByText('Aksi Perlu Revisi');
    expect(screen.queryByText('Perbaiki dan Kirim Ulang')).toBeNull();
    expect(screen.queryByText(/Status permintaan/)).toBeNull();
    expect(screen.getByLabelText('Kembali ke Rekap Pembelian').getAttribute('href')).toBe('/x');
    fireEvent.click(btn);
    await vi.waitFor(() => expect(api.calls('GET /api/v1/approvals/5').length).toBe(2));
  });
});


describe('permissions', () => {
  it('a view-only user keeps the screen but not the actions', async () => {
    installFakeApi({ 'GET /api/v1/approvals/5': detail('revision_requested') });
    render(withUser(<PermintaanPembelianPPIC />, ['approval.view']));
    await screen.findByText('Triplex');
    expect(screen.queryByText('Perbaiki dan Kirim Ulang')).toBeNull();
  });

  it.each([
    ['holds the permission', ['purchase-request.create'], false],
    ['is a superadmin', [], true],
  ])('a user who %s sees the actions', async (_label, perms, isSuperadmin) => {
    installFakeApi({ 'GET /api/v1/approvals/5': detail('revision_requested') });
    render(withUser(<PermintaanPembelianPPIC />, perms, isSuperadmin));
    await screen.findByText('Triplex');
    expect(screen.getByText('Perbaiki dan Kirim Ulang')).toBeTruthy();
  });
});
