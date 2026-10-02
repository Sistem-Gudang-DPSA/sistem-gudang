import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import { vi as viTimeout } from 'vitest';
viTimeout.setConfig({ testTimeout: 30000 });
import ViewDokubah from './ViewDokubah';
import { withUser } from './as-user';

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

  it.each(['DRAFT', 'PENDING', 'REJECTED'])('status %s: shows it and offers the Edit link', async (status) => {
    installFakeApi({ 'GET /api/v1/dokubah/7': { ...base, status }, 'GET /api/v1/dokubah': listRoute });
    render(<ViewDokubah />);
    await screen.findByText('Triplex');
    const label = status[0] + status.slice(1).toLowerCase();
    expect((screen.getByLabelText('Status Dokubah') as HTMLInputElement).value).toBe(label);
    expect(screen.getAllByText('Edit').map((a) => a.closest('a')?.getAttribute('href'))).toEqual(
      Array(2).fill('/dashboard/ppic/transaksi/dokubah/edit-material/7'),
    );
  });

  it('APPROVED: no Edit link (backend answers 409)', async () => {
    installFakeApi({ 'GET /api/v1/dokubah/7': base, 'GET /api/v1/dokubah': listRoute });
    render(<ViewDokubah />);
    await screen.findByText('Triplex');
    expect(screen.queryAllByText('Edit')).toHaveLength(0);
  });

  it('loads the dokubah through GET /dokubah/{id}', async () => {
    const api = installFakeApi({ 'GET /api/v1/dokubah/7': base, 'GET /api/v1/dokubah': listRoute });
    render(<ViewDokubah />);
    await screen.findByText('Triplex');
    expect(api.calls('GET /api/v1/dokubah/7')).toHaveLength(1);
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


describe('permissions', () => {
  it('a view-only user keeps the screen but not the actions', async () => {
    installFakeApi({ 'GET /api/v1/dokubah/7': { ...base, status: 'DRAFT' }, 'GET /api/v1/dokubah': listRoute });
    render(withUser(<ViewDokubah />, ['dokubah.view']));
    await screen.findByText('Triplex');
    expect(screen.queryAllByText('Edit')).toHaveLength(0);
  });

  it.each([
    ['holds the permission', ['dokubah.update'], false],
    ['is a superadmin', [], true],
  ])('a user who %s sees the actions', async (_label, perms, isSuperadmin) => {
    installFakeApi({ 'GET /api/v1/dokubah/7': { ...base, status: 'DRAFT' }, 'GET /api/v1/dokubah': listRoute });
    render(withUser(<ViewDokubah />, perms, isSuperadmin));
    await screen.findByText('Triplex');
    expect(screen.getAllByText('Edit')).toHaveLength(2);
  });
});

describe('approval flow', () => {
  const routes = (over: object, extra: Record<string, unknown> = {}) => ({
    'GET /api/v1/dokubah/7': { ...base, ...over }, 'GET /api/v1/dokubah': listRoute, ...extra,
  });
  const riwayat = [
    { aksi: 'SUBMITTED', catatan: null, actorName: 'Budi', createdAt: '2026-05-02T10:00:00Z' },
    { aksi: 'REJECTED', catatan: 'Kuota kurang', actorName: 'Sari', createdAt: '2026-05-03T10:00:00Z' },
  ];
  const ppic = ['dokubah.update'];
  const approver = ['dokubah.approve'];

  it.each(['DRAFT', 'REJECTED'])('submits from %s and shows the response', async (status) => {
    const api = installFakeApi(routes({ status }, { 'POST /api/v1/dokubah/7/submit': { ...base, status: 'PENDING' } }));
    render(withUser(<ViewDokubah />, ppic));
    fireEvent.click(await screen.findByText('Kirim untuk Approval'));
    await waitFor(() => expect((screen.getByLabelText('Status Dokubah') as HTMLInputElement).value).toBe('Pending'));
    expect(api.calls('POST /api/v1/dokubah/7/submit')).toHaveLength(1);
    expect(screen.queryByText('Kirim untuk Approval')).toBeNull();
  });

  it('no submit button for Approved, Pending or without permission', async () => {
    for (const [status, perms] of [['APPROVED', ppic], ['PENDING', ppic], ['DRAFT', approver]] as const) {
      installFakeApi(routes({ status }));
      const { unmount } = render(withUser(<ViewDokubah />, [...perms]));
      await screen.findByText('Triplex');
      expect(screen.queryByText('Kirim untuk Approval')).toBeNull();
      unmount();
    }
  });

  it('refuses to submit without materials', async () => {
    const api = installFakeApi(routes({ status: 'DRAFT', bahan: [] }));
    render(withUser(<ViewDokubah />, ppic));
    fireEvent.click(await screen.findByText('Kirim untuk Approval'));
    expect(await screen.findByText(/minimal satu bahan/)).toBeTruthy();
    expect(api.calls('POST /api/v1/dokubah/7/submit')).toHaveLength(0);
  });

  it('approves a pending dokubah', async () => {
    const api = installFakeApi(routes({ status: 'PENDING' }, { 'POST /api/v1/dokubah/7/approve': { ...base, status: 'APPROVED', riwayat } }));
    render(withUser(<ViewDokubah />, approver));
    fireEvent.click(await screen.findByText('Setuju'));
    await waitFor(() => expect((screen.getByLabelText('Status Dokubah') as HTMLInputElement).value).toBe('Approved'));
    expect(api.calls('POST /api/v1/dokubah/7/approve')[0].body).toBeUndefined();
    expect(screen.queryByText('Setuju')).toBeNull();
  });

  it('rejects with a trimmed note, and validates an empty one', async () => {
    const api = installFakeApi(routes({ status: 'PENDING' }, { 'POST /api/v1/dokubah/7/reject': { ...base, status: 'REJECTED', riwayat } }));
    render(withUser(<ViewDokubah />, approver));
    fireEvent.click(await screen.findByText('Tolak'));
    const box = screen.getByLabelText('Alasan penolakan') as HTMLTextAreaElement;
    expect(box.maxLength).toBe(500);
    fireEvent.change(box, { target: { value: '   ' } });
    fireEvent.click(screen.getByText('Kirim'));
    expect(await screen.findByText('Alasan penolakan wajib diisi.')).toBeTruthy();
    expect(api.calls('POST /api/v1/dokubah/7/reject')).toHaveLength(0);
    fireEvent.change(box, { target: { value: '  Kuota kurang  ' } });
    fireEvent.click(screen.getByText('Kirim'));
    await waitFor(() => expect((screen.getByLabelText('Status Dokubah') as HTMLInputElement).value).toBe('Rejected'));
    expect(api.calls('POST /api/v1/dokubah/7/reject')[0].body).toEqual({ note: 'Kuota kurang' });
  });

  it('Batal closes the reject form', async () => {
    installFakeApi(routes({ status: 'PENDING' }));
    render(withUser(<ViewDokubah />, approver));
    fireEvent.click(await screen.findByText('Tolak'));
    fireEvent.click(screen.getByText('Batal'));
    expect(screen.queryByLabelText('Alasan penolakan')).toBeNull();
  });

  it('hides approve and reject without dokubah.approve', async () => {
    installFakeApi(routes({ status: 'PENDING' }));
    render(withUser(<ViewDokubah />, ppic));
    await screen.findByText('Triplex');
    expect(screen.queryByText('Setuju')).toBeNull();
    expect(screen.queryByText('Tolak')).toBeNull();
  });

  it('shows riwayat table and the rejection reason for a Rejected dokubah', async () => {
    installFakeApi(routes({ status: 'REJECTED', riwayat }));
    render(withUser(<ViewDokubah />, ppic));
    expect(await screen.findByText('Riwayat Persetujuan')).toBeTruthy();
    expect(screen.getByText('Diajukan')).toBeTruthy();
    expect(screen.getByText('Ditolak')).toBeTruthy();
    expect(screen.getByText('Budi')).toBeTruthy();
    expect(screen.getByText('Sari')).toBeTruthy();
    expect(screen.getAllByText('Kuota kurang')).toHaveLength(2); // table cell + note near the status
    expect(screen.getByRole('note').textContent).toContain('Kuota kurang');
  });

  it('no riwayat table when empty', async () => {
    installFakeApi(routes({ status: 'DRAFT' }));
    render(<ViewDokubah />);
    await screen.findByText('Triplex');
    expect(screen.queryByText('Riwayat Persetujuan')).toBeNull();
  });

  it('shows the backend error and re-enables the buttons', async () => {
    installFakeApi(routes({ status: 'PENDING' }, { 'POST /api/v1/dokubah/7/approve': fail(409, 'Status sudah berubah') }));
    render(withUser(<ViewDokubah />, approver));
    fireEvent.click(await screen.findByText('Setuju'));
    expect(await screen.findByText('Status sudah berubah')).toBeTruthy();
    expect((screen.getByText('Setuju') as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables the buttons while a request is in flight', async () => {
    let release!: (v: unknown) => void;
    const gate = new Promise((r) => { release = r; });
    installFakeApi(routes({ status: 'PENDING' }, { 'POST /api/v1/dokubah/7/approve': { ...base, status: 'APPROVED' } }));
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (...a: Parameters<typeof fetch>) => {
      if (String(a[0]).endsWith('/approve')) await gate;
      return realFetch(...a);
    }) as typeof fetch;
    render(withUser(<ViewDokubah />, approver));
    fireEvent.click(await screen.findByText('Setuju'));
    await waitFor(() => expect((screen.getByText('Setuju') as HTMLButtonElement).disabled).toBe(true));
    expect((screen.getByText('Tolak') as HTMLButtonElement).disabled).toBe(true);
    release(null);
    await waitFor(() => expect(screen.queryByText('Setuju')).toBeNull());
  });
});
