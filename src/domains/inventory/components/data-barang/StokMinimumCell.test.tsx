import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthUserProvider } from '@/domains/auth/user-context';
import { fail, installFakeApi, paged } from '@/test/fake-api';
import Gudang from '@/domains/inventory/components/DataBarang';
import GudangBarangJadi from '@/domains/inventory/components/DataBarangBarangJadi';
import Ppic from '@/domains/ppic/components/DataBarang';
import Purchasing from '@/domains/purchasing/components/DataBarang';
import Superadmin from '@/domains/superadmin/components/DataBarang';
import StokMinimumCell, { peringatanStokMinimum } from './StokMinimumCell';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: vi.fn() }), usePathname: () => '/dashboard/gudang/master/data-barang', useParams: () => ({}) }));
const item = { id: 1, code: 'LEM001', externalCode: null, name: 'Triplex 2 mm', stock: 10, minimumStock: 10, unit: 'lembar', category: 'Lembaran', price: 0, locationId: null, locationCode: null, supplierId: null, supplierName: null };
const user = (permissions: string[]) => ({ id: 1, username: 'staff', email: 'staff@example.test', roleId: 2, roleName: 'Staff', isSuperadmin: false, permissions });
const routes = {
  'GET /api/v1/items': paged([item]), 'GET /api/v1/locations': paged([]), 'GET /api/v1/suppliers': paged([]),
  'GET /api/v1/items/categories': [], 'GET /api/v1/items/units': [],
  'PUT /api/v1/items/1': item,
};

describe.each([['Gudang', Gudang], ['Gudang Barang Jadi', GudangBarangJadi], ['PPIC', Ppic], ['Purchasing', Purchasing], ['Superadmin', Superadmin]] as const)('stok minimum %s', (_name, Page) => {
  it('shows the same per-item editor and saves a decimal threshold', async () => {
    const api = installFakeApi(routes);
    render(<AuthUserProvider user={user(['item.view', 'item.update'])}><Page /></AuthUserProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Atur stok minimum Triplex 2 mm' }));
    const input = screen.getByLabelText('Batas stok minimum (lembar)') as HTMLInputElement;
    expect(input.value).toBe('10');
    fireEvent.change(input, { target: { value: '5,125' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    await waitFor(() => expect(api.calls('PUT /api/v1/items/1')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/items/1')[0].body).toEqual({ minimumStock: 5.125 });
    await waitFor(() => expect(screen.queryByLabelText('Batas stok minimum (lembar)')).toBeNull());
  });

  it('hides the edit action without item.update', async () => {
    installFakeApi(routes);
    render(<AuthUserProvider user={user(['item.view'])}><Page /></AuthUserProvider>);
    await screen.findByText('Triplex 2 mm');
    expect(screen.getByRole('columnheader', { name: 'Stok Minimum' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Atur stok minimum Triplex 2 mm' })).toBeNull();
  });
});

describe('per-item stock threshold', () => {
  it.each(['', '0', '0.125', '10', '999999999'])('accepts %s', (value) => expect(peringatanStokMinimum(value)).toBe(''));
  it.each(['1.', '-1', '1.1234', '1e2', '1000000000'])('rejects %s', (value) => expect(peringatanStokMinimum(value)).not.toBe(''));

  it('disables notifications by clearing the threshold', async () => {
    const api = installFakeApi(routes);
    render(<StokMinimumCell item={item} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Atur stok minimum Triplex 2 mm' }));
    fireEvent.change(screen.getByLabelText('Batas stok minimum (lembar)'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    await waitFor(() => expect(api.calls('PUT /api/v1/items/1')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/items/1')[0].body).toEqual({ minimumStock: null });
  });

  it('keeps the value and shows the server error when saving fails', async () => {
    installFakeApi({ ...routes, 'PUT /api/v1/items/1': fail(500, 'Gagal menyimpan batas') });
    render(<StokMinimumCell item={item} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Atur stok minimum Triplex 2 mm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Gagal menyimpan batas');
    expect((screen.getByLabelText('Batas stok minimum (lembar)') as HTMLInputElement).value).toBe('10');
  });
});
