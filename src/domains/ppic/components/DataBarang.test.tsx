import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import { vi as viTimeout } from 'vitest';
viTimeout.setConfig({ testTimeout: 30000 });
import DataBarang from './DataBarang';
import { withUser } from './as-user';

const item = (id: number, over: Record<string, unknown> = {}) => ({
  id, code: `KB-${id}`, name: `Barang ${id}`, category: 'Lembaran', unit: 'Lembar', price: 1500, stock: 100,
  locationId: 1, supplierId: 2, locationCode: 'A-01', supplierName: 'PT Sumber', ...over,
});
const suppliers = paged([{ id: 2, code: 'S2', name: 'PT Sumber' }, { id: 3, code: 'S3', name: 'CV Lain' }]);
const locations = paged([{ id: 1, code: 'A-01' }]);

function routes(extra: Record<string, unknown> = {}, rows = [item(1), item(2, { stock: 10, locationId: null, code: null })]) {
  return {
    'GET /api/v1/items': paged(rows, { total: 45 }),
    'GET /api/v1/suppliers': suppliers,
    'GET /api/v1/locations': locations,
    'GET /api/v1/items/units': [{ id: 1, name: 'Lembar' }, { id: 2, name: 'Pcs' }],
    'GET /api/v1/items/categories': [{ id: 1, name: 'Lembaran' }, { id: 2, name: 'Logam' }],
    'POST /api/v1/items': { id: 99 },
    'PUT /api/v1/items/1': { id: 1 },
    'DELETE /api/v1/items/1': { id: 1 },
    ...extra,
  };
}
async function load(extra: Record<string, unknown> = {}, rows?: ReturnType<typeof item>[]) {
  const api = installFakeApi(routes(extra, rows));
  render(<DataBarang />);
  await screen.findByText('Barang 1');
  await screen.findAllByText('PT Sumber');
  return api;
}
const openModal = () => fireEvent.click(screen.getByText('Tambah Data'));
const fillModal = () => {
  fireEvent.change(screen.getByPlaceholderText('Masukan nama barang'), { target: { value: 'Triplex' } });
  fireEvent.change(screen.getByDisplayValue('Pilih satuan'), { target: { value: 'Lembar' } });
  fireEvent.change(screen.getByDisplayValue('Pilih Kategori'), { target: { value: 'Lembaran' } });
  fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '25000' } });
  fireEvent.change(screen.getByDisplayValue('Pilih supplier'), { target: { value: '3' } });
};

