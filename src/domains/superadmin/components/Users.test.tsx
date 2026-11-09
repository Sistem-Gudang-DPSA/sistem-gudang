import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import Users from './Users';

vi.setConfig({ testTimeout: 20000 });

const user = (id: number, over = {}) => ({ id, username: `user${id}`, email: `u${id}@x.id`, roleId: 2, roleName: 'ppic', createdAt: '2026-01-02', updatedAt: null, ...over });
const roles = [{ id: 1, name: 'superadmin', domainId: null }, { id: 2, name: 'ppic', domainId: 1 }, { id: 3, name: 'gudang', domainId: 2 }];

function setup(routes: Record<string, unknown> = {}) {
  const api = installFakeApi({ 'GET /api/v1/superadmin/users': paged([user(1), user(2, { roleName: 'gudang', roleId: 3 })]), 'GET /api/v1/superadmin/roles': roles, ...routes });
  render(<Users />);
  return api;
}
const lastQuery = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/superadmin/users').at(-1)!.query;
const ph = (p: string) => screen.getByPlaceholderText(p) as HTMLInputElement;
const roleBtn = (name: string) => screen.getByRole('button', { name });

async function openAdd() {
  await screen.findByText('user1');
  fireEvent.click(screen.getByText('Tambah User Baru', { selector: 'button' }));
  await screen.findByRole('heading', { name: 'Tambah User Baru' });
  await screen.findByRole('button', { name: 'gudang' });
}
// the form has native `required`/minLength; jsdom enforces them on form.requestSubmit, not fireEvent.click, so submit the form directly.
const submitForm = () => fireEvent.submit(screen.getByText('Simpan Akun User').closest('form')!);

describe('Users list', () => {
  it('shows users with role and count, page 1 pageSize 20', async () => {
    const api = setup();
    expect(await screen.findByText('user1')).not.toBeNull();
    expect(screen.getByText('u2@x.id')).not.toBeNull();
    expect(screen.getByText('Total User').nextSibling?.textContent).toBe('2');
    expect(lastQuery(api).get('page')).toBe('1');
    expect(lastQuery(api).get('pageSize')).toBe('20');
  });

  it('page 2 then search resets to page 1', async () => {
    const api = setup({ 'GET /api/v1/superadmin/users': paged([user(1)], { total: 45 }) });
    await screen.findByText('user1');
    fireEvent.click(screen.getByText('2'));
    await waitFor(() => expect(lastQuery(api).get('page')).toBe('2'));
    fireEvent.change(ph('Cari username, email, atau role...'), { target: { value: 'bud' } });
    await waitFor(() => expect(lastQuery(api).get('search')).toBe('bud'));
    expect(lastQuery(api).get('page')).toBe('1');
    expect(ph('Cari username, email, atau role...').maxLength).toBe(100);
  });

  it('shows empty state and load error', async () => {
    setup({ 'GET /api/v1/superadmin/users': paged([]) });
    expect(await screen.findByText('Tidak ada data user ditemukan.')).not.toBeNull();
  });

  it('shows backend load error', async () => {
    setup({ 'GET /api/v1/superadmin/users': fail(403, 'Forbidden') });
    expect(await screen.findByText('Forbidden')).not.toBeNull();
  });
});

