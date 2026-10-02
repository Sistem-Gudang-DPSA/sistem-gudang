import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import DataBarang from './DataBarang';

vi.setConfig({ testTimeout: 20000 });

const item = (id: number, over = {}) => ({ id, code: `BRG-${id}`, name: `Triplex ${id}`, category: 'Lembaran', unit: 'lbr', price: 50000, stock: 30, supplierId: 7, locationId: 3, ...over });

function setup(routes: Record<string, unknown> = {}) {
  const api = installFakeApi({
    'GET /api/v1/items': paged([item(1), item(2, { supplierId: 8, price: 1000 })]),
    'GET /api/v1/suppliers': paged([{ id: 7, name: 'PT Kayu' }, { id: 8, name: 'PT Besi' }]),
    'GET /api/v1/locations': paged([{ id: 3, code: 'A-01' }]),
    ...routes,
  });
  render(<DataBarang />);
  return api;
}
const lastQuery = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/items').at(-1)!.query;
const price = () => screen.getByPlaceholderText('Masukan Jumlah') as HTMLInputElement;

async function openEdit(api: ReturnType<typeof installFakeApi>, idx = 0) {
  await screen.findByText('Triplex 1');
  await waitFor(() => expect(screen.getAllByText('PT Kayu').length).toBeGreaterThan(0));
  fireEvent.click(screen.getAllByText('Lengkapi')[idx]);
  await screen.findByText('DATA BARANG');
  return api;
}

describe('purchasing DataBarang', () => {
  it('lists items with resolved supplier name and location code', async () => {
    setup();
    expect(await screen.findByText('Triplex 1')).not.toBeNull();
    await waitFor(() => expect(screen.getByText('PT Besi')).not.toBeNull());
    expect(screen.getAllByText('A-01').length).toBe(2);
  });

  it('paginates with page 2 and search resets to page 1', async () => {
    const api = setup({ 'GET /api/v1/items': paged([item(1)], { total: 45 }) });
    await screen.findByText('Triplex 1');
    fireEvent.click(screen.getByText('2'));
    await waitFor(() => expect(lastQuery(api).get('page')).toBe('2'));
    fireEvent.change(screen.getByPlaceholderText('Cari kode atau nama barang...'), { target: { value: 'tri' } });
    await waitFor(() => expect(lastQuery(api).get('search')).toBe('tri'));
    expect(lastQuery(api).get('page')).toBe('1');
  });

  it('shows load error', async () => {
    setup({ 'GET /api/v1/items': fail(500, 'Gagal server') });
    expect(await screen.findByText('Gagal server')).not.toBeNull();
  });

  it('edit prefills supplier and price, price is digits only with maxLength 9', async () => {
    await openEdit(setup());
    expect(price().value).toBe('50000');
    expect(price().maxLength).toBe(9);
    fireEvent.change(price(), { target: { value: '12a.3-e4' } });
    expect(price().value).toBe('1234');
  });

  it('Simpan PUTs /items/{id} with integer price and supplierId', async () => {
    const api = await openEdit(setup({ 'PUT /api/v1/items/1': { id: 1 } }));
    fireEvent.change(price(), { target: { value: '75000' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('PUT /api/v1/items/1')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/items/1')[0].body).toEqual({ price: 75000, supplierId: 7 });
    await waitFor(() => expect(screen.queryByText('DATA BARANG')).toBeNull());
  });

  it('requires a price', async () => {
    const api = await openEdit(setup());
    fireEvent.change(price(), { target: { value: '' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(await screen.findByText('Mohon lengkapi semua data!')).not.toBeNull();
    expect(api.calls('PUT /api/v1/items/1')).toHaveLength(0);
  });

  it('shows backend error on save', async () => {
    await openEdit(setup({ 'PUT /api/v1/items/1': fail(422, 'Harga tidak valid') }));
    fireEvent.click(screen.getByText('Simpan'));
    expect(await screen.findByText('Harga tidak valid')).not.toBeNull();
  });
});
