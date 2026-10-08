import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { installFakeApi, paged } from '@/test/fake-api';
import { withUser } from '@/domains/ppic/components/as-user';
import DataBarang from './DataBarang';

const item = (id: number, o = {}) => ({ id, code: `K${id}`, name: `Barang ${id}`, detail: null, category: 'Kayu', unit: 'pcs', price: 1000, stock: 5, locationId: 1, supplierId: 1, locationCode: 'A1', supplierName: 'PT S', ...o });
const routes = () => ({
  'GET /api/v1/items': paged([item(1), item(2)]),
  'GET /api/v1/locations': paged([{ id: 1, code: 'A1', rackName: 'A', rackNumber: '1' }]),
  'GET /api/v1/suppliers': paged([{ id: 1, name: 'PT S' }, { id: 2, name: 'PT T' }]),
  'GET /api/v1/items/categories': [{ id: 1, name: 'Kayu' }, { id: 2, name: 'Cat' }],
  'GET /api/v1/items/units': [{ id: 1, name: 'pcs' }, { id: 2, name: 'lembar' }],
  'PUT /api/v1/items/1': item(1),
});
const lastQuery = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/items').at(-1)!.query;
const ALL = ['item.view', 'item.create', 'item.update', 'item.set-price'];

describe('superadmin Data Barang', () => {
  it('sorts by clicking a header (asc, desc, then default) on the server', async () => {
    const api = installFakeApi(routes());
    render(withUser(<DataBarang />, ALL));
    await screen.findByText('Barang 1');
    expect(lastQuery(api).get('sortBy')).toBeNull();
    fireEvent.click(screen.getByText('Stok & Satuan'));
    await waitFor(() => expect(lastQuery(api).get('sortBy')).toBe('stock'));
    expect(lastQuery(api).get('sortDir')).toBe('asc');
    fireEvent.click(screen.getByText('Stok & Satuan'));
    await waitFor(() => expect(lastQuery(api).get('sortDir')).toBe('desc'));
    fireEvent.click(screen.getByText('Stok & Satuan'));
    await waitFor(() => expect(lastQuery(api).get('sortBy')).toBeNull());
  });

  it('Filter opens a panel whose choices go to the server, and Reset clears them', async () => {
    const api = installFakeApi(routes());
    render(withUser(<DataBarang />, ALL));
    await screen.findByText('Barang 1');
    fireEvent.click(screen.getByText('Filter'));
    fireEvent.change(screen.getByLabelText('Filter kategori'), { target: { value: 'Cat' } });
    fireEvent.change(screen.getByLabelText('Filter supplier'), { target: { value: 'none' } });
    fireEvent.change(screen.getByLabelText('Filter lokasi'), { target: { value: '1' } });
    fireEvent.click(screen.getByLabelText('Stok kosong'));
    await waitFor(() => expect(lastQuery(api).get('stock')).toBe('empty'));
    const q = lastQuery(api);
    expect([q.get('category'), q.get('supplierId'), q.get('locationId')]).toEqual(['Cat', 'none', '1']);
    expect(screen.getByText('Filter (4)')).toBeTruthy();
    fireEvent.click(screen.getByText('Reset filter'));
    await waitFor(() => expect(lastQuery(api).get('category')).toBeNull());
    expect(lastQuery(api).get('supplierId')).toBeNull();
  });

  it('Preview is read-only; Mode Edit sends only the changed fields in one batch', async () => {
    const api = installFakeApi(routes());
    render(withUser(<DataBarang />, ALL));
    await screen.findByText('Barang 1');
    expect(screen.queryByLabelText('Nama Barang 1')).toBeNull();
    fireEvent.click(screen.getByText('Mode Edit'));
    fireEvent.change(screen.getByLabelText('Nama Barang 1'), { target: { value: 'Barang Satu' } });
    fireEvent.change(screen.getByLabelText('Detail Barang 1'), { target: { value: 'TACO TH' } });
    fireEvent.change(screen.getByLabelText('Harga Barang 1'), { target: { value: '2500' } });
    fireEvent.click(screen.getByText('Simpan (1)'));
    await waitFor(() => expect(api.calls('PUT /api/v1/items/1')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/items/1')[0].body).toEqual({ name: 'Barang Satu', detail: 'TACO TH', price: 2500 });
  });

  it('hides harga and supplier fields without their permissions', async () => {
    installFakeApi(routes());
    render(withUser(<DataBarang />, ['item.view', 'item.update']));
    await screen.findByText('Barang 1');
    fireEvent.click(screen.getByText('Mode Edit'));
    expect(screen.getByLabelText('Nama Barang 1')).toBeTruthy();
    expect(screen.queryByLabelText('Harga Barang 1')).toBeNull();
    expect(screen.queryByLabelText('Supplier Barang 1')).toBeNull();
    expect(screen.queryByLabelText('Lokasi Barang 1')).toBeNull();
  });

  it('can clear the supplier when allowed (sends supplierId null)', async () => {
    const api = installFakeApi(routes());
    render(withUser(<DataBarang />, [...ALL, 'item.set-supplier']));
    await screen.findByText('Barang 1');
    fireEvent.click(screen.getByText('Mode Edit'));
    fireEvent.change(screen.getByLabelText('Supplier Barang 1'), { target: { value: '' } });
    fireEvent.click(screen.getByText('Simpan (1)'));
    await waitFor(() => expect(api.calls('PUT /api/v1/items/1')[0].body).toEqual({ supplierId: null }));
  });

  it('sets the location in the row: an existing item code is kept, a missing one uses the suggestion', async () => {
    const api = installFakeApi({
      ...routes(),
      'GET /api/v1/items': paged([item(1, { locationId: null, locationCode: null }), item(2, { code: null, locationId: null, locationCode: null })]),
      'GET /api/v1/locations': paged([{ id: 1, code: 'A1', rackName: 'A', rackNumber: '1' }, { id: 2, code: 'B2', rackName: 'B', rackNumber: '2' }]),
      'PUT /api/v1/items/1/assign-location': item(1),
      'PUT /api/v1/items/2/assign-location': item(2),
      'GET /api/v1/items/2/suggest-code': { code: 'B2-BRG-001' },
    });
    render(withUser(<DataBarang />, [...ALL, 'item.assign-location']));
    await screen.findByText('Barang 1');
    fireEvent.click(screen.getByText('Mode Edit'));
    fireEvent.change(screen.getByLabelText('Lokasi Barang 1'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Lokasi Barang 2'), { target: { value: '2' } });
    fireEvent.click(screen.getByText('Simpan (2)'));
    await waitFor(() => expect(api.calls('PUT /api/v1/items/2/assign-location')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/items/1/assign-location')[0].body).toEqual({ code: 'K1', locationId: 2 });
    expect(api.calls('PUT /api/v1/items/2/assign-location')[0].body).toEqual({ code: 'B2-BRG-001', locationId: 2 });
    expect(api.calls('PUT /api/v1/items/1')).toHaveLength(0); // lokasi saja tidak memanggil PUT /items/:id
  });
});
