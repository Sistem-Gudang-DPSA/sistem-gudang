import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { installFakeApi, fail } from '@/test/fake-api';
import Roles from './Roles';

const perm = (id: number, code: string, resource: string, action: string) => ({ id, code, resource, action, domainId: null });
const permissions = [perm(1, 'user.update', 'user', 'update'), perm(2, 'user.create', 'user', 'create'), perm(3, 'item.read', 'item', 'read')];
const roles = [
  { id: 1, name: 'superadmin', domainId: null, isSuperadmin: true, permissionIds: [1, 2, 3] },
  { id: 2, name: 'ppic', domainId: 1, isSuperadmin: false, permissionIds: [1, 3] },
  { id: 3, name: 'gudang', domainId: 2, isSuperadmin: false, permissionIds: [] },
];
const domains = [
  { id: 1, code: 'ppic', name: 'PPIC' },
  { id: 2, code: 'inventory', name: 'Inventory' },
];

function setup(routes: Record<string, unknown> = {}) {
  const api = installFakeApi({
    'GET /api/v1/superadmin/roles': roles,
    'GET /api/v1/superadmin/permissions': permissions,
    'GET /api/v1/superadmin/domains': domains,
    ...routes,
  });
  render(<Roles />);
  return api;
}
const box = (label: string) => screen.getByRole('checkbox', { name: label }) as HTMLInputElement;
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
    expect(screen.getByText('Data Barang')).not.toBeNull();
    expect(screen.getByText('User')).not.toBeNull();
    expect(box('Ubah User').checked).toBe(true);
    expect(box('Tambah User').checked).toBe(false);
    expect(box('item.read').checked).toBe(true);
    expect(box('Ubah User').disabled).toBe(false);
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
    fireEvent.click(box('Tambah User'));
    expect(saveBtn().disabled).toBe(false);
    fireEvent.click(box('Tambah User'));
    expect(saveBtn().disabled).toBe(true);
  });

  it('toggle + save PUTs the full sorted permissionIds list and reloads roles', async () => {
    const api = setup({ 'PUT /api/v1/superadmin/roles/2/permissions': null });
    await pick('ppic');
    fireEvent.click(box('Tambah User'));
    fireEvent.click(box('item.read'));
    fireEvent.click(saveBtn());
    await waitFor(() => expect(api.calls('PUT /api/v1/superadmin/roles/2/permissions')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/superadmin/roles/2/permissions')[0].body).toEqual({ permissionIds: [1, 2] });
    await waitFor(() => expect(api.calls('GET /api/v1/superadmin/roles').length).toBeGreaterThan(1));
  });

  it('shows backend save error', async () => {
    setup({ 'PUT /api/v1/superadmin/roles/2/permissions': fail(403, 'Missing permission: role.update') });
    await pick('ppic');
    fireEvent.click(box('Tambah User'));
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
    expect(box('Ubah User').checked).toBe(true);
    expect(box('Ubah User').disabled).toBe(true);
    expect(box('item.read').disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Hapus Role' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Simpan' })).toBeNull();
    expect(screen.getByText('Role superadmin memiliki semua akses dan tidak bisa diubah.')).not.toBeNull();
  });
});

describe('Roles divisi in list', () => {
  it('shows the divisi name under each non-superadmin role', async () => {
    setup();
    await screen.findByRole('button', { name: 'ppic' });
    expect(screen.getByRole('button', { name: 'ppic' }).parentElement?.textContent).toContain('PPIC');
    expect(screen.getByRole('button', { name: 'gudang' }).parentElement?.textContent).toContain('Inventory');
  });
});

