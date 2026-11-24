import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import { AuthUserProvider } from '@/domains/auth/user-context';
import type { AuthUser } from '@/domains/auth/types';
import DataLokasi from './DataLokasi';
import DataLokasiSuperadmin from '@/domains/superadmin/components/DataLokasi';

const location = { id: 1, code: 'A.1.1', rackName: 'A', rackNumber: '1.1', description: '' };

const user = (isSuperadmin: boolean): AuthUser => ({
  id: 1, username: 'u', email: 'u@example.test', roleId: 1, roleName: isSuperadmin ? 'Superadmin' : 'Koor Inventory',
  isSuperadmin, domainCode: isSuperadmin ? null : 'inventory',
  permissions: isSuperadmin ? [] : ['location.view', 'location.create', 'location.update', 'location.delete'],
});

async function renderAs(isSuperadmin: boolean) {
  installFakeApi({ 'GET /api/v1/locations': paged([location]), 'GET /api/v1/items': paged([]) });
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

const otherLocation = { id: 2, code: 'B.2.3', rackName: 'B', rackNumber: '2.3', description: 'Rak kedua' };

for (const [division, Component] of [['Gudang', DataLokasi], ['Superadmin', DataLokasiSuperadmin]] as const) {
  describe(`DataLokasi ${division}: edit satu baris`, () => {
    async function setup(updateResult: unknown = location, permissions?: string[]) {
      const api = installFakeApi({
        'GET /api/v1/locations': paged([location, otherLocation]),
        'GET /api/v1/items': paged([]),
        'PUT /api/v1/locations/1': updateResult,
      });
      const auth = permissions ? { ...user(false), permissions } : user(division === 'Superadmin');
      render(<AuthUserProvider user={auth}><Component /></AuthUserProvider>);
      await screen.findByText('A.1.1');
      return api;
    }

    it('hanya membuka baris pilihan dan Batal mengembalikan nilai awal', async () => {
      const api = await setup();
      fireEvent.click(screen.getByRole('button', { name: 'Edit lokasi A.1.1' }));
      expect(screen.queryByLabelText('Nama rak B.2.3')).toBeNull();
      expect(screen.getAllByRole('button', { name: 'Simpan' })).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Edit lokasi B.2.3' }).hasAttribute('disabled')).toBe(true);
      fireEvent.change(screen.getByLabelText('Nama rak A.1.1'), { target: { value: 'C' } });
      fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
      expect(screen.queryByLabelText('Nama rak A.1.1')).toBeNull();
      expect(screen.getByRole('button', { name: 'Edit lokasi A.1.1' })).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Edit lokasi B.2.3' }));
      expect(screen.getByLabelText('Nama rak B.2.3')).toBeTruthy();
      expect(screen.queryByLabelText('Nama rak A.1.1')).toBeNull();
      expect(api.calls('PUT /api/v1/locations/1')).toHaveLength(0);
    });

    it('menyimpan hanya lokasi pilihan, termasuk mengosongkan keterangan, lalu menutup edit', async () => {
      const api = await setup();
      fireEvent.click(screen.getByRole('button', { name: 'Edit lokasi A.1.1' }));
      fireEvent.change(screen.getByLabelText('Nama rak A.1.1'), { target: { value: 'c' } });
      fireEvent.change(screen.getByLabelText('Keterangan A.1.1'), { target: { value: '   ' } });
      fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
      await waitFor(() => expect(screen.queryByLabelText('Nama rak A.1.1')).toBeNull());
      expect(api.calls('PUT /api/v1/locations/1')[0].body).toEqual({ code: 'C.1.1', rackName: 'C', rackNumber: '1.1', description: null });
      expect(api.calls('PUT /api/v1/locations/2')).toHaveLength(0);
    });

    it('menolak format rak tidak valid tanpa mengirim perubahan', async () => {
      const api = await setup();
      fireEvent.click(screen.getByRole('button', { name: 'Edit lokasi A.1.1' }));
      fireEvent.change(screen.getByLabelText('Nomer rak A.1.1'), { target: { value: '0.01' } });
      fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
      await screen.findByText(/Nama rak harus berupa huruf/);
      expect(screen.getByLabelText('Nomer rak A.1.1')).toHaveProperty('value', '0.01');
      expect(api.calls('PUT /api/v1/locations/1')).toHaveLength(0);
    });

    it('mempertahankan input dan menampilkan kegagalan dari server', async () => {
      await setup(fail(409, 'Kode lokasi sudah digunakan.'));
      fireEvent.click(screen.getByRole('button', { name: 'Edit lokasi A.1.1' }));
      fireEvent.change(screen.getByLabelText('Nama rak A.1.1'), { target: { value: 'B' } });
      fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
      await screen.findByText('Kode lokasi sudah digunakan.');
      expect(screen.getByLabelText('Nama rak A.1.1')).toHaveProperty('value', 'B');
    });

    it('meminta konfirmasi sebelum pencarian membuang edit', async () => {
      await setup();
      fireEvent.click(screen.getByRole('button', { name: 'Edit lokasi A.1.1' }));
      fireEvent.change(screen.getByLabelText('Nama rak A.1.1'), { target: { value: 'C' } });
      fireEvent.change(screen.getByPlaceholderText('Cari...'), { target: { value: 'B' } });
      expect(screen.getByRole('dialog')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Lanjut edit' }));
      expect(screen.getByLabelText('Nama rak A.1.1')).toHaveProperty('value', 'C');
      fireEvent.change(screen.getByPlaceholderText('Cari...'), { target: { value: 'B' } });
      fireEvent.click(screen.getByRole('button', { name: 'Buang perubahan' }));
      await waitFor(() => expect(screen.queryByLabelText('Nama rak A.1.1')).toBeNull());
      expect(screen.getByPlaceholderText('Cari...')).toHaveProperty('value', 'B');
    });

    it('menyembunyikan aksi edit tanpa permission update', async () => {
      await setup(location, ['location.view']);
      expect(screen.queryByRole('button', { name: /Edit lokasi/ })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Batch' })).toBeNull();
    });
  });
}
