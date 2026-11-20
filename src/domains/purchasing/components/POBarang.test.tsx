import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { fail, installFakeApi, paged, type FakeRequest } from '@/test/fake-api';
import { downloadBlob } from '@/shared/lib/download';
import POBarang from './POBarang';
import RekapPembelian from './RekapPembelian';
import { AuthUserProvider } from '@/domains/auth/user-context';
import type { AuthUser } from '@/domains/auth/types';

const print = vi.hoisted(() => ({ printPurchaseOrders: vi.fn(async () => {}) }));
vi.mock('@/domains/purchasing/export/print-po', () => print);
beforeEach(() => { print.printPurchaseOrders.mockReset(); print.printPurchaseOrders.mockResolvedValue(undefined); });

vi.mock('@/shared/lib/download', () => ({ downloadBlob: vi.fn() }));

const order = (id: number) => ({
  id, nomorPo: `PO-${id}`, approvalRequestId: id + 100, tanggalPo: '2026-05-01T00:00:00Z',
  supplierName: `Supplier ${id}`, status: 'ISSUED',
});
const lastQ = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/purchase-orders').at(-1)!.query;

describe('purchasing POBarang', () => {
  it('sends the sort column and direction and returns to page 1', async () => {
    const api = installFakeApi({ 'GET /api/v1/purchase-orders': paged([order(1)], { total: 45 }) });
    render(<POBarang />);
    expect(screen.getByRole('heading', { level: 1, name: 'PO BARANG' })).toBeTruthy();
    expect(screen.getByText('Kelola pemesanan pembelian barang.')).toBeTruthy();
    await screen.findByText('PO-1');
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    await waitFor(() => expect(lastQ(api).get('page')).toBe('3'));
    fireEvent.click(screen.getByRole('button', { name: /Tanggal/ }));
    await waitFor(() => expect(lastQ(api).get('sortBy')).toBe('date'));
    expect(lastQ(api).get('sortDir')).toBe('asc');
    expect(lastQ(api).get('page')).toBe('1');
  });

  it('searches and filters POs by date with pagination reset', async () => {
    const api = installFakeApi({ 'GET /api/v1/purchase-orders': paged([order(1)], { total: 45 }) });
    render(<POBarang />);
    await screen.findByText('PO-1');
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    await waitFor(() => expect(lastQ(api).get('page')).toBe('3'));
    fireEvent.change(screen.getByRole('textbox', { name: 'Cari PO Barang' }), { target: { value: 'PO-1' } });
    await waitFor(() => expect(lastQ(api).get('search')).toBe('PO-1'));
    expect(lastQ(api).get('page')).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[2], { target: { value: '2026' } });
    fireEvent.change(selects[1], { target: { value: '05' } });
    await waitFor(() => expect(lastQ(api).get('startDate')).toBe('2026-05-01'));
    expect(lastQ(api).get('endDate')).toBe('2026-05-31');
    expect(lastQ(api).get('page')).toBe('1');
  });

  it('exports a CSV with matching headers, escaped fields, and can export twice', async () => {
    installFakeApi({ 'GET /api/v1/purchase-orders': paged([{ ...order(1), supplierName: 'Supplier "besar", Jakarta' }]) });
    render(<POBarang />);
    await screen.findByText('Supplier "besar", Jakarta');
    const btn = screen.getByRole('button', { name: /Export Excel/ });
    fireEvent.click(btn);
    fireEvent.click(btn);
    const calls = vi.mocked(downloadBlob).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][1]).toBe('PO_Barang_halaman-1.csv');
    const [head, row] = (await (calls[0][0] as Blob).text()).split('\r\n');
    expect(head).toBe('"No","Tanggal","Nomor PO","Supplier","Status"');
    expect(row).toBe('"1","2026-05-01","PO-1","Supplier ""besar"", Jakarta","ISSUED"');
  });
});