describe('Roles create', () => {
  const createForm = () => screen.getByRole('form', { name: 'Tambah role' });

  it('creates a role with the typed name and selected divisi, then reloads roles', async () => {
    const api = setup({ 'POST /api/v1/superadmin/roles': { id: 4, name: 'Kasir', domainId: 2, isSuperadmin: false, permissionIds: [] } });
    await screen.findByRole('button', { name: 'ppic' });
    fireEvent.change(within(createForm()).getByLabelText('Nama role'), { target: { value: 'Kasir' } });
    fireEvent.change(within(createForm()).getByLabelText('Divisi'), { target: { value: '2' } });
    fireEvent.click(within(createForm()).getByRole('button', { name: 'Tambah' }));
    await waitFor(() => expect(api.calls('POST /api/v1/superadmin/roles')).toHaveLength(1));
    expect(api.calls('POST /api/v1/superadmin/roles')[0].body).toEqual({ name: 'Kasir', domainId: 2, isSuperadmin: false });
    await waitFor(() => expect(api.calls('GET /api/v1/superadmin/roles').length).toBeGreaterThan(1));
  });

  it('sends domainId null when Tanpa divisi is kept', async () => {
    const api = setup({ 'POST /api/v1/superadmin/roles': { id: 4, name: 'Umum', domainId: null, isSuperadmin: false, permissionIds: [] } });
    await screen.findByRole('button', { name: 'ppic' });
    fireEvent.change(within(createForm()).getByLabelText('Nama role'), { target: { value: 'Umum' } });
    fireEvent.click(within(createForm()).getByRole('button', { name: 'Tambah' }));
    await waitFor(() => expect(api.calls('POST /api/v1/superadmin/roles')).toHaveLength(1));
    expect(api.calls('POST /api/v1/superadmin/roles')[0].body).toEqual({ name: 'Umum', domainId: null, isSuperadmin: false });
  });

  it('asks for a name before calling the API', async () => {
    const api = setup();
    await screen.findByRole('button', { name: 'ppic' });
    fireEvent.click(within(createForm()).getByRole('button', { name: 'Tambah' }));
    expect(await screen.findByText('Nama role wajib diisi.')).not.toBeNull();
    expect(api.calls('POST /api/v1/superadmin/roles')).toHaveLength(0);
  });

  it('shows backend create error', async () => {
    setup({ 'POST /api/v1/superadmin/roles': fail(409, 'Nama role sudah dipakai') });
    await screen.findByRole('button', { name: 'ppic' });
    fireEvent.change(within(createForm()).getByLabelText('Nama role'), { target: { value: 'ppic' } });
    fireEvent.click(within(createForm()).getByRole('button', { name: 'Tambah' }));
    expect(await screen.findByText('Nama role sudah dipakai')).not.toBeNull();
  });
});

describe('Roles update divisi', () => {
  const editForm = () => screen.getByRole('form', { name: 'Edit role' });
  const saveRoleBtn = () => screen.getByRole('button', { name: 'Simpan Role' }) as HTMLButtonElement;

  it('Simpan Role is disabled until the name or divisi changes', async () => {
    setup();
    await pick('ppic');
    expect(saveRoleBtn().disabled).toBe(true);
    fireEvent.change(within(editForm()).getByLabelText('Divisi'), { target: { value: '2' } });
    expect(saveRoleBtn().disabled).toBe(false);
  });

  it('changing divisi PUTs the role with its name and new domainId, then reloads roles', async () => {
    const api = setup({ 'PUT /api/v1/superadmin/roles/2': { id: 2, name: 'ppic', domainId: 2, isSuperadmin: false, permissionIds: [1, 3] } });
    await pick('ppic');
    fireEvent.change(within(editForm()).getByLabelText('Divisi'), { target: { value: '2' } });
    fireEvent.click(saveRoleBtn());
    await waitFor(() => expect(api.calls('PUT /api/v1/superadmin/roles/2')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/superadmin/roles/2')[0].body).toEqual({ name: 'ppic', domainId: 2 });
    await waitFor(() => expect(api.calls('GET /api/v1/superadmin/roles').length).toBeGreaterThan(1));
  });

  it('renaming a role sends the trimmed name and null for Tanpa divisi', async () => {
    const api = setup({ 'PUT /api/v1/superadmin/roles/2': { id: 2, name: 'Tim PPIC', domainId: null, isSuperadmin: false, permissionIds: [1, 3] } });
    await pick('ppic');
    fireEvent.change(within(editForm()).getByLabelText('Nama role'), { target: { value: '  Tim PPIC ' } });
    fireEvent.change(within(editForm()).getByLabelText('Divisi'), { target: { value: '' } });
    fireEvent.click(saveRoleBtn());
    await waitFor(() => expect(api.calls('PUT /api/v1/superadmin/roles/2')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/superadmin/roles/2')[0].body).toEqual({ name: 'Tim PPIC', domainId: null });
  });

  it('shows backend update error', async () => {
    setup({ 'PUT /api/v1/superadmin/roles/2': fail(403, 'Missing permission: role.update') });
    await pick('ppic');
    fireEvent.change(within(editForm()).getByLabelText('Divisi'), { target: { value: '2' } });
    fireEvent.click(saveRoleBtn());
    expect(await screen.findByText('Missing permission: role.update')).not.toBeNull();
  });

  it('superadmin role has no edit form', async () => {
    setup();
    await pick('superadmin');
    expect(screen.queryByRole('form', { name: 'Edit role' })).toBeNull();
  });
});
