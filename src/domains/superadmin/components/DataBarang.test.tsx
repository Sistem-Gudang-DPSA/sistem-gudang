import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { fail, installFakeApi, paged } from '@/test/fake-api';
import { AuthUserProvider } from '@/domains/auth/user-context';
import type { AuthUser } from '@/domains/auth/types';
import DataBarangGudang from './DataBarang';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => '/superadmin/barang',
}));

const item = { id: 1, code: 'LEM013', externalCode: null, name: 'Barang 1', detail: null, supplierId: 7, supplierName: 'PT Kayu', stock: 30, unit: 'pcs', category: 'Lembaran', locationId: 1, locationCode: 'A01', price: 1000, photo: null };

function setup(updated: Record<string, unknown>, extra: Record<string, unknown> = {}, { rows = [item], user }: { rows?: typeof item[]; user?: AuthUser } = {}) {
  const api = installFakeApi({
    'GET /api/v1/items': paged(rows),
    'GET /api/v1/locations': paged([{ id: 1, code: 'A01', rackName: 'A', rackNumber: '01' }]),
    'GET /api/v1/suppliers': paged([{ id: 7, name: 'PT Kayu' }]),
    'GET /api/v1/items/categories': [{ id: 1, name: 'Lembaran' }, { id: 2, name: 'Permesinan', prefix: 'PER' }],
    'GET /api/v1/items/units': [{ id: 1, name: 'pcs' }],
    'PUT /api/v1/items/1': updated,
    ...extra,
  });
  render(user ? <AuthUserProvider user={user}><DataBarangGudang /></AuthUserProvider> : <DataBarangGudang />);
  return api;
}

// Ubah kategori satu barang di mode edit lalu simpan.
async function ubahKategori(kategori: string) {
  await screen.findByText('Barang 1');
  fireEvent.click(screen.getByText('Mode Edit'));
  await waitFor(() => expect(screen.getByRole('option', { name: kategori })).not.toBeNull());
  fireEvent.change(screen.getByLabelText('Kategori Barang 1'), { target: { value: kategori } });
  fireEvent.click(screen.getByText('Simpan (1)'));
}

describe('DataBarang superadmin: notifikasi kode saat kategori berubah', () => {
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

describe('DataBarang superadmin: Ganti kode', () => {
  afterEach(() => vi.restoreAllMocks());

  it('konfirmasi lalu memanggil recode dan menampilkan kode lama dan baru', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const api = setup({}, { 'POST /api/v1/items/1/recode': { ...item, code: 'PER201', category: 'Permesinan' } });
    await screen.findByText('Barang 1');
    fireEvent.click(screen.getByRole('button', { name: 'Ganti kode' }));
    expect(window.confirm).toHaveBeenCalledWith('Ganti kode LEM013? Label lama tidak bisa di-scan lagi. Cetak ulang label setelah ini.');
    expect(await screen.findByText('Kode barang berubah dari LEM013 menjadi PER201.')).not.toBeNull();
    expect(api.calls('POST /api/v1/items/1/recode')).toHaveLength(1);
  });

  it('batal di konfirmasi tidak memanggil recode', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const api = setup({});
    await screen.findByText('Barang 1');
    fireEvent.click(screen.getByRole('button', { name: 'Ganti kode' }));
    expect(window.confirm).toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 0));
    expect(api.calls('POST /api/v1/items/1/recode')).toHaveLength(0);
  });
});