describe('purchase requests stay in Rekap Pembelian', () => {
  it('reads actual POs and keeps the Gudang request in the recap until a PO exists', async () => {
    const api = installFakeApi({
      'GET /api/v1/purchase-orders': paged([order(1)]),
      'GET /api/v1/approvals': paged([{
        id: 9, type: 'purchase-request', status: 'pending', createdAt: '2026-05-01T00:00:00Z',
        payload: { bagian: 'Gudang', notes: 'Permintaan Gudang', items: [] },
      }]),
    });
    const po = render(<POBarang />);
    await screen.findByText('PO-1');
    expect(screen.queryByText('Permintaan Gudang')).toBeNull();
    expect(api.calls('GET /api/v1/approvals')).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Lihat Permintaan' }).getAttribute('href')).toBe(
      '/dashboard/purchasing/laporan/rekap-pembelian/permintaan-pembelian/101',
    );
    po.unmount();
    render(<RekapPembelian />);
    await screen.findByText('Permintaan Gudang');
    expect(screen.getByRole('link', { name: 'Lihat Permintaan' }).getAttribute('href')).toBe(
      '/dashboard/purchasing/laporan/rekap-pembelian/permintaan-pembelian/9',
    );
  });

  it('lists direct POs without a purchase request link', async () => {
    installFakeApi({ 'GET /api/v1/purchase-orders': paged([{ ...order(1), approvalRequestId: null }]) });
    render(<POBarang />);
    await screen.findByText('PO-1');
    expect(screen.queryByRole('link', { name: 'Lihat Permintaan' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Lihat Detail PO' }).getAttribute('href')).toBe('/dashboard/purchasing/transaksi/buat-po-barang/detail-po/1');
  });

  it('shows an empty PO list when there are no POs', async () => {
    installFakeApi({ 'GET /api/v1/purchase-orders': paged([]) });
    render(<POBarang />);
    await screen.findByText('Belum ada PO Barang.');
    expect((screen.getByRole('button', { name: 'Export Excel' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it.each([
    { permissions: ['purchase-order.view'], create: false, review: false, view: true },
    { permissions: ['purchase-order.view', 'purchase-order.create', 'purchase-request.approve'], create: true, review: true, view: true },
    { permissions: ['purchase-order.create'], create: true, review: false, view: false },
  ])('guards list and actions with $permissions', async ({ permissions, create, review, view }) => {
    const api = installFakeApi({ 'GET /api/v1/purchase-orders': paged([order(1)]) });
    const user: AuthUser = {
      id: 1, username: 'purchasing', email: 'p@example.com', roleId: 1,
      roleName: 'Purchasing', isSuperadmin: false, domainCode: 'purchasing', permissions,
    };
    render(<AuthUserProvider user={user}><POBarang /></AuthUserProvider>);
    await screen.findByText(view ? 'PO-1' : 'Belum ada PO Barang.');
    expect(!!screen.queryByRole('link', { name: 'Buat Pesanan Baru' })).toBe(create);
    expect(!!screen.queryByRole('link', { name: 'Lihat Detail PO' })).toBe(view);
    expect(!!screen.queryByRole('link', { name: 'Lihat Permintaan' })).toBe(review);
    expect(api.calls('GET /api/v1/purchase-orders')).toHaveLength(view ? 1 : 0);
    expect(!!screen.queryByRole('button', { name: 'Print' })).toBe(view);
    expect(!!screen.queryByRole('checkbox', { name: 'Centang PO-1' })).toBe(view);
  });
});

const savedOrder = (id: number) => ({ ...order(id), kebutuhanProyek: `Proyek ${id}`, barang: [{ kodeBarang: 'B-1', namaBarang: 'Triplex', satuan: 'Lembar', jumlah: 1, hargaSatuan: 2000, diskon: 0 }], grandTotal: 2220 });

describe('printing checked purchase orders', () => {
  it('prints only checked PO details and requires at least one selection', async () => {
    const api = installFakeApi({
      'GET /api/v1/purchase-orders': paged([order(1), order(2)]),
      'GET /api/v1/purchase-orders/1': savedOrder(1),
    });
    render(<POBarang />);
    await screen.findByText('PO-1');
    const button = screen.getByRole('button', { name: 'Print' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Centang PO-1' }));
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    await waitFor(() => expect(print.printPurchaseOrders).toHaveBeenCalledWith([savedOrder(1)]));
    expect(api.calls('GET /api/v1/purchase-orders/2')).toHaveLength(0);
    expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(0);
    await screen.findByText('Dialog cetak dibuka untuk 1 PO: PO-1.');
  });

  it('selects or clears the whole current page and supports Reset pilihan', async () => {
    installFakeApi({ 'GET /api/v1/purchase-orders': paged([order(1), order(2)]) });
    render(<POBarang />);
    await screen.findByText('PO-1');
    const all = screen.getByRole('checkbox', { name: 'Centang semua PO di halaman ini' });
    fireEvent.click(all);
    expect((screen.getByRole('checkbox', { name: 'Centang PO-1' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: 'Centang PO-2' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(all);
    expect((screen.getByRole('button', { name: 'Print' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(all);
    fireEvent.click(screen.getByRole('button', { name: 'Reset pilihan PO' }));
    expect((screen.getByRole('checkbox', { name: 'Centang PO-1' }) as HTMLInputElement).checked).toBe(false);
  });

  it('keeps selections across pages, prints them together, and resets when search changes', async () => {
    installFakeApi({
      'GET /api/v1/purchase-orders': (req: FakeRequest) => paged([order(req.query.get('page') === '2' ? 21 : 1)], { total: 21 }),
      'GET /api/v1/purchase-orders/1': savedOrder(1),
      'GET /api/v1/purchase-orders/21': savedOrder(21),
    });
    render(<POBarang />);
    await screen.findByText('PO-1');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Centang PO-1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    await screen.findByText('PO-21');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Centang PO-21' }));
    expect(screen.getByText('2 PO dipilih')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Print' }));
    await waitFor(() => expect(print.printPurchaseOrders).toHaveBeenCalledWith([savedOrder(1), savedOrder(21)]));
    await screen.findByText('Dialog cetak dibuka untuk 2 PO: PO-1, PO-21.');
    fireEvent.change(screen.getByRole('textbox', { name: 'Cari PO Barang' }), { target: { value: 'PO-1' } });
    expect((screen.getByRole('button', { name: 'Print' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('reports every load outcome and prints nothing if any selected PO fails to load', async () => {
    const api = installFakeApi({
      'GET /api/v1/purchase-orders': paged([order(1), order(2)]),
      'GET /api/v1/purchase-orders/1': savedOrder(1),
      'GET /api/v1/purchase-orders/2': fail(404, 'PO tidak ditemukan'),
    });
    render(<POBarang />);
    await screen.findByText('PO-1');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Centang semua PO di halaman ini' }));
    fireEvent.click(screen.getByRole('button', { name: 'Print' }));
    const message = (await screen.findByRole('alert')).textContent;
    expect(message).toContain('Berhasil dimuat (1): PO-1');
    expect(message).toContain('Gagal dimuat (1): PO-2: PO tidak ditemukan');
    expect(print.printPurchaseOrders).not.toHaveBeenCalled();
    expect((screen.getByRole('checkbox', { name: 'Centang PO-2' }) as HTMLInputElement).checked).toBe(true);
    expect(api.calls('GET /api/v1/purchase-orders/1')).toHaveLength(1);
    expect(api.calls('GET /api/v1/purchase-orders/2')).toHaveLength(1);
  });

  it('keeps the selection after a print error and retries without creating a PO', async () => {
    print.printPurchaseOrders.mockRejectedValueOnce(new Error('Print gagal'));
    const api = installFakeApi({ 'GET /api/v1/purchase-orders': paged([order(1)]), 'GET /api/v1/purchase-orders/1': savedOrder(1) });
    render(<POBarang />);
    await screen.findByText('PO-1');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Centang PO-1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Print' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Gagal membuka dialog cetak untuk PO-1');
    fireEvent.click(screen.getByRole('button', { name: 'Print' }));
    await screen.findByText('Dialog cetak dibuka untuk 1 PO: PO-1.');
    expect(print.printPurchaseOrders).toHaveBeenCalledTimes(2);
    expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(0);
  });
});
