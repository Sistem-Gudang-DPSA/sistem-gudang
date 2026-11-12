import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { installFakeApi, paged } from '@/test/fake-api';
import { AuthUserProvider } from '@/domains/auth/user-context';
import type { AuthUser } from '@/domains/auth/types';
import DataSupplier from './DataSupplier';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => '/superadmin/data-supplier',
}));

const supplier = (id: number) => ({ id, code: `S${id}`, name: `Supplier ${id}`, bank: 'BCA', npwp: '1', phone: '08', address: 'Jl', pajak: 'PKP' });

const userWith = (permissions: string[]): AuthUser => ({ id: 1, username: 'u', email: 'u@x.id', roleId: 2, roleName: 'Staff', isSuperadmin: false, permissions });

function setup(user: AuthUser) {
  installFakeApi({ 'GET /api/v1/suppliers': paged([supplier(1)]) });
  render(<AuthUserProvider user={user}><DataSupplier /></AuthUserProvider>);
  return screen.findByText('Supplier 1');
}

describe('superadmin DataSupplier', () => {
  it('shows Import Excel only to users with supplier.create', async () => {
    await setup(userWith(['supplier.create']));
    expect(screen.getByRole('button', { name: /Import Excel/ })).not.toBeNull();
  });

  it('hides Import Excel without supplier.create', async () => {
    await setup(userWith([]));
    expect(screen.queryByRole('button', { name: /Import Excel/ })).toBeNull();
  });

  it('links the detail button back to the superadmin screen', async () => {
    await setup(userWith([]));
    const link = screen.getByRole('link', { name: 'Detail Barang' });
    expect(link.getAttribute('href')).toContain('from=superadmin');
  });
});
