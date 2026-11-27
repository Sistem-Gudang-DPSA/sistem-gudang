import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { installFakeApi, paged } from '@/test/fake-api';
import { withUser } from '@/test/as-user';
import Gudang from '@/app/dashboard/gudang/master/data-barang/page';
import BarangJadi from '@/app/dashboard/gudang-barang-jadi/master/data-barang/page';
import Ppic from '@/app/dashboard/ppic/master/data-barang/page';
import Purchasing from '@/app/dashboard/purchasing/master/data-barang/page';
import Superadmin from '@/app/dashboard/superadmin/master/data-barang/page';
import Keuangan from '@/app/dashboard/keuangan/laporan/data-barang/page';
import Produksi from '@/app/dashboard/produksi/laporan/data-barang/page';

const route = vi.hoisted(() => ({ pathname: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => route.pathname,
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const item = {
  id: 1, code: 'BRG-1', name: 'Material uji', externalCode: null, detail: null,
  category: 'Lembaran', unit: 'Pcs', stock: 10, minimumStock: 1, price: 10000,
  supplierId: 7, supplierName: 'PT Kayu', locationId: 1, locationCode: 'A01', photo: null,
};
const routes = {
  'GET /api/v1/locations': paged([{ id: 1, code: 'A01', rackName: 'A', rackNumber: '01' }]),
  'GET /api/v1/suppliers': paged([{ id: 7, name: 'PT Kayu' }]),
  'GET /api/v1/items/categories': [{ id: 1, name: 'Lembaran' }],
  'GET /api/v1/items/units': [{ id: 1, name: 'Pcs' }],
};

describe.each([
  ['Gudang', '/dashboard/gudang/master/data-barang', Gudang],
  ['Gudang Barang Jadi', '/dashboard/gudang-barang-jadi/master/data-barang', BarangJadi],
  ['PPIC', '/dashboard/ppic/master/data-barang', Ppic],
  ['Purchasing', '/dashboard/purchasing/master/data-barang', Purchasing],
  ['Superadmin', '/dashboard/superadmin/master/data-barang', Superadmin],
  ['Keuangan', '/dashboard/keuangan/laporan/data-barang', Keuangan],
  ['Produksi', '/dashboard/produksi/laporan/data-barang', Produksi],
] as const)('kolom Data Barang %s', (_division, pathname, Page) => {
  it('menghapus header dan sel supplier, mempertahankan kontrol filter, dan menyelaraskan sel loading', async () => {
    route.pathname = pathname;
    installFakeApi({ ...routes, 'GET /api/v1/items': paged([item]) });
    render(withUser(<Page />, [], true));
    const table = within(screen.getByRole('region', { name: 'Tabel Data Barang' })).getByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    expect(within(table).getByText('Memuat data...').closest('td')!.colSpan).toBe(headers.length);
    const row = (await within(table).findByText('Material uji')).closest('tr')!;
    expect(within(table).queryByRole('columnheader', { name: 'Supplier' })).toBeNull();
    expect(within(row).queryByText('PT Kayu')).toBeNull();
    expect(row.cells.length).toBe(headers.length);
    const filter = screen.getByRole('button', { name: /Filter/ });
    expect(filter).toBeTruthy();
    // Filter PPIC masih berupa tombol tanpa panel; enam layar lain memakai panel supplier.
    if (_division !== 'PPIC') {
      fireEvent.click(filter);
      expect(await screen.findByRole('option', { name: 'PT Kayu' })).toBeTruthy();
    }
  });

  it('menyamakan lebar sel tabel kosong dengan jumlah header yang tersisa', async () => {
    route.pathname = pathname;
    installFakeApi({ ...routes, 'GET /api/v1/items': paged([]) });
    render(withUser(<Page />, [], true));
    const table = within(screen.getByRole('region', { name: 'Tabel Data Barang' })).getByRole('table');
    const empty = await within(table).findByText('Belum ada data barang.');
    expect(empty.closest('td')!.colSpan).toBe(within(table).getAllByRole('columnheader').length);
    expect(within(table).queryByRole('columnheader', { name: 'Supplier' })).toBeNull();
  });
});
