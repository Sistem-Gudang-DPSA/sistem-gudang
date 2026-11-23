import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { fail, installFakeApi, paged } from '@/test/fake-api';
import DataBarangPPIC from './DataBarang';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
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

describe('DataBarang PPIC: header dan sel tabel', () => {
  it('setiap baris punya jumlah sel sama dengan jumlah header', async () => {
    setup({});
    const row = (await screen.findByText('Barang 1')).closest('tr');
    const table = row?.closest('table');
    expect(row?.querySelectorAll('td').length).toBe(table?.querySelectorAll('thead th').length);
    expect(screen.queryByText('Stok & Satuan')).toBeNull();
  });

  it('menampilkan kolom Harga Terbaru dengan format ribuan seperti Superadmin', async () => {
    setup({});
    const row = (await screen.findByText('Barang 1')).closest('tr');
    expect(screen.getByRole('columnheader', { name: 'Harga Terbaru' })).toBeTruthy();
    expect(within(row!).getByText('1.000')).toBeTruthy();
  });
});

describe('DataBarang PPIC: plotting stok minimum massal', () => {
  const item2 = { ...item, id: 2, code: 'LEM014', name: 'Barang 2' };

  function setupDuaBarang(extra: Record<string, unknown> = {}) {
    const api = installFakeApi({
      'GET /api/v1/items': paged([item, item2]),
      'GET /api/v1/locations': paged([]),
      'GET /api/v1/suppliers': paged([]),
      'GET /api/v1/items/categories': [{ id: 1, name: 'Lembaran' }],
      'GET /api/v1/items/units': [{ id: 1, name: 'pcs' }],
      'PUT /api/v1/items/1': { ...item, minimumStock: 10 },
      'PUT /api/v1/items/2': { ...item2, minimumStock: 10 },
      ...extra,
    });
    render(<DataBarangPPIC />);
    return api;
  }

  it('menampilkan checkbox di kolom pertama', async () => {
    setupDuaBarang();
    await screen.findByText('Barang 1');
    const firstHeader = screen.getAllByRole('columnheader')[0];
    expect(within(firstHeader).getByRole('checkbox', { name: 'Pilih semua barang' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Pilih Barang 1' })).toBeTruthy();
  });

  it('menyimpan satu batas stok minimum ke semua barang yang dicentang', async () => {
    const api = setupDuaBarang();
    await screen.findByText('Barang 1');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pilih Barang 1' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pilih Barang 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Atur Stok Minimum (2)' }));
    fireEvent.change(screen.getByLabelText('Batas stok minimum'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan ke 2 barang' }));

    await waitFor(() => expect(api.calls('PUT /api/v1/items/1')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/items/1')[0].body).toEqual({ minimumStock: 10 });
    expect(api.calls('PUT /api/v1/items/2')[0].body).toEqual({ minimumStock: 10 });
    expect(await screen.findByText(/Berhasil \(2\): Barang 1, Barang 2/)).toBeTruthy();
  });

  it('menampilkan semua hasil bila ada barang yang gagal disimpan', async () => {
    setupDuaBarang({ 'PUT /api/v1/items/2': fail(500, 'Gagal menyimpan batas') });
    await screen.findByText('Barang 1');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pilih semua barang' }));
    fireEvent.click(screen.getByRole('button', { name: 'Atur Stok Minimum (2)' }));
    fireEvent.change(screen.getByLabelText('Batas stok minimum'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan ke 2 barang' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Gagal (1):');
    expect(alert.textContent).toContain('Barang 2: Gagal menyimpan batas');
    expect(screen.getByText(/Berhasil \(1\): Barang 1/)).toBeTruthy();
  });
});

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
