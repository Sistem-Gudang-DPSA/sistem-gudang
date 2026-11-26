import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, fail, type FakeRequest } from '@/test/fake-api';
import { withUser } from '@/test/as-user';
import { StockOpnameIsiGudang } from './StockOpnameTambah';

const nav = vi.hoisted(() => ({ id: '7', pathname: '/dashboard/gudang/transaksi/stock-opname/isi/7', push: vi.fn(), scan: 'B-2' }));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: nav.id }), usePathname: () => nav.pathname, useRouter: () => ({ push: nav.push }) }));
vi.mock('./QrCameraScanner', () => ({ default: ({ onScan }: { onScan: (code: string) => void }) => <button type="button" onClick={() => onScan(nav.scan)}>mock scan</button> }));
beforeEach(() => { nav.id = '7'; nav.pathname = '/dashboard/gudang/transaksi/stock-opname/isi/7'; nav.push.mockClear(); });

const detail = (status = 'OPEN', over: Record<string, unknown> = {}) => ({
  id: 7, month: 3, year: 2026, status, progress: { filled: 1, total: 2 }, notes: null, createdBy: 1, createdAt: '2026-03-01T00:00:00Z',
  lines: [
    { itemId: 1, itemCode: 'B-1', itemName: 'Triplex', unit: 'lbr', category: 'Bahan', systemQty: null, physicalQty: 8, difference: null, systemPrice: null, physicalPrice: null, note: 'rak A' },
    { itemId: 2, itemCode: 'B-2', itemName: 'Paku', unit: 'kg', category: 'Bahan', systemQty: null, physicalQty: null, difference: null, systemPrice: null, physicalPrice: null, note: null },
  ],
  ...over,
});
const permissions = ['stock-opname.create', 'stock-opname.view'];

function setup(status = 'OPEN', extra: Record<string, unknown> = {}, perms = permissions) {
  const api = installFakeApi({
    'GET /api/v1/stock-opname/7': detail(status),
    'PATCH /api/v1/stock-opname/7/lines': (req: FakeRequest) => ({ ...detail(status), ...req.body as object }),
    'POST /api/v1/stock-opname/7/submit': detail('SUBMITTED'),
    'GET /api/v1/items/by-code/B-2': { id: 2, code: 'B-2', name: 'Paku', unit: 'kg', category: 'Bahan', price: 0, stock: 99 },
    ...extra,
  });
  render(withUser(<StockOpnameIsiGudang />, perms));
  return api;
}
const loaded = () => screen.findByDisplayValue('8');

describe('isi stok opname Gudang', () => {
  it('shows the physical form without system stock, price, or difference', async () => {
    setup();
    await loaded();
    expect(await screen.findByText(/Progress: 1 \/ 2 barang/)).not.toBeNull();
    expect(screen.queryByRole('columnheader', { name: /Jumlah Administrasi|Selisih/ })).toBeNull();
    expect(screen.getByLabelText('Jumlah fisik Triplex')).toHaveProperty('value', '8');
  });

  it('saves entered rows in chunks and reports that system stock did not change', async () => {
    const api = setup();
    await loaded();
    fireEvent.change(screen.getByLabelText('Jumlah fisik Paku'), { target: { value: '3,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Sebagian' }));
    expect(await screen.findByText('Isian tersimpan. Stok sistem belum berubah.')).not.toBeNull();
    expect(api.calls('PATCH /api/v1/stock-opname/7/lines')[0].body).toEqual({ lines: [{ itemId: 1, physicalQty: 8, note: 'rak A' }, { itemId: 2, physicalQty: 3.5 }] });
    expect(api.calls('POST /api/v1/stock-opname/7/submit')).toHaveLength(0);
  });

  it('sends physicalQty null when a saved row is cleared', async () => {
    const api = setup();
    await loaded();
    fireEvent.click(screen.getByLabelText('Hapus isian Triplex'));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Sebagian' }));
    await screen.findByText('Isian tersimpan. Stok sistem belum berubah.');
    expect(api.calls('PATCH /api/v1/stock-opname/7/lines')[0].body).toEqual({ lines: [{ itemId: 1, physicalQty: null }] });
  });

  it('submits after saving and uses the new confirmation text', async () => {
    const api = setup();
    await loaded();
    fireEvent.change(screen.getByLabelText('Jumlah fisik Paku'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Stok sistem belum berubah. Selisih akan diproses setelah PPIC memposting pemutihan.')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ya, Submit' }));
    await waitFor(() => expect(api.calls('POST /api/v1/stock-opname/7/submit')).toHaveLength(1));
    expect(api.calls('PATCH /api/v1/stock-opname/7/lines')).toHaveLength(1);
    expect(nav.push).toHaveBeenCalledWith('/dashboard/gudang/transaksi/stock-opname');
  });

  it('keeps submitted opname read-only', async () => {
    setup('SUBMITTED');
    await screen.findByText(/Status: Disubmit/);
    expect(screen.queryByLabelText('Jumlah fisik Triplex')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Simpan Sebagian' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
    expect(screen.getByText('8')).not.toBeNull();
  });

  it('does not allow editing without stock-opname.create', async () => {
    setup('OPEN', {}, ['stock-opname.view']);
    await screen.findByText(/Status: Open/);
    expect(screen.queryByLabelText('Jumlah fisik Triplex')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
  });

  it('shows the backend error when submit fails', async () => {
    setup('OPEN', { 'POST /api/v1/stock-opname/7/submit': fail(409, 'Masih ada barang belum diisi') });
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Ya, Submit' }));
    expect(await screen.findByText('Masih ada barang belum diisi')).not.toBeNull();
    expect(nav.push).not.toHaveBeenCalled();
  });

  it('rejects a physical count above 1.000.000 without saving', async () => {
    const api = setup();
    await loaded();
    fireEvent.change(screen.getByLabelText('Jumlah fisik Paku'), { target: { value: '1000001' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Sebagian' }));
    expect(await screen.findByText(/Jumlah fisik harus 0 sampai 1.000.000/)).not.toBeNull();
    expect(api.calls('PATCH /api/v1/stock-opname/7/lines')).toHaveLength(0);
  });

  it('scan fills a row that belongs to the opname and rejects an unknown item', async () => {
    const api = setup('OPEN', {
      'GET /api/v1/items/by-code/B-9': { id: 9, code: 'B-9', name: 'Cat', unit: 'kaleng', category: 'Bahan', price: 0, stock: 5 },
    });
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: 'Scan QR' }));
    fireEvent.click(await screen.findByRole('button', { name: 'mock scan' }));
    expect(await screen.findByLabelText('Jumlah fisik scan')).not.toBeNull();
    fireEvent.change(screen.getByLabelText('Jumlah fisik scan'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Masukkan ke opname' }));
    expect(screen.getByLabelText('Jumlah fisik Paku')).toHaveProperty('value', '3');
    expect(api.calls('GET /api/v1/items/by-code/B-2')).toHaveLength(1);

    nav.scan = 'B-9';
    fireEvent.click(screen.getByRole('button', { name: 'Scan QR' }));
    fireEvent.click(await screen.findByRole('button', { name: 'mock scan' }));
    expect(await screen.findByText('Barang "Cat" tidak ada pada periode opname ini.')).not.toBeNull();
  });

  it('renders the invalid-id message', async () => {
    nav.id = 'abc';
    installFakeApi({});
    render(withUser(<StockOpnameIsiGudang />, permissions));
    expect(await screen.findByText('ID stok opname tidak valid.')).not.toBeNull();
  });
});
