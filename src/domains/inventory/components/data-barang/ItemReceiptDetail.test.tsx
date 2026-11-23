import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fail, installFakeApi } from '@/test/fake-api';
import { AuthUserProvider } from '@/domains/auth/user-context';
import type { AuthUser } from '@/domains/auth/types';
import ItemReceiptDetail from './ItemReceiptDetail';

const route = vi.hoisted(() => ({ id: '2' }));
vi.mock('next/navigation', () => ({ useParams: () => route }));

const item = { id: 2, code: 'LEM014', name: 'Kayu Lapis', unit: 'lembar', category: 'Lembaran', price: 1000, stock: 30, supplierId: 7, locationId: 1, createdAt: null, updatedAt: null };

describe('Halaman detail penerimaan barang', () => {
  it('memuat identitas barang dari URL dan menampilkan tabel dummy serta link kembali khusus Superadmin', async () => {
    route.id = '2';
    const api = installFakeApi({ 'GET /api/v1/items/2': item });
    render(<ItemReceiptDetail />);
    expect(screen.getByRole('status').textContent).toContain('Memuat');
    expect(await screen.findByText('Kayu Lapis')).not.toBeNull();
    expect(api.calls('GET /api/v1/items/2')).toHaveLength(1);
    expect(screen.getByText(/Kode barang: LEM014/)).not.toBeNull();
    expect(screen.getByText(/Data dummy:/)).not.toBeNull();
    for (const name of ['Tanggal Masuk', 'Jumlah', 'Harga per Satuan', 'Supplier']) {
      expect(screen.getByRole('columnheader', { name })).not.toBeNull();
    }
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.getByText('18 November 2026')).not.toBeNull();
    expect(screen.getByText('10 November 2026')).not.toBeNull();
    expect(screen.getByText('25 lembar')).not.toBeNull();
    expect(screen.getByText(/Rp\s*125\.000/)).not.toBeNull();
    expect(screen.getByText(/Rp\s*120\.000/)).not.toBeNull();
    expect(screen.getByText('CV Mitra Sejahtera')).not.toBeNull();
    expect(screen.getAllByText('PT Sumber Material')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Kembali ke Data Barang' }).getAttribute('href')).toBe('/dashboard/superadmin/master/data-barang');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('menampilkan kegagalan memuat barang tanpa tabel dummy', async () => {
    route.id = '2';
    installFakeApi({ 'GET /api/v1/items/2': fail(404, 'Barang tidak ditemukan') });
    render(<ItemReceiptDetail />);
    expect((await screen.findByRole('alert')).textContent).toContain('Barang tidak ditemukan');
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('menolak ID tidak valid tanpa meminta data barang', () => {
    route.id = 'invalid';
    const api = installFakeApi({});
    render(<ItemReceiptDetail />);
    expect(screen.getByRole('alert').textContent).toBe('ID barang tidak valid.');
    expect(api.calls('GET /api/v1/items/NaN')).toHaveLength(0);
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('menolak akses tanpa permission item.view', () => {
    route.id = '2';
    const api = installFakeApi({ 'GET /api/v1/items/2': item });
    const user: AuthUser = { id: 1, username: 'u', email: 'u@x.id', roleId: 2, roleName: 'Staff', isSuperadmin: false, permissions: [] };
    render(<AuthUserProvider user={user}><ItemReceiptDetail /></AuthUserProvider>);
    expect(screen.getByRole('alert').textContent).toContain('tidak memiliki izin');
    expect(api.calls('GET /api/v1/items/2')).toHaveLength(0);
    expect(screen.queryByRole('table')).toBeNull();
  });
});
