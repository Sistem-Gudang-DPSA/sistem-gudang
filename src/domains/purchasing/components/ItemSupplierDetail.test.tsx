import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fail, installFakeApi } from '@/test/fake-api';
import { withUser } from '@/test/as-user';
import { canAccess } from '@/domains/auth/nav';
import type { AuthUser } from '@/domains/auth/types';
import Page from '@/app/dashboard/purchasing/master/data-barang/[id]/page';

const route = vi.hoisted(() => ({ id: '1' }));
vi.mock('next/navigation', () => ({ useParams: () => route }));
const item = { id: 1, name: 'Triplex', code: 'BRG-1', unit: 'lembar', supplierId: 7, suppliers: [{ id: 7, name: 'PT Kayu' }, { id: 8, name: 'CV Baja' }] };

describe('Halaman supplier material Purchasing', () => {
  it('memuat material dari URL beserta seluruh supplier dan link kembali khusus Purchasing', async () => {
    route.id = '1';
    const api = installFakeApi({ 'GET /api/v1/items/1': item });
    render(withUser(<Page />, ['item.view']));
    expect(screen.getByRole('status').textContent).toContain('Memuat');
    expect(await screen.findByText('Triplex')).not.toBeNull();
    expect(screen.getByText(/Kode barang: BRG-1/)).not.toBeNull();
    expect(screen.getByText('Daftar Supplier (2)')).not.toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('PT Kayu')).not.toBeNull();
    expect(screen.getByText('CV Baja')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Kembali ke Data Barang' }).getAttribute('href')).toBe('/dashboard/purchasing/master/data-barang');
    expect(api.calls('GET /api/v1/items/1')).toHaveLength(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each([{ ...item, suppliers: [] }, { ...item, suppliers: undefined, supplierId: null }])('menampilkan keadaan kosong tanpa mengarang supplier: %j', async (data) => {
    route.id = '1';
    installFakeApi({ 'GET /api/v1/items/1': data });
    render(<Page />);
    expect(await screen.findByText('Belum ada supplier yang dipetakan ke material ini.')).not.toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('tetap mengenali supplier utama pada respons lama tanpa daftar suppliers', async () => {
    route.id = '1';
    installFakeApi({ 'GET /api/v1/items/1': { ...item, suppliers: undefined } });
    render(<Page />);
    expect(await screen.findByText('Supplier #7')).not.toBeNull();
  });

  it('menampilkan kegagalan API tanpa daftar supplier', async () => {
    route.id = '1';
    installFakeApi({ 'GET /api/v1/items/1': fail(404, 'Barang tidak ditemukan') });
    render(<Page />);
    expect((await screen.findByRole('alert')).textContent).toContain('Barang tidak ditemukan');
    expect(screen.queryByRole('list')).toBeNull();
  });

  it.each(['0', '-1', 'abc'])('menolak ID %s tanpa mengambil data', (id) => {
    route.id = id;
    const api = installFakeApi({});
    render(<Page />);
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

  it('mewarisi guard item.view dan divisi Purchasing dari halaman daftar', () => {
    const user: AuthUser = { id: 1, username: 'u', email: 'u@x.id', roleId: 1, roleName: 'Purchasing', isSuperadmin: false, domainCode: 'purchasing', permissions: ['item.view', 'item.set-price'] };
    const path = '/dashboard/purchasing/master/data-barang/1';
    expect(canAccess(user, path)).toBe(true);
    expect(canAccess({ ...user, permissions: ['item.set-price'] }, path)).toBe(false);
    expect(canAccess({ ...user, domainCode: 'inventory' }, path)).toBe(false);
  });
});
