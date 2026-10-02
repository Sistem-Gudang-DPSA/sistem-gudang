import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SidebarNav from './SidebarNav';
import type { AuthUser } from '../types';

const user = (permissions: string[], over: Partial<AuthUser> = {}): AuthUser => ({
  id: 1, username: 'u', email: 'u@x', roleId: 1, roleName: 'r', isSuperadmin: false, permissions, ...over,
});
const hrefs = () => screen.getAllByRole('link').map((a) => a.getAttribute('href'));
const link = (name: string) => screen.getByRole('link', { name });

describe('SidebarNav', () => {
  it('shows Overview only (no divisions heading) for a user without permissions', () => {
    render(<SidebarNav user={user([])} pathname="/dashboard" />);
    expect(hrefs()).toEqual(['/dashboard']);
    expect(screen.queryByText('Divisions')).toBeNull();
  });

  it('renders only permitted divisions and items for a purchasing user', () => {
    render(<SidebarNav user={user(['supplier.view', 'item.set-price', 'item.view', 'purchase-request.approve'])} pathname="/dashboard" />);
    expect(hrefs()).toEqual([
      '/dashboard',
      '/dashboard/purchasing/master/data-barang',
      '/dashboard/purchasing/master/data-supplier',
      '/dashboard/purchasing/laporan/rekap-pembelian',
    ]);
    expect(screen.getByText('Purchasing')).not.toBeNull();
    expect(screen.queryByText('Gudang')).toBeNull();
    expect(screen.queryByText('PPIC')).toBeNull();
    expect(screen.queryByText('Dashboard SA')).toBeNull();
  });

  it('hides items whose permission is missing inside a visible division', () => {
    render(<SidebarNav user={user(['inbound.view'])} pathname="/dashboard" />);
    expect(hrefs()).toEqual(['/dashboard', '/dashboard/gudang/transaksi/barang-masuk']);
  });

  it('report.view alone does not open the Gudang division', () => {
    render(<SidebarNav user={user(['report.view'])} pathname="/dashboard" />);
    expect(hrefs()).toEqual(['/dashboard']);
  });

  it('superadmin sees SA links and every division', () => {
    render(<SidebarNav user={user([], { isSuperadmin: true })} pathname="/dashboard" />);
    expect(hrefs()).toEqual(expect.arrayContaining(['/dashboard/superadmin', '/dashboard/superadmin/users', '/dashboard/gudang/master/data-barang', '/dashboard/ppic/master/data-barang', '/dashboard/purchasing/master/data-supplier']));
    expect(screen.getByText('Kelola Data User')).not.toBeNull();
  });

  it('highlights only the active item', () => {
    render(<SidebarNav user={user(['supplier.view', 'item.set-price', 'item.view'])} pathname="/dashboard/purchasing/master/data-supplier" />);
    expect(link('Data Supplier').className).toContain('bg-teal-500');
    expect(link('Data Barang').className).not.toContain('bg-teal-500');
    expect(link('Overview').className).not.toContain('bg-blue-600');
  });

  it('highlights Overview on /dashboard and the SA link on its path', () => {
    const { unmount } = render(<SidebarNav user={user([], { isSuperadmin: true })} pathname="/dashboard" />);
    expect(link('Overview').className).toContain('bg-blue-600');
    unmount();
    render(<SidebarNav user={user([], { isSuperadmin: true })} pathname="/dashboard/superadmin/users" />);
    expect(link('Kelola Data User').className).toContain('bg-blue-600');
    expect(link('Dashboard SA').className).not.toContain('bg-blue-600');
  });

  it('calls onNavigate when a link is clicked', () => {
    const onNavigate = vi.fn();
    render(<SidebarNav user={user([])} pathname="/dashboard" onNavigate={onNavigate} />);
    fireEvent.click(link('Overview'));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
