import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, paged } from '@/test/fake-api';
import { downloadBlob } from '@/shared/lib/download';
import POBarang from './POBarang';
import { AuthUserProvider } from '@/domains/auth/user-context';

vi.mock('@/shared/lib/download', () => ({ downloadBlob: vi.fn() }));

const request = (id: number) => ({
  id, type: 'purchase-request', status: 'approved', createdAt: '2026-05-01T00:00:00Z',
  payload: { notes: `Permintaan ${id}`, items: [] },
});
const lastQ = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/approvals').at(-1)!.query;

describe('purchasing POBarang', () => {
  it('sends the sort column and direction and returns to page 1', async () => {
    const api = installFakeApi({ 'GET /api/v1/approvals': paged([request(1)], { total: 45 }) });
    render(<POBarang />);
    await screen.findByText('Permintaan 1');
    expect(screen.getByText('Lihat Permintaan').getAttribute('href')).toBe(
      '/dashboard/purchasing/transaksi/buat-po-barang/permintaan-pembelian/1',
    );
    expect(screen.getByText('Buat PO').getAttribute('href')).toBe(
      '/dashboard/purchasing/transaksi/buat-po-barang/buat-po/1?from=po-barang',
    );
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    await waitFor(() => expect(lastQ(api).get('page')).toBe('3'));
    fireEvent.click(screen.getByRole('button', { name: /Tanggal/ }));
    await waitFor(() => expect(lastQ(api).get('sortBy')).toBe('date'));
    expect(lastQ(api).get('sortDir')).toBe('asc');
    expect(lastQ(api).get('page')).toBe('1');
  });

  it('menyembunyikan Buat PO saat permintaan belum disetujui atau sudah dipesan semua', async () => {
    installFakeApi({ 'GET /api/v1/approvals': paged([request(1), { ...request(2), purchaseStatus: 'PURCHASED' }, { ...request(3), status: 'pending' }]) });
    render(<POBarang />);
    await screen.findByText('Permintaan 1');
    const links = screen.getAllByText('Buat PO').map((el) => el.getAttribute('href'));
    expect(links).toEqual(['/dashboard/purchasing/transaksi/buat-po-barang/buat-po/1?from=po-barang']);
  });

  it('menyembunyikan Lihat Permintaan bagi pengguna yang hanya punya purchase-order.view', async () => {
    installFakeApi({ 'GET /api/v1/approvals': paged([request(1)]) });
    render(
      <AuthUserProvider user={{ id: 1, username: 'p', email: 'p@example.test', roleId: 4, roleName: 'Staf Purchasing', isSuperadmin: false, domainCode: 'purchasing', permissions: ['purchase-order.view'] }}>
        <POBarang />
      </AuthUserProvider>,
    );
    await screen.findByText('Permintaan 1');
    expect(screen.queryByText('Lihat Permintaan')).toBeNull();
  });

  it('exports a CSV with matching headers, escaped fields, and can export twice', async () => {
    installFakeApi({ 'GET /api/v1/approvals': paged([{ ...request(1), payload: { notes: 'Paku "besar", 5kg', items: [] } }]) });
    render(<POBarang />);
    await screen.findByText('Paku "besar", 5kg');
    const btn = screen.getByRole('button', { name: /Export Excel/ });
    fireEvent.click(btn);
    fireEvent.click(btn);
    const calls = vi.mocked(downloadBlob).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][1]).toBe('Rekap_Pembelian_halaman-1.csv');
    const [head, row] = (await (calls[0][0] as Blob).text()).split('\r\n');
    expect(head).toBe('"No","Tanggal","Permintaan","Status"');
    expect(row).toBe('"1","2026-05-01","Paku ""besar"", 5kg","Disetujui"');
  });
});
