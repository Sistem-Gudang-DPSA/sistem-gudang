import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { fail, installFakeApi, paged } from '@/test/fake-api';
import { AuthUserProvider } from '@/domains/auth/user-context';
import type { AuthUser } from '@/domains/auth/types';
import DataBarangGudang from './DataBarang';
import ItemReceiptDetail from '@/domains/inventory/components/data-barang/ItemReceiptDetail';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: '1' }),
  usePathname: () => '/superadmin/barang',
}));

const item = { id: 1, code: 'LEM013', externalCode: null, name: 'Barang 1', detail: null, supplierId: 7, supplierName: 'PT Kayu', stock: 30, unit: 'pcs', category: 'Lembaran', locationId: 1, locationCode: 'A01', price: 1000, photo: null };

function setup(updated: Record<string, unknown>, extra: Record<string, unknown> = {}, { rows = [item], user }: { rows?: (typeof item & { priceUpdatedAt?: string | null })[]; user?: AuthUser } = {}) {
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

describe('DataBarang superadmin: kolom harga', () => {
  it('menampilkan total nilai stok dummy dari detail tepat di kanan harga, terlepas dari stok dan harga terbaru', async () => {
    setup({}, {}, { rows: [item, { ...item, id: 2, name: 'Barang kosong', stock: 0 }, { ...item, id: 3, name: 'Barang pecahan', stock: 2.5, price: 1500 }] });
    await screen.findByText('Barang 1');
    const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent);
    const priceIndex = headers.findIndex((label) => label?.startsWith('Harga Terbaru'));
    expect(headers[priceIndex + 1]).toBe('Nilai Stok');
    for (const name of ['Barang 1', 'Barang kosong', 'Barang pecahan']) {
      const row = screen.getByText(name).closest('tr')!;
      const cells = within(row).getAllByRole('cell');
      expect(cells[priceIndex + 1].textContent).toBe('3.700.000');
    }
  });

  it('menampilkan angka yang sama pada daftar dan total detail untuk barang yang sama', async () => {
    setup({}, { 'GET /api/v1/items/1': item });
    const row = (await screen.findByText('Barang 1')).closest('tr')!;
    const listValue = within(row).getByText('3.700.000').textContent;
    const detail = render(<ItemReceiptDetail />);
    const total = await detail.findByRole('rowheader', { name: 'Total Nilai Stok' });
    const detailValue = within(total.closest('tr')!).getByRole('cell', { name: /Rp/ }).textContent;
    expect(detailValue?.replace(/Rp\s*/, '')).toBe(listValue);
  });

  it('memakai label Harga Terbaru dan format ribuan', async () => {
    setup({});
    const row = (await screen.findByText('Barang 1')).closest('tr');
    expect(screen.getByRole('columnheader', { name: 'Harga Terbaru' })).toBeTruthy();
    expect(within(row!).getByText('1.000')).toBeTruthy();
    expect(within(row!).queryByText(/^per /)).toBeNull();
  });

  it('menampilkan tanggal harga dan menyembunyikannya saat mode edit', async () => {
    setup({}, {}, { rows: [{ ...item, priceUpdatedAt: '2026-11-23' }] });
    const row = (await screen.findByText('Barang 1')).closest('tr');
    expect(within(row!).getByText('per 23-11-2026')).toBeTruthy();
    fireEvent.click(screen.getByText('Mode Edit'));
    await waitFor(() => expect(screen.getByLabelText('Harga Barang 1')).toBeTruthy());
    expect(screen.queryByLabelText('Supplier Barang 1')).toBeNull();
    expect(screen.queryByText('per 23-11-2026')).toBeNull();
  });
});

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

const openBulkMenu = () => fireEvent.click(screen.getByRole('button', { name: /Aksi Massal/ }));
const closeBulkMenu = () => fireEvent.keyDown(document, { key: 'Escape' });

