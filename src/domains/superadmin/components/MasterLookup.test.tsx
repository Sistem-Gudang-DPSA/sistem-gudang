import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, fail } from '@/test/fake-api';
import { withUser } from '@/domains/ppic/components/as-user';
import Kategori from './Kategori';
import Satuan from './Satuan';

afterEach(() => vi.unstubAllGlobals());

const KAT = 'GET /api/v1/items/categories';
const kat = (id: number, name: string, itemCount: number) => ({ id, name, itemCount });
const ALL = ['item.view', 'item.create', 'item.update', 'item.delete'];

describe('Kategori master', () => {
  it('lists the master names with their item count, even a category without items, and filters by search', async () => {
    installFakeApi({ [KAT]: [kat(1, 'Kayu', 12), kat(2, 'Cat', 0)] });
    render(withUser(<Kategori />, ALL));
    expect((await screen.findByText('Kayu')).closest('tr')!.textContent).toContain('12');
    expect(screen.getByText('Cat').closest('tr')!.textContent).toContain('0');
    expect(screen.getByText('2 kategori')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Cari kategori...'), { target: { value: 'ca' } });
    expect(screen.queryByText('Kayu')).toBeNull();
    expect(screen.getByText('Cat')).toBeTruthy();
  });

  it('adds a name with POST and reloads; shows the duplicate message from the API', async () => {
    const api = installFakeApi({ [KAT]: [kat(1, 'Kayu', 1)], 'POST /api/v1/items/categories': { id: 2, name: 'Cat' } });
    render(withUser(<Kategori />, ALL));
    await screen.findByText('Kayu');
    fireEvent.click(screen.getByText('Tambah Kategori'));
    fireEvent.change(screen.getByLabelText('Nama Kategori'), { target: { value: '  Cat ' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/items/categories')[0].body).toEqual({ name: 'Cat' }));
    await waitFor(() => expect(api.calls(KAT).length).toBe(2));

    installFakeApi({ [KAT]: [kat(1, 'Kayu', 1)], 'POST /api/v1/items/categories': fail(409, 'Kategori sudah ada') });
    fireEvent.click(screen.getByText('Tambah Kategori'));
    fireEvent.change(screen.getByLabelText('Nama Kategori'), { target: { value: 'kayu' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(await screen.findByText('Kategori sudah ada')).toBeTruthy();
  });

  it('deletes by id after confirm, and shows the in-use refusal', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    const api = installFakeApi({ [KAT]: [kat(7, 'Kayu', 12)], 'DELETE /api/v1/items/categories/7': fail(409, 'Kategori masih dipakai 12 barang') });
    render(withUser(<Kategori />, ALL));
    await screen.findByText('Kayu');
    fireEvent.click(screen.getByLabelText('Hapus Kayu'));
    expect(await screen.findByText('Kategori masih dipakai 12 barang')).toBeTruthy();
    expect(api.calls('DELETE /api/v1/items/categories/7')).toHaveLength(1);
  });

  it('hides Tambah and Hapus without the permissions', async () => {
    installFakeApi({ [KAT]: [kat(1, 'Kayu', 1)] });
    render(withUser(<Kategori />, ['item.view']));
    await screen.findByText('Kayu');
    expect(screen.queryByText('Tambah Kategori')).toBeNull();
    expect(screen.queryByLabelText('Hapus Kayu')).toBeNull();
  });

  it('shows the API error', async () => {
    installFakeApi({ [KAT]: fail(500, 'Server error') });
    render(withUser(<Kategori />, ALL));
    expect(await screen.findByText('Server error')).toBeTruthy();
  });
});

describe('Kategori sort and rename', () => {
  const names = () => screen.getAllByRole('row').slice(1).map((r) => r.querySelectorAll('td')[1].textContent);

  it('sorts by name and by item count with the header arrows', async () => {
    installFakeApi({ [KAT]: [kat(1, 'Kayu', 12), kat(2, 'Cat', 0), kat(3, 'Besi', 5)] });
    render(withUser(<Kategori />, ALL));
    await screen.findByText('Kayu');
    expect(names()).toEqual(['Kayu', 'Cat', 'Besi']); // urutan BE
    fireEvent.click(screen.getByText('Kategori', { selector: 'span' }));
    expect(names()).toEqual(['Besi', 'Cat', 'Kayu']);
    fireEvent.click(screen.getByText('Kategori', { selector: 'span' }));
    expect(names()).toEqual(['Kayu', 'Cat', 'Besi']);
    fireEvent.click(screen.getByText('Jumlah Barang'));
    expect(names()).toEqual(['Cat', 'Besi', 'Kayu']);
  });

  it('renames in edit mode and saves all changed rows at once with PUT', async () => {
    const api = installFakeApi({
      [KAT]: [kat(7, 'Kayu', 1), kat(8, 'Cat', 0)],
      'PUT /api/v1/items/categories/7': { id: 7, name: 'Kayu Solid' },
      'PUT /api/v1/items/categories/8': fail(409, 'Kategori sudah ada'),
    });
    render(withUser(<Kategori />, ALL));
    await screen.findByText('Kayu');
    expect(screen.queryByLabelText('Nama Kayu')).toBeNull(); // preview: tidak bisa diubah
    fireEvent.click(screen.getByText('Mode Edit'));
    fireEvent.change(screen.getByLabelText('Nama Kayu'), { target: { value: 'Kayu Solid' } });
    fireEvent.change(screen.getByLabelText('Nama Cat'), { target: { value: 'Kayu' } });
    fireEvent.click(screen.getByText('Simpan (2)'));
    await waitFor(() => expect(api.calls('PUT /api/v1/items/categories/7')[0].body).toEqual({ name: 'Kayu Solid' }));
    expect(await screen.findByText('Kategori sudah ada')).toBeTruthy(); // baris gagal tetap tertampung
    expect(screen.getByText('Simpan (1)')).toBeTruthy();
  });

  it('hides Mode Edit without item.update', async () => {
    installFakeApi({ [KAT]: [kat(1, 'Kayu', 1)] });
    render(withUser(<Kategori />, ['item.view', 'item.delete']));
    await screen.findByText('Kayu');
    expect(screen.queryByText('Mode Edit')).toBeNull();
  });
});

describe('Satuan master', () => {
  it('uses the units endpoints', async () => {
    const api = installFakeApi({ 'GET /api/v1/items/units': [{ id: 1, name: 'Lembar', itemCount: 3 }], 'POST /api/v1/items/units': { id: 2, name: 'Pcs' } });
    render(withUser(<Satuan />, ALL));
    await screen.findByText('Lembar');
    fireEvent.click(screen.getByText('Tambah Satuan'));
    fireEvent.change(screen.getByLabelText('Nama Satuan'), { target: { value: 'Pcs' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/items/units')).toHaveLength(1));
  });
});
