import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { installFakeApi, type FakeRequest } from '@/test/fake-api';
import { AuthUserProvider } from '@/domains/auth/user-context';
import type { AuthUser } from '@/domains/auth/types';
import SupplierDetailPage from '@/app/dashboard/superadmin/master/data-supplier/[id]/detail/page';

const navigation = vi.hoisted(() => ({ id: '7' }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: navigation.id }),
  useSearchParams: () => new URLSearchParams('from=superadmin'),
  usePathname: () => '/dashboard/superadmin/master/data-supplier',
}));

beforeEach(() => { navigation.id = '7'; });

const user: AuthUser = {
  id: 1, username: 'admin', email: 'admin@example.com', roleId: 1, roleName: 'Superadmin', isSuperadmin: true, permissions: [],
};
const supplier = (id: number) => ({ id, code: `S-${id}`, name: `Supplier ${id}`, bank: 'BCA', npwp: '123', phone: '08123', address: 'Jl. Gudang', pajak: 'PKP' });
const renderSuperadmin = (children: ReactNode) => render(<AuthUserProvider user={user}>{children}</AuthUserProvider>);

describe('superadmin supplier detail route', () => {
  it('renders goods for the route supplier and returns to the superadmin supplier list', async () => {
    navigation.id = '12';
    const year = new Date().getFullYear();
    const api = installFakeApi({
      'GET /api/v1/suppliers/12/prices': (request: FakeRequest) => ({
        supplierId: 12, supplierName: 'Supplier 12', pajak: 'PKP', tahun: Number(request.query.get('tahun')),
        rows: [{ itemId: 3, kode: 'LEM013', nama: 'Tripleks', satuan: 'lbr', kategori: 'Lembaran', harga: [15000, ...Array(11).fill(null)], rataRata: 15000 }],
      }),
    });
    renderSuperadmin(<SupplierDetailPage />);
    expect(await screen.findByText('Tripleks')).not.toBeNull();
    expect(screen.getByText('LEM013')).not.toBeNull();
    expect(screen.getByText(/untuk supplier Supplier 12/)).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Kembali' }).getAttribute('href')).toBe('/dashboard/superadmin/master/data-supplier');
    expect(new Set(api.calls('GET /api/v1/suppliers/12/prices').map((call) => call.query.get('tahun'))))
      .toEqual(new Set([String(year), String(year - 1)]));
  });
});
