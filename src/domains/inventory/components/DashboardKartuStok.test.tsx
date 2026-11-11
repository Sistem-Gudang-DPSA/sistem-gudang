import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { fail, installFakeApi, paged } from '@/test/fake-api';
import { exportDaftarExcel, printDaftarPdf } from '@/shared/components/ExportStok';
import type { ItemListRow } from '../types';
import DashboardKartuStok from './DashboardKartuStok';

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard/gudang/laporan/kartu-stok' }));
vi.mock('@/shared/components/ExportStok', () => ({ exportDaftarExcel: vi.fn(), printDaftarPdf: vi.fn() }));

const item = (id: number, name: string): ItemListRow => ({
  id, code: `BRG-${id}`, name, category: 'Bahan', unit: 'Lembar', price: 0, stock: 10,
  locationId: null, locationCode: null, supplierId: null, supplierName: null,
});
const triplex = item(1, 'Triplex 2mm');
const paku = item(2, 'Paku');
const stockCard = (row: ItemListRow) => ({ item: row, openingBalance: 10, entries: [] });

function setup(handler: unknown = paged([triplex], { total: 45 })) {
  const api = installFakeApi({
    'GET /api/v1/items': handler,
    'GET /api/v1/items/1/stock-card': stockCard(triplex),
    'GET /api/v1/items/2/stock-card': stockCard(paku),
  });
  render(<DashboardKartuStok />);
  return api;
}
const lastQuery = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/items').at(-1)!.query;

beforeEach(() => vi.clearAllMocks());

describe('Kartu Stok list', () => {
  it('keeps project and usage filters inside View Detail', async () => {
    const api = setup();
    await screen.findByText('Triplex 2mm');
    expect(screen.queryByRole('button', { name: /^Filter/ })).toBeNull();
    expect(screen.queryByLabelText('Nama Proyek/Item')).toBeNull();
    expect(screen.getByRole('link', { name: 'View Detail' }).getAttribute('href')).toBe('/dashboard/gudang/laporan/kartu-stok/1');
    expect(lastQuery(api).get('itemName')).toBeNull();
    expect(lastQuery(api).get('project')).toBeNull();
  });

  it('searches on the server and resets pagination', async () => {
    const api = setup();
    await screen.findByText('Triplex 2mm');
    fireEvent.click(screen.getByRole('button', { name: 'Selanjutnya' }));
    await waitFor(() => expect(lastQuery(api).get('page')).toBe('2'));
    fireEvent.change(screen.getByPlaceholderText('Cari kode atau nama barang...'), { target: { value: 'Triplex' } });
    await waitFor(() => expect(lastQuery(api).get('search')).toBe('Triplex'));
    expect(lastQuery(api).get('page')).toBe('1');
  });

  it('exports and prints selected materials', async () => {
    setup(paged([triplex, paku]));
    await screen.findByText('Triplex 2mm');
    fireEvent.click(screen.getByLabelText('Centang Paku'));
    fireEvent.click(screen.getByRole('button', { name: 'Export Excel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Print PDF' }));
    expect(exportDaftarExcel).toHaveBeenCalledWith([paku]);
    expect(printDaftarPdf).toHaveBeenCalledWith([paku]);
  });

  it('shows an empty result', async () => {
    setup(paged([]));
    expect(await screen.findByText('Barang tidak ditemukan.')).toBeTruthy();
  });

  it('shows API errors', async () => {
    setup(fail(500, 'Gagal memuat barang'));
    expect(await screen.findByText('Gagal memuat barang')).toBeTruthy();
  });
});
