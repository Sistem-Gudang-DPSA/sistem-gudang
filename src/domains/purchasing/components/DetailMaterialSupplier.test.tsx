import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { fail, installFakeApi } from '@/test/fake-api';
import { withUser } from '@/test/as-user';
import { canAccess } from '@/domains/auth/nav';
import type { AuthUser } from '@/domains/auth/types';
import Page from '@/app/dashboard/purchasing/master/data-barang/[id]/page';

const route = vi.hoisted(() => ({ id: '1' }));
vi.mock('next/navigation', () => ({ useParams: () => route }));
const item = {
  id: 1, name: 'Triplex', code: 'BRG-1', unit: 'lembar', supplierId: 7, price: 999999, stock: 10,
  suppliers: [{ id: 7, name: 'PT Kayu', remainingStock: 2, price: 10000 }, { id: 8, name: 'CV Baja', remainingStock: 8, price: 20000 }],
};

describe('Detail supplier material Purchasing', () => {
  it('menampilkan supplier, sisa stok, harga, total dan rata-rata biasa dari material URL', async () => {
    route.id = '1';
    const api = installFakeApi({ 'GET /api/v1/items/1': item });
    render(withUser(<Page />, ['item.view']));
    expect(screen.getByRole('status').textContent).toContain('Memuat');
    expect(await screen.findByText('Triplex')).toBeTruthy();
    const table = screen.getByRole('table', { name: 'Supplier material Triplex' });
    const kayu = screen.getByText('PT Kayu').closest('tr')!;
    const baja = screen.getByText('CV Baja').closest('tr')!;
    expect(kayu.children[2].textContent).toBe('2');
    expect(within(kayu).getByText('10.000')).toBeTruthy();
    expect(baja.children[2].textContent).toBe('8');
    expect(within(baja).getByText('20.000')).toBeTruthy();
    expect(within(table).getByText('Total Harga Supplier').closest('tr')!.textContent).toContain('30.000');
    expect(within(table).getByText('Harga Rata-rata').closest('tr')!.textContent).toContain('15.000');
    expect(screen.queryByText('999.999')).toBeNull();
    expect(api.calls('GET /api/v1/items/1')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Kembali ke Data Barang' }).getAttribute('href')).toBe('/dashboard/purchasing/master/data-barang');
  });

  it('membedakan stok nol, stok tidak tersedia dan harga yang belum lengkap', async () => {
    route.id = '1';
    installFakeApi({ 'GET /api/v1/items/1': { ...item, suppliers: [{ ...item.suppliers[0], remainingStock: 0 }, { id: 8, name: 'CV Baja' }] } });
    render(withUser(<Page />, ['item.view']));
    const kayu = (await screen.findByText('PT Kayu')).closest('tr')!;
    const baja = screen.getByText('CV Baja').closest('tr')!;
    expect(kayu.children[2].textContent).toBe('0');
    expect(baja.children[2].textContent).toBe('-');
    expect(baja.children[3].textContent).toBe('-');
    expect(screen.getByText('Harga Rata-rata').closest('tr')!.lastChild!.textContent).toBe('-');
    expect(screen.getByRole('status').textContent).toContain('Harga sebagian supplier belum tersedia');
  });

  it('menampilkan pemetaan kosong tanpa mengisi supplier utama kembali', async () => {
    route.id = '1';
    installFakeApi({ 'GET /api/v1/items/1': { ...item, suppliers: [] } });
    render(withUser(<Page />, ['item.view']));
    expect(await screen.findByText('Belum ada supplier untuk material ini.')).toBeTruthy();
    expect(screen.queryByText('Supplier #7')).toBeNull();
    expect(screen.getByText('Harga Rata-rata').closest('tr')!.lastChild!.textContent).toBe('-');
  });

  it('menampilkan supplier utama lama dengan stok dan harga yang belum tersedia', async () => {
    route.id = '1';
    installFakeApi({ 'GET /api/v1/items/1': { ...item, suppliers: undefined } });
    render(withUser(<Page />, ['item.view']));
    const row = (await screen.findByText('Supplier #7')).closest('tr')!;
    expect(row.children[2].textContent).toBe('-');
    expect(row.children[3].textContent).toBe('-');
  });

  it('menampilkan kegagalan API tanpa data supplier', async () => {
    route.id = '1';
    installFakeApi({ 'GET /api/v1/items/1': fail(404, 'Material tidak ditemukan') });
    render(withUser(<Page />, ['item.view']));
    expect((await screen.findByRole('alert')).textContent).toBe('Material tidak ditemukan');
    expect(screen.queryByRole('table')).toBeNull();
  });

  it.each(['0', '-1', 'abc', '1.2'])('menolak ID %s sebelum memuat data', (id) => {
    route.id = id;
    const api = installFakeApi({});
    render(withUser(<Page />, ['item.view']));
    expect(screen.getByRole('alert').textContent).toBe('ID barang tidak valid.');
    expect(api.all()).toHaveLength(0);
  });

  it('menolak akses tanpa item.view sebelum memuat data', () => {
    route.id = '1';
    const api = installFakeApi({});
    render(withUser(<Page />, ['item.update', 'item.set-supplier']));
    expect(screen.getByRole('alert').textContent).toContain('tidak memiliki izin');
    expect(api.all()).toHaveLength(0);
  });

  it('memakai guard item.view khusus divisi Purchasing', () => {
    const user: AuthUser = { id: 1, username: 'u', email: 'u@x.id', roleId: 1, roleName: 'Purchasing', isSuperadmin: false, domainCode: 'purchasing', permissions: ['item.view', 'item.set-price'] };
    const path = '/dashboard/purchasing/master/data-barang/1';
    expect(canAccess(user, path)).toBe(true);
    expect(canAccess({ ...user, permissions: ['item.set-price'] }, path)).toBe(false);
    expect(canAccess({ ...user, domainCode: 'inventory' }, path)).toBe(false);
  });
});
