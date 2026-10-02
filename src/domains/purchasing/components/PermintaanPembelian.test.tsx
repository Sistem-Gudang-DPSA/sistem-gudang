import { describe, it, expect, vi } from 'vitest';
import { render, cleanup, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, fail } from '@/test/fake-api';
import PermintaanPembelian from './PermintaanPembelian';
import { AuthUserProvider } from '@/domains/auth/user-context';

vi.setConfig({ testTimeout: 20000 });

vi.mock('next/navigation', () => ({ useParams: () => ({ id: '7' }), useRouter: () => ({ push: vi.fn() }), usePathname: () => '/' }));

const detail = (status: string) => ({
  request: {
    id: 7, type: 'purchase-request', requestedBy: 1, requestedByDomainId: 1, currentStepOrder: 1, cycle: 1, status, createdAt: '2026-03-01T00:00:00Z',
    payload: { bagian: 'Produksi', namaPemohon: 'Budi', jabatan: 'Staff', tanggalPengajuan: '2026-03-05', items: [{ namaBarang: 'Triplex', qty: 10, satuan: 'lbr', proyek: 'Proyek A', noSpk: 'SPK-1' }] },
  },
  actions: [],
});
function setup(status: string, extra: Record<string, unknown> = {}) {
  const api = installFakeApi({ 'GET /api/v1/approvals/7': detail(status), ...extra });
  render(<PermintaanPembelian />);
  return api;
}
const btn = (t: string) => screen.getByText(t) as HTMLButtonElement;
const gets = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/approvals/7').length;

