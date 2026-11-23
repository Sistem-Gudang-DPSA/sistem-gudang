import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { installFakeApi, paged, fail, type FakeRequest } from '@/test/fake-api';
import { withUser } from '@/test/as-user';
import DataLokasi from './DataLokasi';
import DataLokasiSuperadmin from '@/domains/superadmin/components/DataLokasi';

const lokasiA = { id: 1, code: 'A.1.1', rackName: 'A', rackNumber: '1.1', description: '' };
const lokasiB = { id: 2, code: 'B.1.1', rackName: 'B', rackNumber: '1.1', description: '' };
const barang = (id: number, name: string, locationId = 1) => ({ id, code: `BRG-${id}`, name, detail: 'Ukuran 2 mm', category: 'Bahan Baku', unit: 'Lbr', stock: id === 1 ? 0 : 12.5, price: 1000, locationId, locationCode: locationId === 1 ? 'A.1.1' : 'B.1.1', supplierId: null, supplierName: null });
const items = [barang(1, 'Triplex'), barang(2, 'Papan'), barang(3, 'Multiplek'), barang(4, 'Kayu'), barang(5, 'Baut', 2)];
const itemRoute = (req: FakeRequest) => {
  const rows = items.filter((item) => item.locationId === Number(req.query.get('locationId')));
  return paged(rows.slice(0, Number(req.query.get('pageSize'))), { total: rows.length });
};

describe.each([
  ['Gudang', DataLokasi],
  ['Superadmin', DataLokasiSuperadmin],
] as const)('informasi barang di Data Lokasi %s', (_division, Component) => {
  it('menampilkan ringkasan dan membuka seluruh barang hanya untuk lokasi yang dipilih termasuk stok nol', async () => {
    const api = installFakeApi({ 'GET /api/v1/locations': paged([lokasiA, lokasiB]), 'GET /api/v1/items': itemRoute });
    render(withUser(<Component />, ['location.view', 'item.view']));
    await screen.findByText('4 jenis barang');
    expect(screen.getByRole('columnheader', { name: 'Informasi Barang' })).not.toBeNull();
    expect(screen.getByText('Triplex, Papan, Multiplek, dan 1 lainnya')).not.toBeNull();
    expect(screen.getByText('1 jenis barang')).not.toBeNull();
    expect(api.calls('GET /api/v1/items')).toHaveLength(2);
    expect(api.calls('GET /api/v1/items').every((call) => call.query.get('pageSize') === '3' && call.query.has('locationId'))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Lihat barang di lokasi A.1.1' }));
    const dialog = within(await screen.findByRole('dialog'));
    await dialog.findByText('Triplex');
    expect(dialog.getByText('Barang di Lokasi A.1.1')).not.toBeNull();
    expect(dialog.getByText('Kayu')).not.toBeNull();
    expect(dialog.queryByText('Baut')).toBeNull();
    expect(dialog.getByText('0')).not.toBeNull();
    expect(dialog.getAllByText('12,5')).toHaveLength(3);
    expect(dialog.getByRole('columnheader', { name: 'Satuan' })).not.toBeNull();
    expect(api.calls('GET /api/v1/items').at(-1)!.query.get('locationId')).toBe('1');
    fireEvent.click(dialog.getByRole('button', { name: 'Tutup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lihat barang di lokasi B.1.1' }));
    const next = within(await screen.findByRole('dialog'));
    await next.findByText('Baut');
    expect(next.queryByText('Triplex')).toBeNull();
    expect(api.calls('GET /api/v1/items').at(-1)!.query.get('locationId')).toBe('2');
  });

  it('tidak meminta atau membuka data barang tanpa permission item.view', async () => {
    const api = installFakeApi({ 'GET /api/v1/locations': paged([lokasiA]) });
    render(withUser(<Component />, ['location.view']));
    await screen.findByText('A.1.1');
    expect(screen.getByText('Tidak memiliki izin melihat barang.')).not.toBeNull();
    expect(screen.queryByRole('button', { name: /Lihat barang di lokasi/ })).toBeNull();
    expect(api.calls('GET /api/v1/items')).toHaveLength(0);
  });

  it('menampilkan keadaan kosong pada lokasi tanpa barang', async () => {
    installFakeApi({ 'GET /api/v1/locations': paged([lokasiA]), 'GET /api/v1/items': paged([]) });
    render(withUser(<Component />, ['location.view', 'item.view']));
    await screen.findByText('Belum ada barang di lokasi ini.');
    fireEvent.click(screen.getByRole('button', { name: 'Lihat barang di lokasi A.1.1' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(await dialog.findByText('Belum ada barang di lokasi ini.')).not.toBeNull();
  });

  it('menampilkan kegagalan pemuatan dan memungkinkan coba lagi tanpa menganggap lokasi kosong', async () => {
    let failed = true;
    installFakeApi({ 'GET /api/v1/locations': paged([lokasiA]), 'GET /api/v1/items': () => failed ? fail(500, 'Barang gagal dimuat') : paged([items[0]]) });
    render(withUser(<Component />, ['location.view', 'item.view']));
    await screen.findByRole('alert');
    expect(screen.queryByText('Belum ada barang di lokasi ini.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Lihat barang di lokasi A.1.1' }));
    const dialog = within(await screen.findByRole('dialog'));
    await dialog.findByRole('alert');
    failed = false;
    fireEvent.click(dialog.getByRole('button', { name: 'Coba lagi' }));
    expect(await dialog.findByText('Triplex')).not.toBeNull();
  });
});

it('paginasi dan pencarian tetap memakai lokasi yang dipilih serta mereset halaman saat pencarian berubah', async () => {
  const api = installFakeApi({
    'GET /api/v1/locations': paged([lokasiA]),
    'GET /api/v1/items': (req: FakeRequest) => paged([items[0]], { total: req.query.has('search') ? 1 : 21, page: Number(req.query.get('page')) }),
  });
  render(withUser(<DataLokasi />, ['location.view', 'item.view']));
  fireEvent.click(await screen.findByRole('button', { name: 'Lihat barang di lokasi A.1.1' }));
  const dialog = within(await screen.findByRole('dialog'));
  await dialog.findByText('Triplex');
  fireEvent.click(dialog.getByRole('button', { name: 'Selanjutnya' }));
  await waitFor(() => expect(api.calls('GET /api/v1/items').at(-1)!.query.get('page')).toBe('2'));
  fireEvent.change(dialog.getByRole('searchbox', { name: 'Cari barang di lokasi' }), { target: { value: 'Triplex' } });
  await waitFor(() => {
    const query = api.calls('GET /api/v1/items').at(-1)!.query;
    expect(query.get('search')).toBe('Triplex');
    expect(query.get('page')).toBe('1');
    expect(query.get('pageSize')).toBe('20');
    expect(query.get('locationId')).toBe('1');
  });
});