describe('DataBarang superadmin: detail penerimaan dummy', () => {
  it('mengarah ke halaman detail sesuai barang yang dipilih tanpa membuka popup', async () => {
    const second = { ...item, id: 2, code: 'LEM014', name: 'Barang 2', unit: 'lembar' };
    setup({}, {}, { rows: [item, second] });
    expect((await screen.findByRole('link', { name: 'Detail Barang 2' })).getAttribute('href')).toBe('/dashboard/superadmin/master/data-barang/2');
    expect(screen.getByRole('link', { name: 'Detail Barang 1' }).getAttribute('href')).toBe('/dashboard/superadmin/master/data-barang/1');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('tersedia dengan item.view tanpa izin mengubah barang', async () => {
    const user: AuthUser = { id: 1, username: 'u', email: 'u@x.id', roleId: 2, roleName: 'Staff', isSuperadmin: false, permissions: ['item.view'] };
    setup({}, {}, { user });
    expect(await screen.findByRole('link', { name: 'Detail Barang 1' })).not.toBeNull();
    expect(screen.queryByTitle('Sesuaikan stok')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Hapus' })).toBeNull();
  });

  it('menyembunyikan tombol detail tanpa item.view', async () => {
    const user: AuthUser = { id: 1, username: 'u', email: 'u@x.id', roleId: 2, roleName: 'Staff', isSuperadmin: false, permissions: ['item.adjust-stock'] };
    setup({}, {}, { user });
    await screen.findByText('Barang 1');
    expect(screen.queryByRole('link', { name: 'Detail Barang 1' })).toBeNull();
    expect(screen.getByTitle('Sesuaikan stok')).not.toBeNull();
  });
});

describe('DataBarang superadmin: aksi massal non-superadmin', () => {
  it('tidak tampil untuk pengguna non-superadmin', async () => {
    const user: AuthUser = { id: 1, username: 'u', email: 'u@x.id', roleId: 2, roleName: 'Staff', isSuperadmin: false, permissions: [] };
    setup({}, {}, { user });
    await screen.findByText('Barang 1');
    expect(screen.queryByRole('button', { name: /Aksi Massal/ })).toBeNull();
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
  it('checkbox header memilih semua barang terfilter lalu mengosongkan pilihan', async () => {
    const item2 = { ...item, id: 2, code: 'LEM014', name: 'Barang 2' };
    setup({}, { 'GET /api/v1/items': paged([item, item2], { total: 2 }) });
    await screen.findByText('Barang 1');
    fireEvent.click(screen.getByLabelText('Pilih semua barang'));
    expect(await screen.findByRole('button', { name: 'Aksi Massal (2)' })).not.toBeNull();
    openBulkMenu();
    expect(screen.queryByRole('menuitem', { name: 'Ganti Kode Massal' })).toBeNull();
    closeBulkMenu();
    // klik kedua pada checkbox header mengosongkan pilihan
    fireEvent.click(screen.getByLabelText('Pilih semua barang'));
    await waitFor(() => expect((screen.getByLabelText('Pilih semua barang') as HTMLInputElement).checked).toBe(false));
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
    openBulkMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Hapus Semua (2)' }));
    expect(prompt).toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 0));
    expect(api.calls('DELETE /api/v1/items/1')).toHaveLength(0);

    prompt.mockReturnValue('HAPUS SEMUA');
    openBulkMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Hapus Semua (2)' }));
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
    'GET /api/v1/suppliers': paged([{ id: 7, name: 'PT Kayu' }, { id: 8, name: 'CV Baja' }]),
    'GET /api/v1/items/categories': [{ id: 1, name: 'Lembaran' }],
    'GET /api/v1/items/units': [{ id: 1, name: 'pcs' }],
    'PUT /api/v1/items/1/suppliers': { ...item, supplierId: 7 },
    'PUT /api/v1/items/2/suppliers': { ...second, supplierId: 7 },
  };

  it('memetakan barang yang dicentang ke supplier', async () => {
    const api = installFakeApi(routes);
    render(<DataBarangGudang />);
    await screen.findByText('Barang 1');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Pilih Barang 1' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Pilih Barang 2' }));
    openBulkMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit Supplier' }));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: 'Supplier' }));
    fireEvent.click(dialog.getByRole('option', { name: 'PT Kayu' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Supplier' }));
    fireEvent.click(dialog.getByRole('option', { name: 'CV Baja' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Tinjau 2 Barang' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Simpan 2 Barang' }));

    await waitFor(() => expect(api.calls('PUT /api/v1/items/2/suppliers')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/items/1/suppliers')[0].body).toEqual({ supplierIds: [7, 8] });
    expect(api.calls('PUT /api/v1/items/2/suppliers')[0].body).toEqual({ supplierIds: [7, 8] });
    expect(await screen.findByText('2 barang dipetakan ke PT Kayu, CV Baja.')).not.toBeNull();
  });

  it('menyembunyikan aksi massal tanpa izin apa pun', async () => {
    installFakeApi(routes);
    const user: AuthUser = { id: 1, username: 'u', email: 'u@x.id', roleId: 2, roleName: 'Staff', isSuperadmin: false, permissions: ['item.update'] };
    render(<AuthUserProvider user={user}><DataBarangGudang /></AuthUserProvider>);
    await screen.findByText('Barang 1');
    expect(screen.queryByRole('button', { name: /Aksi Massal/ })).toBeNull();
  });

  it('menampilkan checkbox dan Edit Supplier tanpa item.upload-photo', async () => {
    installFakeApi(routes);
    const user: AuthUser = { id: 1, username: 'u', email: 'u@x.id', roleId: 2, roleName: 'Staff', isSuperadmin: false, permissions: ['item.update', 'item.set-supplier'] };
    render(<AuthUserProvider user={user}><DataBarangGudang /></AuthUserProvider>);
    await screen.findByText('Barang 1');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Pilih Barang 1' }));
    openBulkMenu();
    expect((screen.getByRole('menuitem', { name: 'Edit Supplier' }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole('menuitem', { name: 'Pasang Foto Massal' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Ganti Kode Massal' })).toBeNull();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit Supplier' }));
    expect(screen.getByRole('dialog')).not.toBeNull();
  });
});
