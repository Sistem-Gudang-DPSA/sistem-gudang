import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import SuperadminDashboard from './SuperadminDashboard';

const user = (id: number) => ({ id, username: `user${id}`, email: `u${id}@x.id`, roleId: 2, roleName: 'ppic', createdAt: null, updatedAt: null });

describe('SuperadminDashboard', () => {
  it('shows division cards with links and the latest users with total', async () => {
    const api = installFakeApi({ 'GET /api/v1/superadmin/users': paged([user(1), user(2)], { total: 12 }) });
    render(<SuperadminDashboard />);
    expect(await screen.findByText('user1')).not.toBeNull();
    expect(screen.getByText('u2@x.id')).not.toBeNull();
    expect(screen.getByText('Lihat Semua (12)').getAttribute('href')).toBe('/dashboard/superadmin/users');
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(expect.arrayContaining(['/dashboard/gudang', '/dashboard/gudang-barang-jadi', '/dashboard/ppic', '/dashboard/purchasing']));
    expect(api.calls('GET /api/v1/superadmin/users')[0].query.get('pageSize')).toBe('10');
  });

  it('shows empty state', async () => {
    installFakeApi({ 'GET /api/v1/superadmin/users': paged([]) });
    render(<SuperadminDashboard />);
    expect(await screen.findByText('Belum ada user.')).not.toBeNull();
  });

  it('shows the API error', async () => {
    installFakeApi({ 'GET /api/v1/superadmin/users': fail(500, 'Boom') });
    render(<SuperadminDashboard />);
    expect(await screen.findByText('Boom')).not.toBeNull();
  });
});
