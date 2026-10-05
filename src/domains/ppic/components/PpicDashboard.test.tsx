import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import { AuthUserProvider } from '@/domains/auth/user-context';
import PpicDashboard from './PpicDashboard';

const total = (n: number) => paged([], { total: n });
const req = (id: number, status: string, items = 2) => ({
  id, type: 'purchase-request', requestedBy: 1, requestedByDomainId: 1, currentStepOrder: 1, cycle: 1, status,
  createdAt: '2026-05-0' + id + 'T00:00:00Z',
  payload: { bagian: 'Produksi', tanggalPengajuan: `2026-05-0${id}`, items: Array.from({ length: items }, () => ({})) },
});

const routes = () => ({
  'GET /api/v1/dokubah': total(7),
  'GET /api/v1/spk-internal': total(11),
  'GET /api/v1/approvals': (r: { query: URLSearchParams }) =>
    r.query.get('pageSize') === '5' ? paged([req(1, 'pending'), req(2, 'revision_requested', 3)], { total: 9 })
      : total(r.query.get('status') === 'revision_requested' ? 3 : 4),
  'GET /api/v1/penawaran-harga': total(5),
});

const user = (permissions: string[]) => ({ id: 1, username: 'u', email: 'u@x', roleId: 1, roleName: 'PPIC', isSuperadmin: false, permissions });

const card = async (label: string) => (await screen.findByText(label)).closest('a') as HTMLElement;

vi.setConfig({ testTimeout: 30000 });

describe('PpicDashboard', () => {
  it('shows numbers, filters and links from the API', async () => {
    const api = installFakeApi(routes());
    render(<PpicDashboard />);
    expect(screen.getByText('Dashboard PPIC')).toBeTruthy();
    const dokubah = await card('Dokubah Menunggu Persetujuan');
    expect(await within(dokubah).findByText('7')).toBeTruthy();
    expect(dokubah.getAttribute('href')).toBe('/dashboard/ppic/transaksi/dokubah');
    expect(await within(await card('SPK Internal')).findByText('11')).toBeTruthy();
    expect(await within(await card('Permintaan Pembelian Perlu Revisi')).findByText('3')).toBeTruthy();
    expect(await within(await card('Permintaan Pembelian Menunggu Purchasing')).findByText('4')).toBeTruthy();
    const sph = await card('Penawaran Harga Draft');
    expect(await within(sph).findByText('5')).toBeTruthy();
    expect(sph.getAttribute('href')).toBe('/dashboard/ppic/master/penawaran-harga');
    expect(api.calls('GET /api/v1/dokubah')[0].query.get('status')).toBe('PENDING');
    expect(api.calls('GET /api/v1/penawaran-harga')[0].query.get('status')).toBe('DRAFT');
    const statuses = api.calls('GET /api/v1/approvals').map((c) => c.query.get('status'));
    expect(statuses).toContain('revision_requested');
    expect(statuses).toContain('pending');
    expect(api.calls('GET /api/v1/approvals').every((c) => c.query.get('type') === 'purchase-request')).toBe(true);
  });

  it('lists the latest purchase requests with status and detail links', async () => {
    installFakeApi(routes());
    render(<PpicDashboard />);
    expect(await screen.findByText('Produksi - 3 barang')).toBeTruthy();
    expect(screen.getByText('Produksi - 2 barang')).toBeTruthy();
    const row = screen.getByText('Produksi - 3 barang').closest('tr') as HTMLElement;
    expect(within(row).getByText('Perlu Revisi')).toBeTruthy();
    expect(within(row).getByText('2026-05-02')).toBeTruthy();
    expect(within(row).getByRole('link').getAttribute('href')).toBe('/dashboard/ppic/laporan/rekap-pembelian/permintaan-pembelian/2');
  });

  it('shows an empty state', async () => {
    installFakeApi({ ...routes(), 'GET /api/v1/approvals': paged([]) });
    render(<PpicDashboard />);
    expect(await screen.findByText('Belum ada permintaan pembelian.')).toBeTruthy();
  });

  it('a failing endpoint shows its error while other cards render', async () => {
    installFakeApi({ ...routes(), 'GET /api/v1/dokubah': fail(500, 'Dokubah error') });
    render(<PpicDashboard />);
    expect(await screen.findByText('Dokubah error')).toBeTruthy();
    expect(await within(await card('SPK Internal')).findByText('11')).toBeTruthy();
  });

  it('renders only what the permissions allow', async () => {
    const api = installFakeApi(routes());
    render(<AuthUserProvider user={user(['dokubah.view'])}><PpicDashboard /></AuthUserProvider>);
    expect(await within(await card('Dokubah Menunggu Persetujuan')).findByText('7')).toBeTruthy();
    expect(screen.queryByText('SPK Internal')).toBeNull();
    expect(screen.queryByText('Penawaran Harga Draft')).toBeNull();
    expect(screen.queryByText('Permintaan Pembelian Terbaru')).toBeNull();
    expect(api.calls('GET /api/v1/approvals')).toHaveLength(0);
    expect(api.calls('GET /api/v1/spk-internal')).toHaveLength(0);
  });

  it('pembelian permission shows the approvals cards and table', async () => {
    installFakeApi(routes());
    render(<AuthUserProvider user={user(['purchase-request.create'])}><PpicDashboard /></AuthUserProvider>);
    expect(await screen.findByText('Permintaan Pembelian Terbaru')).toBeTruthy();
    expect(screen.getByText('Permintaan Pembelian Perlu Revisi')).toBeTruthy();
    expect(screen.queryByText('Dokubah Menunggu Persetujuan')).toBeNull();
  });
});
