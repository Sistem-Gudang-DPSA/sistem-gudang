import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, paged } from '@/test/fake-api';
import DataBarangPPIC from './DataBarang';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => '/ppic/barang',
}));

const item = { id: 1, code: 'LEM013', externalCode: null, name: 'Barang 1', detail: null, supplierId: 7, supplierName: 'PT Kayu', stock: 30, unit: 'pcs', category: 'Lembaran', locationId: 1, locationCode: 'A01', price: 1000, photo: null };

function setup(updated: Record<string, unknown>) {
  const api = installFakeApi({
    'GET /api/v1/items': paged([item]),
    'GET /api/v1/locations': paged([{ id: 1, code: 'A01', rackName: 'A', rackNumber: '01' }]),
    'GET /api/v1/suppliers': paged([{ id: 7, name: 'PT Kayu' }]),
    'GET /api/v1/items/categories': [{ id: 1, name: 'Lembaran' }, { id: 2, name: 'Permesinan', prefix: 'PER' }],
    'GET /api/v1/items/units': [{ id: 1, name: 'pcs' }],
    'PUT /api/v1/items/1': updated,
  });
  render(<DataBarangPPIC />);
  return api;
}

// Buka modal edit, ganti kategori, lalu simpan.
async function ubahKategori(kategori: string) {
  await screen.findByText('Barang 1');
  fireEvent.click(screen.getByTitle('Edit Data'));
  await waitFor(() => expect(screen.getByRole('option', { name: kategori })).not.toBeNull());
  fireEvent.change(screen.getByDisplayValue('Lembaran'), { target: { value: kategori } });
  fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
}

describe('DataBarang PPIC: notifikasi kode saat kategori berubah', () => {
  it('menampilkan kode baru bila BE memberi kode baru', async () => {
    const api = setup({ ...item, category: 'Permesinan', code: 'PER201' });
    await ubahKategori('Permesinan');
    expect(await screen.findByText('Kode barang berubah dari LEM013 menjadi PER201. Cetak ulang label barang ini.')).not.toBeNull();
    expect(api.calls('PUT /api/v1/items/1')[0].body).toMatchObject({ category: 'Permesinan' });
  });

  it('menampilkan kode tetap bila barang sudah punya transaksi', async () => {
    setup({ ...item, category: 'Permesinan' });
    await ubahKategori('Permesinan');
    expect(await screen.findByText('Kode barang tetap LEM013 karena barang sudah punya transaksi.')).not.toBeNull();
  });
});