describe('DataBarang superadmin: Ganti Kode Massal', () => {
  afterEach(() => vi.restoreAllMocks());
  const item2 = { ...item, id: 2, code: 'LEM014', name: 'Barang 2' };
  const recoded = {
    items: [
      { id: 1, oldCode: 'LEM013', newCode: 'PER201' },
      { id: 2, oldCode: 'LEM014', newCode: 'PER202' },
    ],
  };

  it('konfirmasi lalu memanggil recode massal dan menampilkan daftar perubahan', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const api = setup({}, { 'POST /api/v1/items/recode/bulk': recoded }, { rows: [item, item2] });
    await screen.findByText('Barang 1');
    const bulk = screen.getByRole('button', { name: 'Ganti Kode Massal (0)' });
    expect((bulk as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Pilih Barang 1'));
    fireEvent.click(screen.getByLabelText('Pilih Barang 2'));
    fireEvent.click(screen.getByRole('button', { name: 'Ganti Kode Massal (2)' }));
    expect(window.confirm).toHaveBeenCalledWith('Ganti kode 2 barang? Label lama tidak bisa di-scan lagi. Cetak ulang label setelah ini.');
    expect(await screen.findByText('2 kode barang diganti.')).not.toBeNull();
    expect(screen.getByText('LEM013 → PER201')).not.toBeNull();
    expect(screen.getByText('LEM014 → PER202')).not.toBeNull();
    expect(api.calls('POST /api/v1/items/recode/bulk')[0].body).toEqual({ itemIds: [1, 2] });
    expect(screen.getByRole('button', { name: 'Ganti Kode Massal (0)' })).not.toBeNull();
  });

  it('batal di konfirmasi tidak memanggil recode massal', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const api = setup({}, { 'POST /api/v1/items/recode/bulk': recoded }, { rows: [item, item2] });
    await screen.findByText('Barang 1');
    fireEvent.click(screen.getByLabelText('Pilih Barang 1'));
    fireEvent.click(screen.getByRole('button', { name: 'Ganti Kode Massal (1)' }));
    expect(window.confirm).toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 0));
    expect(api.calls('POST /api/v1/items/recode/bulk')).toHaveLength(0);
  });

  it('tidak tampil untuk pengguna non-superadmin', async () => {
    const user: AuthUser = { id: 1, username: 'u', email: 'u@x.id', roleId: 2, roleName: 'Staff', isSuperadmin: false, permissions: [] };
    setup({}, {}, { user });
    await screen.findByText('Barang 1');
    expect(screen.queryByRole('button', { name: /Ganti Kode Massal/ })).toBeNull();
  });
});

describe('DataBarang superadmin: Hapus', () => {
  afterEach(() => vi.restoreAllMocks());

  it('tidak ada hapus massal; barang yang sudah dipakai transaksi ditolak dengan pesan jelas', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    setup({}, { 'DELETE /api/v1/items/1': fail(409, 'Still in use by other data') });
    await screen.findByText('Barang 1');
    expect(screen.queryByRole('button', { name: /Hapus Massal/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Hapus' }));
    expect(window.confirm).toHaveBeenCalledWith('Hapus barang "Barang 1" (LEM013)? Tindakan ini tidak bisa dibatalkan.');
    expect(await screen.findByText('Barang "Barang 1" tidak bisa dihapus karena sudah dipakai transaksi.')).not.toBeNull();
  });
});

describe('DataBarang superadmin: pilih semua barang', () => {
  it('memilih semua barang dari semua halaman lalu aksi massal memakai semuanya', async () => {
    const item2 = { ...item, id: 2, code: 'LEM014', name: 'Barang 2' };
    // halaman tabel (pageSize 20) hanya berisi Barang 1; total 2
    setup({}, {
      'GET /api/v1/items': (r: { query: URLSearchParams }) =>
        r.query.get('pageSize') === '100' ? paged([item, item2]) : paged([item], { total: 2 }),
    });
    await screen.findByText('Barang 1');
    fireEvent.click(screen.getByLabelText('Pilih semua barang di halaman ini'));
    fireEvent.click(screen.getByRole('button', { name: 'Pilih semua 2 barang' }));
    expect(await screen.findByRole('button', { name: 'Ganti Kode Massal (2)' })).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Batalkan pilihan' }));
    expect(screen.getByRole('button', { name: 'Ganti Kode Massal (0)' })).not.toBeNull();
  });
});

// TEMP(hapus-semua): hapus test ini bersama tombolnya
describe('DataBarang superadmin: Hapus Semua (sementara)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('butuh ketik HAPUS SEMUA, menghapus semua halaman dan melewati barang yang dipakai transaksi', async () => {
    const item2 = { ...item, id: 2, code: 'LEM014', name: 'Barang 2' };
    const api = setup({}, {
      'GET /api/v1/items': (r: { query: URLSearchParams }) =>
        r.query.get('pageSize') === '100' ? paged([item, item2]) : paged([item], { total: 2 }),
      'DELETE /api/v1/items/1': null,
      'DELETE /api/v1/items/2': fail(409, 'Still in use by other data'),
    });
    await screen.findByText('Barang 1');
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('hapus');
    fireEvent.click(screen.getByRole('button', { name: 'Hapus Semua (2)' }));
    expect(prompt).toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 0));
    expect(api.calls('DELETE /api/v1/items/1')).toHaveLength(0);

    prompt.mockReturnValue('HAPUS SEMUA');
    fireEvent.click(screen.getByRole('button', { name: 'Hapus Semua (2)' }));
    expect(await screen.findByText('1 barang dihapus. 1 barang dilewati karena sudah dipakai transaksi.')).not.toBeNull();
    expect(api.calls('DELETE /api/v1/items/1')).toHaveLength(1);
    expect(api.calls('DELETE /api/v1/items/2')).toHaveLength(1);
  });
});