describe('purchasing PermintaanPembelian', () => {
  it('shows request data and links back to the purchasing rekap', async () => {
    setup('pending');
    expect(await screen.findByText('Triplex')).not.toBeNull();
    expect(screen.getByLabelText('Kembali ke Rekap Pembelian').getAttribute('href')).toBe('/dashboard/purchasing/laporan/rekap-pembelian');
  });

  it('pending shows Tolak, Revisi, Setuju and no Buat PO', async () => {
    setup('pending');
    await screen.findByText('Setuju');
    expect(screen.getByText('Tolak')).not.toBeNull();
    expect(screen.getByText('Revisi')).not.toBeNull();
    expect(screen.queryByText('Buat PO')).toBeNull();
  });

  it('approved shows only a Buat PO link', async () => {
    setup('approved');
    const link = await screen.findByText('Buat PO');
    expect(link.getAttribute('href')).toBe('/dashboard/purchasing/laporan/rekap-pembelian/buat-po/7');
    expect(screen.queryByText('Setuju')).toBeNull();
    expect(screen.queryByText('Tolak')).toBeNull();
  });

  it.each([['rejected', 'Ditolak'], ['revision_requested', 'Perlu Revisi']])('%s shows status text and no actions', async (st, label) => {
    setup(st);
    await screen.findByText('Triplex');
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    expect(screen.queryByText('Setuju')).toBeNull();
    expect(screen.queryByText('Buat PO')).toBeNull();
  });

  it('Setuju POSTs approve and reloads the request', async () => {
    const api = setup('pending', { 'POST /api/v1/approvals/7/approve': {} });
    fireEvent.click(await screen.findByText('Setuju'));
    await waitFor(() => expect(api.calls('POST /api/v1/approvals/7/approve')).toHaveLength(1));
    expect(api.calls('POST /api/v1/approvals/7/approve')[0].body).toEqual({});
    await waitFor(() => expect(gets(api)).toBe(2));
  });

  it.each([
    ['Tolak', 'penolakan', 'reject'],
    ['Revisi', 'revisi', 'request-revision'],
  ])('%s requires a catatan then POSTs %s with the note', async (label, caption, path) => {
    const api = setup('pending', { [`POST /api/v1/approvals/7/${path}`]: {} });
    fireEvent.click(await screen.findByText(label));
    expect(screen.getByLabelText(`Catatan ${caption}`)).not.toBeNull();
    fireEvent.click(btn('Kirim'));
    expect(await screen.findByText('Catatan wajib diisi.')).not.toBeNull();
    expect(api.calls(`POST /api/v1/approvals/7/${path}`)).toHaveLength(0);
    fireEvent.change(screen.getByLabelText(`Catatan ${caption}`), { target: { value: '  Harga terlalu tinggi ' } });
    fireEvent.click(btn('Kirim'));
    await waitFor(() => expect(api.calls(`POST /api/v1/approvals/7/${path}`)).toHaveLength(1));
    expect(api.calls(`POST /api/v1/approvals/7/${path}`)[0].body).toEqual({ note: 'Harga terlalu tinggi' });
    await waitFor(() => expect(gets(api)).toBe(2));
  });

  it('whitespace-only note is rejected', async () => {
    const api = setup('pending');
    fireEvent.click(await screen.findByText('Tolak'));
    fireEvent.change(screen.getByLabelText('Catatan penolakan'), { target: { value: '   ' } });
    fireEvent.click(btn('Kirim'));
    expect(await screen.findByText('Catatan wajib diisi.')).not.toBeNull();
    expect(api.calls('POST /api/v1/approvals/7/reject')).toHaveLength(0);
  });

  it('catatan has maxLength 500 and Batal returns to the action buttons', async () => {
    setup('pending');
    fireEvent.click(await screen.findByText('Revisi'));
    expect((screen.getByLabelText('Catatan revisi') as HTMLTextAreaElement).maxLength).toBe(500);
    fireEvent.click(btn('Batal'));
    expect(screen.getByText('Setuju')).not.toBeNull();
  });

  it('shows backend error from approve', async () => {
    setup('pending', { 'POST /api/v1/approvals/7/approve': fail(403, 'Missing permission: approval.approve') });
    fireEvent.click(await screen.findByText('Setuju'));
    expect(await screen.findByText('Missing permission: approval.approve')).not.toBeNull();
    expect(screen.getByText('Setuju')).not.toBeNull();
  });

  it('shows backend error from reject', async () => {
    setup('pending', { 'POST /api/v1/approvals/7/reject': fail(409, 'Sudah diproses') });
    fireEvent.click(await screen.findByText('Tolak'));
    fireEvent.change(screen.getByLabelText('Catatan penolakan'), { target: { value: 'x' } });
    fireEvent.click(btn('Kirim'));
    expect(await screen.findByText('Sudah diproses')).not.toBeNull();
  });
});

describe('permissions', () => {
  const user = (permissions: string[], isSuperadmin = false) => ({ id: 1, username: 'u', email: 'u@x.id', roleId: 1, roleName: 'R', isSuperadmin, permissions });
  const renderAs = (status: string, u: ReturnType<typeof user>) => {
    installFakeApi({ 'GET /api/v1/approvals/7': detail(status) });
    render(<AuthUserProvider user={u}><PermintaanPembelian /></AuthUserProvider>);
  };
  it('view-only user sees the request but no decision buttons', async () => {
    renderAs('pending', user(['purchase-request.view']));
    await screen.findByText('Triplex');
    for (const t of ['Setuju', 'Tolak', 'Revisi']) expect(screen.queryByText(t)).toBeNull();
  });
  it('approver sees decision buttons', async () => {
    renderAs('pending', user(['purchase-request.approve']));
    await screen.findByText('Setuju');
    expect(screen.getByText('Tolak')).not.toBeNull();
  });
  it('Buat PO needs purchase-order.create', async () => {
    renderAs('approved', user(['purchase-request.approve']));
    await screen.findByText('Triplex');
    expect(screen.queryByText('Buat PO')).toBeNull();
    cleanup();
    renderAs('approved', user(['purchase-order.create']));
    await screen.findByText('Buat PO');
  });
  it('superadmin sees all', async () => {
    renderAs('pending', user([], true));
    await screen.findByText('Setuju');
  });
});
