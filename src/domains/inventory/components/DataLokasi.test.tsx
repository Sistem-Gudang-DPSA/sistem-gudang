import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { installFakeApi, paged } from '@/test/fake-api';
import { AuthUserProvider } from '@/domains/auth/user-context';
import type { AuthUser } from '@/domains/auth/types';
import DataLokasi from './DataLokasi';

const location = { id: 1, code: 'A.1.1', rackName: 'A', rackNumber: '1.1', description: '' };

const user = (isSuperadmin: boolean): AuthUser => ({
  id: 1, username: 'u', email: 'u@example.test', roleId: 1, roleName: isSuperadmin ? 'Superadmin' : 'Koor Inventory',
  isSuperadmin, domainCode: isSuperadmin ? null : 'inventory',
  permissions: isSuperadmin ? [] : ['location.view', 'location.create', 'location.update', 'location.delete'],
});

async function renderAs(isSuperadmin: boolean) {
  installFakeApi({ 'GET /api/v1/locations': paged([location]) });
  render(<AuthUserProvider user={user(isSuperadmin)}><DataLokasi /></AuthUserProvider>);
  await screen.findByText('A.1.1');
}

describe('DataLokasi: mode edit di kolom Aksi', () => {
  it('menampilkan tombol Edit di baris dan Simpan/Batal setelah masuk mode edit', async () => {
    await renderAs(true);
    expect(screen.queryByText('Mode Edit')).toBeNull();
    const edit = screen.getByRole('button', { name: 'Edit lokasi A.1.1' });
    fireEvent.click(edit);
    expect(screen.getByLabelText('Nama rak A.1.1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Batal' })).toBeTruthy();
  });
});

describe('DataLokasi: import dan hapus hanya Superadmin', () => {
  it('menampilkan Import Excel dan Hapus untuk Superadmin', async () => {
    await renderAs(true);
    expect(screen.getByRole('button', { name: /Import Excel/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hapus' })).toBeTruthy();
  });

  it('menyembunyikan Import Excel dan Hapus untuk role lain walau punya permission lokasi', async () => {
    await renderAs(false);
    expect(screen.queryByRole('button', { name: /Import Excel/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Hapus' })).toBeNull();
    // Aksi lain yang memang untuk Gudang tetap ada.
    expect(screen.getByRole('button', { name: 'Batch' })).toBeTruthy();
  });
});