describe('DataBarang superadmin: Sesuaikan Stok', () => {
  it('retry setelah gagal memakai Idempotency-Key yang sama; penyesuaian berikutnya memakai key baru', async () => {
    let n = 0;
    const api = setup({}, { 'PATCH /api/v1/items/1/stock': () => (++n === 1 ? fail(500, 'timeout') : item) }, { user: { id: 1, username: 'u', email: 'u@x.id', roleId: 1, roleName: 'SA', isSuperadmin: true, permissions: [] } });
    await screen.findByText('Barang 1');
    fireEvent.click(screen.getByTitle('Sesuaikan stok'));
    fireEvent.change(screen.getByPlaceholderText('Contoh: 10 atau -5'), { target: { value: '10' } });
    fireEvent.change(screen.getByPlaceholderText(/Contoh: Penerimaan/), { target: { value: 'koreksi' } });
    fireEvent.click(screen.getByText('Simpan'));
    await screen.findByText('timeout');
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(screen.queryByText('Simpan')).toBeNull());
    const [a, b] = api.calls('PATCH /api/v1/items/1/stock');
    expect(a.headers.get('Idempotency-Key')).toBeTruthy();
    expect(b.headers.get('Idempotency-Key')).toBe(a.headers.get('Idempotency-Key'));

    fireEvent.click(await screen.findByTitle('Sesuaikan stok'));
    fireEvent.change(screen.getByPlaceholderText('Contoh: 10 atau -5'), { target: { value: '10' } });
    fireEvent.change(screen.getByPlaceholderText(/Contoh: Penerimaan/), { target: { value: 'koreksi' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('PATCH /api/v1/items/1/stock')).toHaveLength(3));
    expect(api.calls('PATCH /api/v1/items/1/stock')[2].headers.get('Idempotency-Key')).not.toBe(a.headers.get('Idempotency-Key'));
  });
});

describe('DataBarang superadmin: pemetaan supplier massal', () => {
  const second = { ...item, id: 2, name: 'Barang 2', supplierId: null, supplierName: null };
  const routes = {
    'GET /api/v1/items': paged([item, second]),
    'GET /api/v1/locations': paged([{ id: 1, code: 'A01', rackName: 'A', rackNumber: '01' }]),
    'GET /api/v1/suppliers': paged([{ id: 7, name: 'PT Kayu' }]),
    'GET /api/v1/items/categories': [{ id: 1, name: 'Lembaran' }],
    'GET /api/v1/items/units': [{ id: 1, name: 'pcs' }],
    'PUT /api/v1/items/1': { ...item, supplierId: 7 },
    'PUT /api/v1/items/2': { ...second, supplierId: 7 },
  };

  it('memetakan barang yang dicentang ke supplier', async () => {
    const api = installFakeApi(routes);
    render(<DataBarangGudang />);
    await screen.findByText('Barang 1');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Pilih Barang 1' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pilih Barang 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Atur Supplier (2)' }));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: 'Supplier' }));
    fireEvent.click(dialog.getByRole('option', { name: 'PT Kayu' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Tinjau 2 Barang' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Simpan 2 Barang' }));

    await waitFor(() => expect(api.calls('PUT /api/v1/items/2')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/items/1')[0].body).toEqual({ supplierId: 7 });
    expect(await screen.findByText('2 barang dipetakan ke PT Kayu.')).not.toBeNull();
  });

  it('menyembunyikan tombol tanpa item.set-supplier', async () => {
    installFakeApi(routes);
    const user: AuthUser = { id: 1, username: 'u', email: 'u@x.id', roleId: 2, roleName: 'Staff', isSuperadmin: false, permissions: ['item.update'] };
    render(<AuthUserProvider user={user}><DataBarangGudang /></AuthUserProvider>);
    await screen.findByText('Barang 1');
    expect(screen.queryByRole('button', { name: /Atur Supplier/ })).toBeNull();
  });
});
