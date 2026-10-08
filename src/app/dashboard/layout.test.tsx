import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, fail } from '@/test/fake-api';
import DashboardLayout from './layout';

const router = { push: vi.fn(), replace: vi.fn(), back: vi.fn() };
let pathname = '/dashboard';
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => pathname, useParams: () => ({}) }));

const me = (permissions: string[], over = {}) => ({
  accessToken: 't',
  user: { id: 1, username: 'budi', email: 'b@x', roleId: 2, roleName: 'Staf PPIC', isSuperadmin: false, permissions, ...over },
});

beforeEach(() => {
  router.push.mockClear();
  router.replace.mockClear();
  pathname = '/dashboard';
  window.history.pushState({}, '', '/dashboard');
});

const renderLayout = () => render(<DashboardLayout><div>ISI HALAMAN</div></DashboardLayout>);

describe('dashboard layout guard', () => {
  it('shows a spinner (no content) while the session loads', () => {
    installFakeApi({ 'POST /api/v1/auth/refresh': me([]) });
    const { container } = renderLayout();
    expect(container.querySelector('.animate-spin')).not.toBeNull();
    expect(screen.queryByText('ISI HALAMAN')).toBeNull();
  });

  it('redirects unauthenticated users to login with the current path as next', async () => {
    installFakeApi({ 'POST /api/v1/auth/refresh': fail(401, 'Unauthorized') });
    window.history.pushState({}, '', '/dashboard/ppic/master/data-barang');
    renderLayout();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/?next=%2Fdashboard%2Fppic%2Fmaster%2Fdata-barang'));
    expect(screen.queryByText('ISI HALAMAN')).toBeNull();
    expect(screen.queryByText('Logout')).toBeNull();
  });

  it('renders children, user name and role for an allowed path', async () => {
    installFakeApi({ 'POST /api/v1/auth/refresh': me(['purchase-request.create']) });
    pathname = '/dashboard/ppic/transaksi/permintaan-pembelian';
    renderLayout();
    expect(await screen.findByText('ISI HALAMAN')).not.toBeNull();
    expect(screen.getByText('budi')).not.toBeNull();
    expect(screen.getByText('Staf PPIC')).not.toBeNull();
    expect(screen.queryByText('Akses Ditolak')).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shows AccessDenied instead of children when canAccess is false', async () => {
    installFakeApi({ 'POST /api/v1/auth/refresh': me(['purchase-request.create']) });
    pathname = '/dashboard/purchasing/master/data-supplier';
    renderLayout();
    expect(await screen.findByText('Akses Ditolak')).not.toBeNull();
    expect(screen.queryByText('ISI HALAMAN')).toBeNull();
    expect(screen.getByText('Kembali ke Beranda').getAttribute('href')).toBe('/dashboard/ppic');
    // chrome (sidebar) stays visible
    expect(screen.getAllByText('Logout').length).toBeGreaterThan(0);
  });

  it('denies non-superadmins on /dashboard/superadmin and allows superadmins', async () => {
    installFakeApi({ 'POST /api/v1/auth/refresh': me(['purchase-request.create']) });
    pathname = '/dashboard/superadmin/users';
    const { unmount } = renderLayout();
    expect(await screen.findByText('Akses Ditolak')).not.toBeNull();
    unmount();

    installFakeApi({ 'POST /api/v1/auth/refresh': me([], { isSuperadmin: true, roleName: 'Superadmin' }) });
    renderLayout();
    expect(await screen.findByText('ISI HALAMAN')).not.toBeNull();
    // Shown twice: as the role label in the header and as the superadmin-only division in the sidebar.
    expect(screen.getAllByText('Super Admin').length).toBeGreaterThanOrEqual(1);
  });

  it('always lets any logged-in user open /dashboard', async () => {
    installFakeApi({ 'POST /api/v1/auth/refresh': me([]) });
    renderLayout();
    expect(await screen.findByText('ISI HALAMAN')).not.toBeNull();
  });

  it('Logout calls the API then goes to the login page', async () => {
    const api = installFakeApi({ 'POST /api/v1/auth/refresh': me([]), 'POST /api/v1/auth/logout': null });
    renderLayout();
    await screen.findByText('ISI HALAMAN');
    fireEvent.click(screen.getAllByText('Logout')[0]);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/'));
    expect(api.calls('POST /api/v1/auth/logout')).toHaveLength(1);
  });

  it('opens and closes the mobile navigation drawer', async () => {
    installFakeApi({ 'POST /api/v1/auth/refresh': me(['purchase-request.create']) });
    renderLayout();
    await screen.findByText('ISI HALAMAN');
    expect(screen.queryByLabelText('Tutup menu')).toBeNull();
    fireEvent.click(screen.getByLabelText('Buka menu'));
    expect(screen.getByLabelText('Tutup menu')).not.toBeNull();
    fireEvent.click(screen.getByLabelText('Tutup menu'));
    expect(screen.queryByLabelText('Tutup menu')).toBeNull();
  });
});