describe('DataBarang', () => {
  it('loads rows with supplier, location, stock and pagination total', async () => {
    const api = await load();
    expect(screen.getByText('A-01')).toBeTruthy();
    expect(screen.getByText('KB-1')).toBeTruthy();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0); // null code / null location
    expect(screen.getByText('10').className).toContain('text-red-600'); // stock < 20
    expect(screen.getByText('100').className).toContain('text-gray-800');
    expect(screen.getByText('45')).toBeTruthy();
    const q = api.calls('GET /api/v1/items')[0].query;
    expect(q.get('page')).toBe('1');
    expect(q.get('pageSize')).toBe('20');
  });

  it('empty state', async () => {
    installFakeApi(routes({}, []));
    render(<DataBarang />);
    expect(await screen.findByText('Belum ada data barang.')).toBeTruthy();
  });

  it('backend error', async () => {
    installFakeApi(routes({ 'GET /api/v1/items': fail(500, 'Gagal dari server') }));
    render(<DataBarang />);
    expect(await screen.findByText('Gagal dari server')).toBeTruthy();
  });

  it('search is sent to the API, limited to 100 chars, and resets to page 1', async () => {
    const api = await load();
    fireEvent.click(screen.getByText('Selanjutnya'));
    await waitFor(() => expect(api.calls('GET /api/v1/items').at(-1)!.query.get('page')).toBe('2'));
    const box = screen.getByPlaceholderText('Cari kode atau nama barang...') as HTMLInputElement;
    expect(box.maxLength).toBe(100);
    fireEvent.change(box, { target: { value: 'ply' } });
    await waitFor(() => {
      const last = api.calls('GET /api/v1/items').at(-1)!;
      expect(last.query.get('search')).toBe('ply');
      expect(last.query.get('page')).toBe('1');
    });
  });

  it('create posts integer price and supplier id, then reloads', async () => {
    const api = await load();
    openModal();
    fillModal();
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/items')).toHaveLength(1));
    expect(api.calls('POST /api/v1/items')[0].body).toEqual({ name: 'Triplex', unit: 'Lembar', category: 'Lembaran', price: 25000, supplierId: 3 });
    await waitFor(() => expect(api.calls('GET /api/v1/items').length).toBeGreaterThan(1));
    expect(screen.queryByText('DATA BARANG')).toBeNull();
  });

  it('requires every field', async () => {
    const api = await load();
    openModal();
    fireEvent.change(screen.getByPlaceholderText('Masukan nama barang'), { target: { value: 'Triplex' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(await screen.findByText('Mohon lengkapi semua data!')).toBeTruthy();
    expect(api.calls('POST /api/v1/items')).toHaveLength(0);
  });

  it('shows backend error in the modal and keeps it open', async () => {
    await load({ 'POST /api/v1/items': fail(409, 'Nama barang sudah ada') });
    openModal();
    fillModal();
    fireEvent.click(screen.getByText('Simpan'));
    expect(await screen.findByText('Nama barang sudah ada')).toBeTruthy();
    expect(screen.getByText('DATA BARANG')).toBeTruthy();
  });

  it('price keeps digits only; name limited to 191', async () => {
    await load();
    openModal();
    const price = screen.getByPlaceholderText('0') as HTMLInputElement;
    for (const bad of ['1e5', '-3', '2.5']) {
      fireEvent.change(price, { target: { value: bad } });
      expect(price.value).toBe(bad.replace(/\D/g, ''));
    }
    expect(price.maxLength).toBe(9);
    expect((screen.getByPlaceholderText('Masukan nama barang') as HTMLInputElement).maxLength).toBe(191);
  });

  it('edit prefills the modal and PUTs', async () => {
    const api = await load();
    fireEvent.click(screen.getAllByTitle('Edit Data')[0]);
    expect((screen.getByPlaceholderText('Masukan nama barang') as HTMLInputElement).value).toBe('Barang 1');
    expect((screen.getByPlaceholderText('0') as HTMLInputElement).value).toBe('1500');
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '2000' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('PUT /api/v1/items/1')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/items/1')[0].body).toEqual({ name: 'Barang 1', unit: 'Lembar', category: 'Lembaran', price: 2000, supplierId: 2 });
  });

  it('delete asks for confirmation, then DELETEs and reloads', async () => {
    const api = await load();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    fireEvent.click(screen.getAllByTitle('Hapus Data')[0]);
    expect(api.calls('DELETE /api/v1/items/1')).toHaveLength(0);
    fireEvent.click(screen.getAllByTitle('Hapus Data')[0]);
    await waitFor(() => expect(api.calls('DELETE /api/v1/items/1')).toHaveLength(1));
    expect(confirm).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(api.calls('GET /api/v1/items').length).toBeGreaterThan(1));
  });

  it('delete backend error is displayed', async () => {
    await load({ 'DELETE /api/v1/items/1': fail(409, 'Barang masih dipakai') });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getAllByTitle('Hapus Data')[0]);
    expect(await screen.findByText('Barang masih dipakai')).toBeTruthy();
  });

  it('Batal closes the modal without a request', async () => {
    const api = await load();
    openModal();
    fireEvent.click(screen.getByText('Batal'));
    expect(screen.queryByText('DATA BARANG')).toBeNull();
    expect(api.calls('POST /api/v1/items')).toHaveLength(0);
  });
});


describe('permissions', () => {
  it('a view-only user keeps the screen but not the actions', async () => {
    installFakeApi(routes());
    render(withUser(<DataBarang />, ['item.view']));
    await screen.findByText('Barang 1');
    expect(screen.queryByText('Tambah Data')).toBeNull();
    expect(screen.queryAllByTitle('Edit Data')).toHaveLength(0);
    expect(screen.queryAllByTitle('Hapus Data')).toHaveLength(0);
  });

  it.each([
    ['holds the permission', ['item.create', 'item.update', 'item.delete'], false],
    ['is a superadmin', [], true],
  ])('a user who %s sees the actions', async (_label, perms, isSuperadmin) => {
    installFakeApi(routes());
    render(withUser(<DataBarang />, perms, isSuperadmin));
    await screen.findByText('Barang 1');
    expect(screen.getByText('Tambah Data')).toBeTruthy();
    expect(screen.getAllByTitle('Edit Data')).toHaveLength(2);
    expect(screen.getAllByTitle('Hapus Data')).toHaveLength(2);
  });

  it('only a user holding item.upload-photo can upload item photos', async () => {
    installFakeApi(routes({}, [item(1, { photoUrl: '/uploads/items/1.jpg' }), item(2)]));
    const { unmount } = render(withUser(<DataBarang />, ['item.view']));
    await screen.findByText('Barang 1');
    expect(screen.getByAltText('Foto Barang 1')).toBeTruthy();
    expect(screen.queryByLabelText('Upload foto Barang 1')).toBeNull();
    unmount();

    render(withUser(<DataBarang />, ['item.view', 'item.upload-photo']));
    await screen.findByText('Barang 1');
    expect(screen.getByText('Ganti')).toBeTruthy(); // Barang 1 sudah punya foto
    expect(screen.getByText('Upload')).toBeTruthy(); // Barang 2 belum
  });
});
