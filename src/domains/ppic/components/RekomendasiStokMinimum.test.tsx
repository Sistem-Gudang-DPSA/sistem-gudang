import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AuthUserProvider } from '@/domains/auth/user-context';
import { installFakeApi, paged } from '@/test/fake-api';
import RekomendasiStokMinimum, { isDiBawahMinimum, qtySaranRestock } from './RekomendasiStokMinimum';
import type { ItemListRow } from '@/domains/inventory/types';

const item = (overrides: Partial<ItemListRow> & { id: number; name: string }) => ({
  code: null, externalCode: null, stock: 0, minimumStock: null, unit: 'pcs', category: 'Umum', price: 0,
  locationId: null, locationCode: null, supplierId: null, supplierName: null, ...overrides,
} as ItemListRow);

const menipis = item({ id: 1, name: 'Triplex 2 mm', stock: 2, minimumStock: 10, unit: 'lembar', supplierName: 'PT Kayu' });
const pas = item({ id: 2, name: 'Lem', stock: 5, minimumStock: 5 });
const aman = item({ id: 3, name: 'Paku', stock: 8, minimumStock: 3 });
const tanpaBatas = item({ id: 4, name: 'Semen' });

const renderPanel = (existingItemIds = new Set<number>(), onAdd = vi.fn()) => {
  installFakeApi({ 'GET /api/v1/items': paged([aman, tanpaBatas, pas, menipis]) });
  render(<RekomendasiStokMinimum existingItemIds={existingItemIds} onAdd={onAdd} />);
  return onAdd;
};

describe('rekomendasi stok minimum', () => {
  it('hanya menampilkan barang yang menyentuh batas, urut dari yang paling kritis', async () => {
    renderPanel();
    expect(await screen.findByText('2 barang di bawah stok minimum')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Rekomendasi Restock/ }));
    const nama = screen.getAllByText(/Triplex 2 mm|^Lem$/).map((el) => el.textContent);
    expect(nama).toEqual(['Triplex 2 mm', 'Lem']);
    expect(screen.queryByText('Paku')).toBeNull();
    expect(screen.queryByText('Semen')).toBeNull();
    expect(screen.getByText('8')).toBeTruthy(); // saran qty Triplex: 10 - 2
    expect(screen.getByText('1')).toBeTruthy(); // saran qty Lem: minimal 1
  });

  it('menambahkan barang ke form lewat tombol Tambah', async () => {
    const onAdd = renderPanel();
    await screen.findByText('2 barang di bawah stok minimum');
    fireEvent.click(screen.getByRole('button', { name: /Rekomendasi Restock/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Tambah Triplex 2 mm ke permintaan' }));
    expect(onAdd).toHaveBeenCalledWith(menipis);
  });

  it('menonaktifkan barang yang sudah ada di form', async () => {
    renderPanel(new Set([1]));
    await screen.findByText('2 barang di bawah stok minimum');
    fireEvent.click(screen.getByRole('button', { name: /Rekomendasi Restock/ }));
    expect(screen.getByRole('button', { name: 'Tambah Triplex 2 mm ke permintaan' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Tambah Lem ke permintaan' })).toHaveProperty('disabled', false);
  });

  it('menampilkan pesan kosong dan menyembunyikan panel tanpa item.view', async () => {
    installFakeApi({ 'GET /api/v1/items': paged([aman]) });
    const { unmount } = render(<RekomendasiStokMinimum existingItemIds={new Set()} onAdd={vi.fn()} />);
    await screen.findByText('0 barang di bawah stok minimum');
    fireEvent.click(screen.getByRole('button', { name: /Rekomendasi Restock/ }));
    expect(screen.getByText('Tidak ada barang di bawah stok minimum.')).toBeTruthy();
    unmount();

    render(
      <AuthUserProvider user={{ id: 1, username: 'ppic', email: 'ppic@example.test', roleId: 3, roleName: 'PPIC', isSuperadmin: false, permissions: ['purchase-request.create'] }}>
        <RekomendasiStokMinimum existingItemIds={new Set()} onAdd={vi.fn()} />
      </AuthUserProvider>,
    );
    expect(screen.queryByRole('button', { name: /Rekomendasi Restock/ })).toBeNull();
  });

  it('menghitung kriteria dan qty saran', () => {
    expect(isDiBawahMinimum(pas)).toBe(true);
    expect(isDiBawahMinimum(aman)).toBe(false);
    expect(isDiBawahMinimum(tanpaBatas)).toBe(false);
    expect(qtySaranRestock(menipis)).toBe(8);
    expect(qtySaranRestock(pas)).toBe(1);
  });
});
