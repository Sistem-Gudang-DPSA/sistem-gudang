import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import { AuthUserProvider } from '@/domains/auth/user-context';
import StockOpnameDetail from './StockOpnameDetail';
import StockOpname from './StockOpname';
import RekapStokOpname from './RekapStokOpname';

const nav = vi.hoisted(() => ({ pathname: '', id: '7' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname, useParams: () => ({ id: nav.id }), useRouter: () => ({ push: vi.fn() }) }));

const row = { id: 7, month: 3, year: 2026, status: 'SUBMITTED', progress: { filled: 1, total: 1 }, createdBy: 1, createdAt: '2026-03-31T00:00:00Z', lineCount: 1, notes: null };
const detail = { ...row, lines: [{ itemId: 1, itemName: 'Triplex', itemCode: 'BRG-1', category: 'Bahan', unit: 'lbr', systemQty: 10, physicalQty: 8, difference: -2, systemPrice: 1000, physicalPrice: 1000, note: 'Hasil audit' }] };
const paths = [
  '/dashboard/gudang/transaksi/stock-opname',
  '/dashboard/gudang-barang-jadi/transaksi/stock-opname',
  '/dashboard/gudang/laporan/stock-opname',
  '/dashboard/gudang-barang-jadi/laporan/stock-opname',
  '/dashboard/purchasing/laporan/stock-opname',
  '/dashboard/keuangan/laporan/stock-opname',
];

describe.each(paths)('Stok opname %s', (base) => {
  it('detail mengarah ke halaman di divisi yang sama dan Download disembunyikan', async () => {
    nav.pathname = base;
    installFakeApi({ 'GET /api/v1/stock-opname': paged([row]) });
    render(base.includes('/laporan/') ? <RekapStokOpname /> : <StockOpname />);
    expect((await screen.findByRole('link', { name: /Detail/ })).getAttribute('href')).toBe(`${base}/7`);
    expect(screen.queryByRole('button', { name: 'Download' })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('halaman detail menampilkan kolom hasil final dan link kembali ke daftar semula', async () => {
    nav.id = '7';
    nav.pathname = `${base}/7`;
    installFakeApi({ 'GET /api/v1/stock-opname/7': detail });
    render(<StockOpnameDetail />);
    expect(await screen.findByText('Triplex')).not.toBeNull();
    for (const label of ['Jumlah Administrasi', 'Jumlah Fisik', 'Jumlah Selisih', 'Keterangan']) {
      expect(screen.getByRole('columnheader', { name: label })).not.toBeNull();
    }
    expect(screen.getByText('-2')).not.toBeNull();
    expect(screen.getByText('Hasil audit')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Kembali ke Stok Opname' }).getAttribute('href')).toBe(base);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Stok opname detail: validasi dan permission', () => {
  it('menampilkan kegagalan API', async () => {
    nav.id = '7';
    installFakeApi({ 'GET /api/v1/stock-opname/7': fail(404, 'Opname tidak ditemukan') });
    render(<StockOpnameDetail />);
    expect((await screen.findByRole('alert')).textContent).toBe('Opname tidak ditemukan');
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('menolak ID tidak valid', () => {
    nav.id = 'abc';
    installFakeApi({});
    render(<StockOpnameDetail />);
    expect(screen.getByRole('alert').textContent).toContain('tidak valid');
  });

  it('tidak meminta data tanpa izin yang membuka daftar Rekap', () => {
    nav.id = '7';
    const api = installFakeApi({ 'GET /api/v1/stock-opname/7': detail });
    const user = { id: 1, username: 'u', email: 'u@x.id', roleId: 2, roleName: 'Staff', isSuperadmin: false, permissions: [] };
    render(<AuthUserProvider user={user}><StockOpnameDetail /></AuthUserProvider>);
    expect(screen.getByRole('alert').textContent).toContain('tidak punya izin');
    expect(api.calls('GET /api/v1/stock-opname/7')).toHaveLength(0);
  });

  it.each([
    ['Purchasing (supplier.create)', 'supplier.create'],
    ['Purchasing (item.set-price)', 'item.set-price'],
    ['Keuangan (report.view)', 'report.view'],
  ])('membuka detail untuk user %s tanpa stock-opname.view', async (_, permission) => {
    nav.id = '7';
    const api = installFakeApi({ 'GET /api/v1/stock-opname/7': detail });
    const user = { id: 1, username: 'u', email: 'u@x.id', roleId: 2, roleName: 'Staff', isSuperadmin: false, permissions: [permission] };
    const { unmount } = render(<AuthUserProvider user={user}><StockOpnameDetail /></AuthUserProvider>);
    expect(await screen.findByText('Triplex')).not.toBeNull();
    expect(api.calls('GET /api/v1/stock-opname/7')).toHaveLength(1);
    unmount();
  });
});
