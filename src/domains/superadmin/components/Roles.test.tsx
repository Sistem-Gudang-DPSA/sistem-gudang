import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, fail } from '@/test/fake-api';
import Roles from './Roles';

const perm = (id: number, code: string, resource: string, action: string) => ({ id, code, resource, action, domainId: null });
const permissions = [perm(1, 'user.update', 'user', 'update'), perm(2, 'user.create', 'user', 'create'), perm(3, 'item.read', 'item', 'read')];
const roles = [
  { id: 1, name: 'superadmin', domainId: null, isSuperadmin: true, permissionIds: [1, 2, 3] },
  { id: 2, name: 'ppic', domainId: 1, isSuperadmin: false, permissionIds: [1, 3] },
  { id: 3, name: 'gudang', domainId: 2, isSuperadmin: false, permissionIds: [] },
];

function setup(routes: Record<string, unknown> = {}) {
  const api = installFakeApi({
    'GET /api/v1/superadmin/roles': roles,
    'GET /api/v1/superadmin/permissions': permissions,
    ...routes,
  });
  render(<Roles />);
  return api;
}
const box = (code: string) => screen.getByRole('checkbox', { name: code }) as HTMLInputElement;
const saveBtn = () => screen.getByRole('button', { name: 'Simpan' }) as HTMLButtonElement;
async function pick(name: string) {
  await screen.findByRole('button', { name: 'ppic' });
  fireEvent.click(screen.getByRole('button', { name }));
}

describe('Roles list and permissions', () => {
  it('lists roles and shows permissions grouped by resource with checked state', async () => {
    setup();
    expect(await screen.findByRole('button', { name: 'ppic' })).not.toBeNull();
    expect(screen.getByText('Pilih role di sebelah kiri untuk melihat permission-nya.')).not.toBeNull();
    await pick('ppic');
    expect(screen.getByText('item')).not.toBeNull();
    expect(screen.getByText('user')).not.toBeNull();
    expect(box('user.update').checked).toBe(true);
    expect(box('user.create').checked).toBe(false);
    expect(box('item.read').checked).toBe(true);
    expect(box('user.update').disabled).toBe(false);
  });

  it('shows empty state', async () => {
    setup({ 'GET /api/v1/superadmin/roles': [] });
    expect(await screen.findByText('Belum ada role.')).not.toBeNull();
  });

  it('shows backend load error', async () => {
    setup({ 'GET /api/v1/superadmin/roles': fail(403, 'Forbidden') });
    expect(await screen.findByText('Forbidden')).not.toBeNull();
  });
});

describe('Roles save', () => {
  it('Simpan is disabled until a permission changes', async () => {
    setup();
    await pick('ppic');
    expect(saveBtn().disabled).toBe(true);
    fireEvent.click(box('user.create'));
    expect(saveBtn().disabled).toBe(false);
    fireEvent.click(box('user.create'));
    expect(saveBtn().disabled).toBe(true);
  });

  it('toggle + save PUTs the full sorted permissionIds list and reloads roles', async () => {
    const api = setup({ 'PUT /api/v1/superadmin/roles/2/permissions': null });
    await pick('ppic');
    fireEvent.click(box('user.create'));
    fireEvent.click(box('item.read'));
    fireEvent.click(saveBtn());
    await waitFor(() => expect(api.calls('PUT /api/v1/superadmin/roles/2/permissions')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/superadmin/roles/2/permissions')[0].body).toEqual({ permissionIds: [1, 2] });
    await waitFor(() => expect(api.calls('GET /api/v1/superadmin/roles').length).toBeGreaterThan(1));
  });

  it('shows backend save error', async () => {
    setup({ 'PUT /api/v1/superadmin/roles/2/permissions': fail(403, 'Missing permission: role.update') });
    await pick('ppic');
    fireEvent.click(box('user.create'));
    fireEvent.click(saveBtn());
    expect(await screen.findByText('Missing permission: role.update')).not.toBeNull();
  });
});

describe('Roles delete', () => {
  it('does nothing when confirm is cancelled', async () => {
    const api = setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await pick('ppic');
    fireEvent.click(screen.getByRole('button', { name: 'Hapus Role' }));
    expect(api.calls('DELETE /api/v1/superadmin/roles/2')).toHaveLength(0);
  });

  it('deletes with confirm naming the role, then reloads and clears selection', async () => {
    const api = setup({ 'DELETE /api/v1/superadmin/roles/2': null });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await pick('ppic');
    fireEvent.click(screen.getByRole('button', { name: 'Hapus Role' }));
    await waitFor(() => expect(api.calls('DELETE /api/v1/superadmin/roles/2')).toHaveLength(1));
    expect(confirm).toHaveBeenCalledWith('Hapus role ppic?');
    await waitFor(() => expect(api.calls('GET /api/v1/superadmin/roles').length).toBeGreaterThan(1));
    expect(screen.getByText('Pilih role di sebelah kiri untuk melihat permission-nya.')).not.toBeNull();
  });

  it('shows backend delete error (409 role still used by users)', async () => {
    setup({ 'DELETE /api/v1/superadmin/roles/2': fail(409, 'Role masih dipakai 3 user') });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await pick('ppic');
    fireEvent.click(screen.getByRole('button', { name: 'Hapus Role' }));
    expect(await screen.findByText('Role masih dipakai 3 user')).not.toBeNull();
  });
});

describe('Superadmin role is locked', () => {
  it('disables checkboxes, hides save and delete', async () => {
    setup();
    await pick('superadmin');
    expect(box('user.update').checked).toBe(true);
    expect(box('user.update').disabled).toBe(true);
    expect(box('item.read').disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Hapus Role' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Simpan' })).toBeNull();
    expect(screen.getByText('Role superadmin memiliki semua akses dan tidak bisa diubah.')).not.toBeNull();
  });
});