describe('Users form', () => {
  it('has maxLength username 50, email 191, password 100 and minLength 8 on password', async () => {
    setup();
    await openAdd();
    expect(ph('johndoe').maxLength).toBe(50);
    expect(ph('john@example.com').maxLength).toBe(191);
    expect(ph('Min. 8 karakter').maxLength).toBe(100);
    expect(ph('Min. 8 karakter').minLength).toBe(8);
    expect(ph('Min. 8 karakter').required).toBe(true);
  });

  it('username is lowercased with whitespace removed', async () => {
    setup();
    await openAdd();
    fireEvent.change(ph('johndoe'), { target: { value: 'John Doe' } });
    expect(ph('johndoe').value).toBe('johndoe');
  });

  it('role select lists roles from the API and highlights the chosen one', async () => {
    setup();
    await openAdd();
    expect(roleBtn('superadmin')).not.toBeNull();
    fireEvent.click(roleBtn('gudang'));
    expect(roleBtn('gudang').className).toContain('border-blue-500');
    expect(roleBtn('ppic').className).not.toContain('border-blue-500');
  });

  it('create POSTs username, email, password, numeric roleId and reloads', async () => {
    const api = setup({ 'POST /api/v1/superadmin/users': { id: 9 } });
    await openAdd();
    fireEvent.change(ph('johndoe'), { target: { value: 'budi' } });
    fireEvent.change(ph('john@example.com'), { target: { value: 'budi@x.id' } });
    fireEvent.change(ph('Min. 8 karakter'), { target: { value: 'rahasia123' } });
    fireEvent.click(roleBtn('gudang'));
    submitForm();
    await waitFor(() => expect(api.calls('POST /api/v1/superadmin/users')).toHaveLength(1));
    expect(api.calls('POST /api/v1/superadmin/users')[0].body).toEqual({ username: 'budi', email: 'budi@x.id', password: 'rahasia123', roleId: 3 });
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Tambah User Baru' })).toBeNull());
    expect(api.calls('GET /api/v1/superadmin/users').length).toBeGreaterThan(1);
  });

  it('requires all fields incl. password and role on create', async () => {
    const api = setup();
    await openAdd();
    fireEvent.change(ph('johndoe'), { target: { value: 'budi' } });
    fireEvent.change(ph('john@example.com'), { target: { value: 'budi@x.id' } });
    submitForm();
    expect(await screen.findByText('Lengkapi semua data.')).not.toBeNull();
    expect(api.calls('POST /api/v1/superadmin/users')).toHaveLength(0);
  });

  it('rejects a password shorter than 8 characters on create and edit', async () => {
    const api = setup({ 'PUT /api/v1/superadmin/users/2': { id: 2 } });
    await openAdd();
    fireEvent.change(ph('johndoe'), { target: { value: 'budi' } });
    fireEvent.change(ph('john@example.com'), { target: { value: 'budi@x.id' } });
    fireEvent.change(ph('Min. 8 karakter'), { target: { value: 'pendek' } });
    fireEvent.click(roleBtn('ppic'));
    submitForm();
    expect(await screen.findByText('Password minimal 8 karakter.')).not.toBeNull();
    expect(api.calls('POST /api/v1/superadmin/users')).toHaveLength(0);
  });

  it('rejects a short password when editing but allows blank', async () => {
    const api = setup({ 'PUT /api/v1/superadmin/users/2': { id: 2 } });
    await screen.findByText('user2');
    fireEvent.click(screen.getAllByTitle('Edit user')[1]);
    await screen.findByRole('heading', { name: 'Edit User' });
    fireEvent.change(ph('Min. 8 karakter'), { target: { value: 'pendek' } });
    submitForm();
    expect(await screen.findByText('Password minimal 8 karakter.')).not.toBeNull();
    expect(api.calls('PUT /api/v1/superadmin/users/2')).toHaveLength(0);
  });

  it('edit prefills without password, password optional, omitted from PUT when blank', async () => {
    const api = setup({ 'PUT /api/v1/superadmin/users/2': { id: 2 } });
    await screen.findByText('user2');
    fireEvent.click(screen.getAllByTitle('Edit user')[1]);
    await screen.findByRole('heading', { name: 'Edit User' });
    expect(ph('johndoe').value).toBe('user2');
    expect(ph('Min. 8 karakter').value).toBe('');
    expect(ph('Min. 8 karakter').required).toBe(false);
    expect(roleBtn('gudang').className).toContain('border-blue-500');
    fireEvent.change(ph('johndoe'), { target: { value: 'baru' } });
    fireEvent.click(roleBtn('ppic'));
    submitForm();
    await waitFor(() => expect(api.calls('PUT /api/v1/superadmin/users/2')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/superadmin/users/2')[0].body).toEqual({ username: 'baru', email: 'u2@x.id', roleId: 2 });
  });

  it('edit sends password when filled', async () => {
    const api = setup({ 'PUT /api/v1/superadmin/users/1': { id: 1 } });
    await screen.findByText('user1');
    fireEvent.click(screen.getAllByTitle('Edit user')[0]);
    await screen.findByRole('heading', { name: 'Edit User' });
    fireEvent.change(ph('Min. 8 karakter'), { target: { value: 'passwordbaru' } });
    submitForm();
    await waitFor(() => expect(api.calls('PUT /api/v1/superadmin/users/1')).toHaveLength(1));
    expect((api.calls('PUT /api/v1/superadmin/users/1')[0].body as { password: string }).password).toBe('passwordbaru');
  });

  it('shows backend error (e.g. duplicate email) and keeps the modal open', async () => {
    await (async () => { setup({ 'POST /api/v1/superadmin/users': fail(409, 'Email sudah terdaftar') }); await openAdd(); })();
    fireEvent.change(ph('johndoe'), { target: { value: 'budi' } });
    fireEvent.change(ph('john@example.com'), { target: { value: 'budi@x.id' } });
    fireEvent.change(ph('Min. 8 karakter'), { target: { value: 'rahasia123' } });
    fireEvent.click(roleBtn('gudang'));
    submitForm();
    expect(await screen.findByText('Email sudah terdaftar')).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Tambah User Baru' })).not.toBeNull();
  });
});

describe('Users delete', () => {
  it('does nothing when confirm is cancelled', async () => {
    const api = setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await screen.findByText('user1');
    fireEvent.click(screen.getAllByTitle('Hapus user')[0]);
    expect(api.calls('DELETE /api/v1/superadmin/users/1')).toHaveLength(0);
  });

  it('deletes with confirm naming the user, then reloads', async () => {
    const api = setup({ 'DELETE /api/v1/superadmin/users/1': null });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await screen.findByText('user1');
    const before = api.calls('GET /api/v1/superadmin/users').length;
    fireEvent.click(screen.getAllByTitle('Hapus user')[0]);
    await waitFor(() => expect(api.calls('DELETE /api/v1/superadmin/users/1')).toHaveLength(1));
    expect(confirm).toHaveBeenCalledWith('Hapus user user1?');
    await waitFor(() => expect(api.calls('GET /api/v1/superadmin/users').length).toBeGreaterThan(before));
  });

  it('shows backend delete error', async () => {
    setup({ 'DELETE /api/v1/superadmin/users/1': fail(409, 'Tidak bisa menghapus diri sendiri') });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await screen.findByText('user1');
    fireEvent.click(screen.getAllByTitle('Hapus user')[0]);
    expect(await screen.findByText('Tidak bisa menghapus diri sendiri')).not.toBeNull();
  });
});
