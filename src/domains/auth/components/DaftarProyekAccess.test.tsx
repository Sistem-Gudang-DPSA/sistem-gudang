import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { installFakeApi } from '@/test/fake-api';
import { AuthUserProvider } from '../user-context';
import { canAccess } from '../nav';
import type { AuthUser } from '../types';
import DaftarProyek from './DaftarProyek';
import SidebarNav from './SidebarNav';

vi.mock('./LaporMasalahButton', () => ({ default: () => null }));

const path = '/dashboard/daftar-proyek';
const roles = ['inventory', 'ppic', 'purchasing', 'keuangan', 'produksi', 'gudang-barang-jadi', 'kustom', null];

describe('Daftar Proyek untuk semua role', () => {
  it.each(roles)('role %s tanpa permission tambahan dapat melihat menu, membuka halaman, dan membaca proyek', async (domainCode) => {
    const user: AuthUser = { id: 1, username: 'u', email: 'u@example.test', roleId: 2, roleName: domainCode ?? 'Tanpa Divisi', domainCode, isSuperadmin: false, permissions: [] };
    installFakeApi({ 'GET /api/v1/tracking/spk': [{ noSpk: 'SPK-1', client: 'PT Contoh', projectName: 'Proyek Contoh' }] });
    render(<AuthUserProvider user={user}><SidebarNav user={user} pathname={path} /><DaftarProyek /></AuthUserProvider>);
    expect(canAccess(user, path)).toBe(true);
    expect(screen.getByRole('link', { name: 'Daftar Proyek' }).getAttribute('href')).toBe(path);
    expect(await screen.findByText('SPK-1')).toBeTruthy();
    expect(screen.getByText('PT Contoh')).toBeTruthy();
    expect(screen.getByText('Proyek Contoh')).toBeTruthy();
  });

  it('Superadmin juga dapat membuka menu dan membaca proyek', async () => {
    const user: AuthUser = { id: 1, username: 'admin', email: 'a@example.test', roleId: 1, roleName: 'Superadmin', isSuperadmin: true, permissions: [] };
    installFakeApi({ 'GET /api/v1/tracking/spk': [{ noSpk: 'SPK-1', client: 'PT Contoh' }] });
    render(<AuthUserProvider user={user}><SidebarNav user={user} pathname={path} /><DaftarProyek /></AuthUserProvider>);
    expect(canAccess(user, path)).toBe(true);
    expect(screen.getByRole('link', { name: 'Daftar Proyek' }).getAttribute('href')).toBe(path);
    expect(await screen.findByText('SPK-1')).toBeTruthy();
  });
});
