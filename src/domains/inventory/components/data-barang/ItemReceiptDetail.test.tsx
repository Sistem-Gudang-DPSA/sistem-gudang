import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { fail, installFakeApi } from '@/test/fake-api';
import { AuthUserProvider } from '@/domains/auth/user-context';
import type { AuthUser } from '@/domains/auth/types';
import ItemReceiptDetail from './ItemReceiptDetail';

const route = vi.hoisted(() => ({ id: '2' }));
vi.mock('next/navigation', () => ({ useParams: () => route }));

const item = { id: 2, code: 'LEM014', name: 'Kayu Lapis', unit: 'lembar', category: 'Lembaran', price: 1000, stock: 30, supplierId: 7, locationId: 1, createdAt: null, updatedAt: null };

describe('Halaman detail penerimaan barang', () => {
  it('memuat identitas barang dari URL dan menampilkan tabel dummy serta link kembali khusus Superadmin', async () => {
    route.id = '2';
    const api = installFakeApi({ 'GET /api/v1/items/2': item });
    render(<ItemReceiptDetail />);
    expect(screen.getByRole('status').textContent).toContain('Memuat');
    expect(await screen.findByText('Kayu Lapis')).not.toBeNull();
    expect(api.calls('GET /api/v1/items/2')).toHaveLength(1);
    expect(screen.getByText(/Kode barang: LEM014/)).not.toBeNull();
    expect(screen.getByText(/Data dummy:/)).not.toBeNull();
    for (const name of ['Tanggal Masuk', 'Jumlah', 'Sisa Stok', 'Nilai Stok', 'Harga per Satuan', 'Supplier']) {
      expect(screen.getByRole('columnheader', { name })).not.toBeNull();
    }
    expect(screen.getAllByRole('row')).toHaveLength(5);
    expect(screen.getByText('18 November 2026')).not.toBeNull();
    expect(screen.getByText('10 November 2026')).not.toBeNull();
    expect(screen.getByText('25 lembar')).not.toBeNull();
    expect(screen.getByText(/Rp\s*125\.000/)).not.toBeNull();
    expect(screen.getByText(/Rp\s*120\.000/)).not.toBeNull();
    expect(screen.getByText('CV Mitra Sejahtera')).not.toBeNull();
    expect(screen.getAllByText('PT Sumber Material')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Kembali ke Data Barang' }).getAttribute('href')).toBe('/dashboard/superadmin/master/data-barang');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('menghitung nilai dari sisa stok tiap penerimaan dan menjumlahkannya, termasuk stok habis', async () => {
    route.id = '2';
    installFakeApi({ 'GET /api/v1/items/2': item });
    render(<ItemReceiptDetail />);
    await screen.findByText('Kayu Lapis');
    const rows = screen.getAllByRole('row');
    expect(within(rows[0]).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Tanggal Masuk', 'Jumlah', 'Sisa Stok', 'Harga per Satuan', 'Nilai Stok', 'Supplier',
    ]);
    const examples = [
      { remaining: '20 lembar', value: /Rp\s*2\.500\.000/ },
      { remaining: '10 lembar', value: /Rp\s*1\.200\.000/ },
      { remaining: '0 lembar', value: /Rp\s*0$/ },
    ];
    examples.forEach((example, index) => {
      const cells = within(rows[index + 1]).getAllByRole('cell');
      expect(cells[2].textContent).toBe(example.remaining);
      expect(cells[4].textContent).toMatch(example.value);
    });
    const total = screen.getByRole('rowheader', { name: 'Total Nilai Stok' }).closest('tr')!;
    expect(within(total).getByText(/Rp\s*3\.700\.000/)).not.toBeNull();
  });

  it('memfilter rentang tanggal secara inklusif dan mengembalikan semua baris saat reset', async () => {
    route.id = '2';
    const api = installFakeApi({ 'GET /api/v1/items/2': item });
    render(<ItemReceiptDetail />);
    await screen.findByText('Kayu Lapis');
    expect(screen.queryByRole('button', { name: 'Tanggal Masuk' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Supplier' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Dari tanggal'), { target: { value: '2026-11-10' } });
    expect(screen.getByText('10 November 2026')).not.toBeNull();
    expect(screen.getByText('18 November 2026')).not.toBeNull();
    expect(screen.queryByText('02 November 2026')).toBeNull();
    fireEvent.change(screen.getByLabelText('Sampai tanggal'), { target: { value: '2026-11-10' } });
    expect(screen.getByText('10 November 2026')).not.toBeNull();
    expect(screen.queryByText('18 November 2026')).toBeNull();
    expect(screen.getByText(/Rp\s*3\.700\.000/)).not.toBeNull();
    expect(screen.getByText('Seluruh penerimaan')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reset filter' }));
    expect(screen.getAllByRole('row')).toHaveLength(5);
    expect(screen.getByLabelText('Dari tanggal').getAttribute('value')).toBe('');
    expect(screen.getByLabelText('Sampai tanggal').getAttribute('value')).toBe('');
    expect(api.calls('GET /api/v1/items/2')).toHaveLength(1);
  });

  it('menggabungkan filter supplier dan tanggal serta menampilkan keadaan kosong', async () => {
    route.id = '2';
    installFakeApi({ 'GET /api/v1/items/2': item });
    render(<ItemReceiptDetail />);
    await screen.findByText('Kayu Lapis');
    fireEvent.click(screen.getByRole('button', { name: 'Filter supplier' }));
    fireEvent.click(screen.getByRole('option', { name: 'PT Sumber Material' }));
    expect(screen.getByText('18 November 2026')).not.toBeNull();
    expect(screen.getByText('02 November 2026')).not.toBeNull();
    expect(screen.queryByText('10 November 2026')).toBeNull();
    fireEvent.change(screen.getByLabelText('Sampai tanggal'), { target: { value: '2026-11-10' } });
    expect(screen.getByText('02 November 2026')).not.toBeNull();
    expect(screen.queryByText('18 November 2026')).toBeNull();
    fireEvent.change(screen.getByLabelText('Dari tanggal'), { target: { value: '2026-11-10' } });
    expect(screen.getByText('Tidak ada penerimaan yang sesuai filter.')).not.toBeNull();
    expect(screen.getByText(/Rp\s*3\.700\.000/)).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reset filter' }));
    expect(screen.getAllByRole('row')).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Filter supplier' }).textContent).toContain('Semua supplier');
  });

  it('menampilkan kegagalan memuat barang tanpa tabel dummy', async () => {
    route.id = '2';
    installFakeApi({ 'GET /api/v1/items/2': fail(404, 'Barang tidak ditemukan') });
    render(<ItemReceiptDetail />);
    expect((await screen.findByRole('alert')).textContent).toContain('Barang tidak ditemukan');
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('menolak ID tidak valid tanpa meminta data barang', () => {
    route.id = 'invalid';
    const api = installFakeApi({});
    render(<ItemReceiptDetail />);
    expect(screen.getByRole('alert').textContent).toBe('ID barang tidak valid.');
    expect(api.calls('GET /api/v1/items/NaN')).toHaveLength(0);
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('menolak akses tanpa permission item.view', () => {
    route.id = '2';
    const api = installFakeApi({ 'GET /api/v1/items/2': item });
    const user: AuthUser = { id: 1, username: 'u', email: 'u@x.id', roleId: 2, roleName: 'Staff', isSuperadmin: false, permissions: [] };
    render(<AuthUserProvider user={user}><ItemReceiptDetail /></AuthUserProvider>);
    expect(screen.getByRole('alert').textContent).toContain('tidak memiliki izin');
    expect(api.calls('GET /api/v1/items/2')).toHaveLength(0);
    expect(screen.queryByRole('table')).toBeNull();
  });
});
