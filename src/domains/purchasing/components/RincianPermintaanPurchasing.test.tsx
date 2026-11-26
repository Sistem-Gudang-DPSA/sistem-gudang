import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { installFakeApi, paged, fail, type FakeRequest } from '@/test/fake-api';
import { withUser } from '@/test/as-user';
import Detail from './PermintaanPembelian';
import DetailPpic from '@/domains/ppic/components/PermintaanPembelian';
import Pemesanan from './PemesananPembelian';

const nav = vi.hoisted(() => ({ push: vi.fn(), query: '' }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '7' }),
  useRouter: () => ({ push: nav.push }),
  useSearchParams: () => new URLSearchParams(nav.query),
}));

const supplierA = { id: 1, code: 'S1', name: 'PT Kayu', address: 'Jl. A', phone: '081', bank: 'BCA', npwp: '01', pajak: 'PKP' };
const supplierB = { ...supplierA, id: 2, code: 'S2', name: 'PT Besi' };
const items = [
  { itemId: 1, namaBarang: 'Triplex', qty: 10, satuan: 'lbr', proyek: 'Proyek A', noSpk: 'SPK-1', tanggal: '2026-11-23', deadlineTanggal: '2026-11-30', keterangan: 'Segera' },
  { itemId: 2, namaBarang: 'Paku', qty: 2, satuan: 'kg', proyek: 'Proyek A', noSpk: 'SPK-1' },
  { itemId: 3, namaBarang: 'Cat', qty: 3, satuan: 'kaleng', proyek: 'Proyek B', noSpk: 'SPK-2' },
  { itemId: 4, namaBarang: 'Baut', qty: 4, satuan: 'pcs', proyek: 'Proyek A', noSpk: 'SPK-1' },
];
const request = {
  request: { id: 7, type: 'purchase-request', status: 'approved', createdAt: '2026-11-23T00:00:00Z',
    payload: { bagian: 'Gudang', namaPemohon: 'Budi', jabatan: 'Staff', tanggalPengajuan: '2026-11-23', items } },
  actions: [{ id: 9, cycle: 1, action: 'approved', actorName: 'Admin', createdAt: '2026-11-23T00:00:00Z' }],
};
const permissions = ['purchase-order.create', 'purchase-order.view', 'item.view', 'item.set-price', 'supplier.view'];
const emptyMapping = { approvalRequestId: 7, status: 'NOT_STARTED', lines: [] };

function setup(extra: Record<string, unknown> = {}, perms = permissions) {
  const master = Object.fromEntries(items.map((line, index) => [`GET /api/v1/items/${line.itemId}`, { id: line.itemId, name: line.namaBarang, code: `BRG-${line.itemId}`, unit: line.satuan, stock: index + 20, price: (index + 1) * 1000 }]));
  const api = installFakeApi({
    'GET /api/v1/approvals/7': request,
    'GET /api/v1/approvals/7/mapping': emptyMapping,
    'GET /api/v1/purchase-orders': paged([]),
    'PUT /api/v1/approvals/7/mapping': (req: FakeRequest) => ({ ...emptyMapping, lines: req.body }),
    'GET /api/v1/suppliers': paged([supplierA, supplierB]),
    'GET /api/v1/suppliers/1': supplierA,
    'GET /api/v1/suppliers/2': supplierB,
    'PUT /api/v1/items/1': (req: FakeRequest) => ({ id: 1, name: 'Triplex', code: 'BRG-1', unit: 'lbr', stock: 20, price: (req.body as { price: number }).price }),
    'POST /api/v1/purchase-orders': (req: FakeRequest) => ({ id: 20, nomorPo: 'PO/20', supplierName: 'PT Kayu', grandTotal: 9990, ...req.body as object }),
    ...master, ...extra,
  });
  const view = render(withUser(<Detail />, perms));
  return { api, view };
}
async function ready() {
  await screen.findByLabelText('Qty Dibeli baris 1 supplier 1');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Generate PO' }).hasAttribute('disabled')).toBe(false));
}
async function readyGenerate() {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Generate PO' }).hasAttribute('disabled')).toBe(false));
}
async function pick(line: number, row = 1, name = 'S1 - PT Kayu') {
  fireEvent.click(await screen.findByLabelText(`Supplier baris ${line} supplier ${row}`));
  fireEvent.click(await screen.findByRole('option', { name }));
}
async function completeSuppliers() {
  await pick(1);
  await pick(2, 1, 'S2 - PT Besi');
  await pick(3);
  await pick(4);
}
afterEach(() => { nav.query = ''; nav.push.mockClear(); sessionStorage.clear(); });

describe('rincian permintaan Purchasing', () => {
  it('menampilkan kolom baru, stok, harga terakhir, harga saat ini, dan qty awal', async () => {
    setup();
    await ready();
    const headers = screen.getAllByRole('columnheader').slice(0, 12).map((el) => el.textContent);
    expect(headers).toEqual(['No', 'Nama Barang', 'Satuan', 'No SPK', 'Stok Saat Ini', 'Supplier', 'Harga Terakhir', 'Harga Saat Ini', 'Qty Permintaan', 'Qty Dibeli', 'Keterangan', 'Tanggal Datang']);
    expect(within(screen.getByText('Triplex').closest('tr')!).getByText('SPK-1')).toBeTruthy();
    expect(await screen.findByLabelText('Qty Dibeli baris 1 supplier 1')).toHaveProperty('value', '10');
    expect(await screen.findByLabelText('Harga Saat Ini baris 1 supplier 1')).toHaveProperty('value', '1000');
    expect((await screen.findByText('20')).textContent).toBe('20');
    expect(screen.getByText('Segera')).toBeTruthy();
    expect(screen.getByLabelText('Kembali').getAttribute('href')).toBe('/dashboard/purchasing/laporan/rekap-pembelian');
    expect(screen.queryByText('Riwayat Persetujuan')).toBeNull();
  });

  it('mempertahankan riwayat persetujuan dan tabel asli pada detail PPIC', async () => {
    installFakeApi({ 'GET /api/v1/approvals/7': request });
    render(withUser(<DetailPpic />, ['purchase-request.create']));
    expect(await screen.findByText('Riwayat Persetujuan')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Detail Barang' })).toBeTruthy();
    expect(screen.queryByLabelText('Qty Dibeli baris 1 supplier 1')).toBeNull();
  });

  it('hanya menggunakan kecocokan master yang unik untuk permintaan lama tanpa itemId', async () => {
    const legacy = { ...request, request: { ...request.request, payload: { ...request.request.payload, items: items.slice(0, 2).map((line) => ({ ...line, itemId: undefined })) } } };
    const { api } = setup({
      'GET /api/v1/approvals/7': legacy,
      'GET /api/v1/items': (req: FakeRequest) => req.query.get('search') === 'Triplex'
        ? paged([{ id: 10, name: 'triplex', unit: 'LBR', code: 'TRP', stock: 123, price: 500 }])
        : paged([{ id: 11, name: 'Paku', unit: 'kg', stock: 9 }, { id: 12, name: 'Paku', unit: 'kg', stock: 99 }]),
    });
    await ready();
    expect(screen.getByText('123')).toBeTruthy();
    expect(within(screen.getByText('Paku').closest('tr')!).getByText('Tidak tersedia')).toBeTruthy();
    expect(api.calls('GET /api/v1/items')).toHaveLength(2);
  });

  it('memecah satu baris ke beberapa supplier, menjaga rowSpan, dan menampilkan sisa/lebih', async () => {
    const { api } = setup();
    await ready();
    await pick(1);
    fireEvent.click(screen.getByLabelText('Tambah supplier baris 1'));
    await pick(1, 2, 'S2 - PT Besi');
    fireEvent.change(screen.getByLabelText('Qty Dibeli baris 1 supplier 2'), { target: { value: '4' } });
    const nama = screen.getByText('Triplex').closest('td')!;
    expect(nama.getAttribute('rowspan')).toBe('2');
    expect(screen.getByText('Lebih: 4')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Qty Dibeli baris 1 supplier 2'), { target: { value: '' } });
    expect(within(nama.closest('tr')!).getByText('Pas')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Qty Dibeli baris 1 supplier 2'), { target: { value: '4' } });
    await pick(2, 1, 'S2 - PT Besi'); await pick(3); await pick(4);
    fireEvent.click(screen.getByRole('button', { name: 'Generate PO' }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledTimes(1));
    expect(api.calls('PUT /api/v1/approvals/7/mapping')[0].body).toEqual({
      lines: [{ lineIndex: 0, suppliers: [{ supplierId: 1, qty: 10 }, { supplierId: 2, qty: 4 }] }, { lineIndex: 1, suppliers: [{ supplierId: 2, qty: 2 }] }, { lineIndex: 2, suppliers: [{ supplierId: 1, qty: 3 }] }, { lineIndex: 3, suppliers: [{ supplierId: 1, qty: 4 }] }],
    });
  });

  it('mengirim draf berisi harga dan membuka form PO yang sudah terisi', async () => {
    const { api, view } = setup();
    await ready();
    await completeSuppliers();
    fireEvent.change(screen.getByLabelText('Harga Saat Ini baris 1 supplier 1'), { target: { value: '1500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate PO' }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledTimes(1));
    const target = new URL(nav.push.mock.calls[0][0], 'http://localhost');
    expect(target.pathname).toBe('/dashboard/purchasing/transaksi/buat-po-barang/buat-po/7');
    const token = target.searchParams.get('draft')!;
    const saved = JSON.parse(sessionStorage.getItem(`po-preparation:${token}`)!);
    expect(saved.lines.find((line: { lineIndex: number }) => line.lineIndex === 0)).toMatchObject({ qtyBeli: 10, harga: 1500, hargaTerbaru: 1000, kodeBarang: 'BRG-1', noSpk: 'SPK-1' });
    nav.query = target.search;
    view.unmount();
    render(withUser(<Pemesanan />, permissions));
    const form = within(await screen.findByRole('form', { name: 'PO Proyek A — PT Kayu' }));
    expect(form.getByLabelText('Harga satuan Triplex')).toHaveProperty('value', '1500');
    expect(form.getByText('Harga terbaru: 1.000')).toBeTruthy();
    fireEvent.change(form.getByLabelText('PIC / Telp'), { target: { value: 'Andi' } });
    const simpan = form.getByRole('button', { name: 'Simpan Draft' }) as HTMLButtonElement;
    await waitFor(() => expect(simpan.disabled).toBe(false));
    fireEvent.click(simpan);
    await screen.findByText('PO PO/20 berhasil disimpan sebagai DRAFT');
    expect(api.calls('PUT /api/v1/approvals/7/mapping')).toHaveLength(1);
    expect(api.calls('PUT /api/v1/items/1')).toHaveLength(0);
  });

  it('menyelesaikan tahap Purchasing sekali lalu membuka form PO tanpa menyimpan ulang mapping', async () => {
    let current = { ...request, request: { ...request.request, status: 'pending', currentStepOrder: 3 } };
    const { api, view } = setup({
      'GET /api/v1/approvals/7': () => current,
      'POST /api/v1/approvals/7/approve': () => { current = { ...current, request: { ...current.request, status: 'approved' } }; return null; },
    }, [...permissions, 'purchase-request.approve']);
    await ready();
    await completeSuppliers();
    fireEvent.change(screen.getByLabelText('Qty Dibeli baris 1 supplier 1'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate PO' }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledTimes(1));
    nav.query = new URL(nav.push.mock.calls[0][0], 'http://localhost').search;
    view.unmount();
    render(withUser(<Pemesanan />, permissions));
    const first = within(await screen.findByRole('form', { name: 'PO Proyek A — PT Kayu' }));
    expect(first.getByText('7')).toBeTruthy();
    fireEvent.change(first.getByLabelText('PIC / Telp'), { target: { value: 'Andi' } });
    const simpan = first.getByRole('button', { name: 'Simpan Draft' }) as HTMLButtonElement;
    await waitFor(() => expect(simpan.disabled).toBe(false));
    fireEvent.click(simpan);
    await screen.findByText('PO PO/20 berhasil disimpan sebagai DRAFT');
    expect(api.calls('POST /api/v1/approvals/7/approve')).toHaveLength(1);
    expect(api.calls('PUT /api/v1/approvals/7/mapping')).toHaveLength(1);
    expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(1);
    const calls = api.all().map((req) => `${req.method} ${req.path}`);
    expect(calls.indexOf('POST /api/v1/approvals/7/approve')).toBeLessThan(calls.indexOf('PUT /api/v1/approvals/7/mapping'));
    expect(calls.indexOf('PUT /api/v1/approvals/7/mapping')).toBeLessThan(calls.indexOf('POST /api/v1/purchase-orders'));
  });

  it('belum membuka input Purchasing selama permintaan masih menunggu PPIC', async () => {
    setup({ 'GET /api/v1/approvals/7': { ...request, request: { ...request.request, status: 'pending', currentStepOrder: 2 } } });
    await screen.findByText('Rincian Daftar Barang');
    expect(screen.queryByLabelText('Qty Dibeli baris 1 supplier 1')).toBeNull();
    expect(screen.queryByLabelText('Supplier baris 1 supplier 1')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Generate PO' })).toBeNull();
  });

  it('mewajibkan supplier, qty, dan harga valid sesuai batas API', async () => {
    setup();
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Generate PO' }));
    expect(screen.getByText('Pilih supplier untuk baris 1 supplier 1.')).toBeTruthy();
    await completeSuppliers();
    for (const qty of ['', '0', '1000001']) {
      fireEvent.change(screen.getByLabelText('Qty Dibeli baris 1 supplier 1'), { target: { value: qty } });
      fireEvent.click(screen.getByRole('button', { name: 'Generate PO' }));
      expect(screen.getByText('Qty Dibeli baris 1 supplier 1 harus bilangan bulat antara 1 dan 1.000.000.')).toBeTruthy();
    }
    fireEvent.change(screen.getByLabelText('Qty Dibeli baris 1 supplier 1'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate PO' }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledTimes(1));
  });

  it('menolak supplier yang sama dua kali pada satu baris', async () => {
    setup();
    await ready();
    fireEvent.click(screen.getByLabelText('Tambah supplier baris 1'));
    await pick(1, 1);
    await pick(1, 2);
    fireEvent.click(screen.getByRole('button', { name: 'Generate PO' }));
    expect(screen.getByText('Supplier PT Kayu dipilih dua kali pada baris 1.')).toBeTruthy();
  });

  it('tidak membuka form PO jika penyimpanan pemetaan supplier gagal', async () => {
    const { api } = setup({ 'PUT /api/v1/approvals/7/mapping': fail(409, 'Pemetaan supplier sudah berubah') });
    await ready();
    await completeSuppliers();
    fireEvent.click(screen.getByRole('button', { name: 'Generate PO' }));
    await screen.findByText('Pemetaan supplier sudah berubah');
    expect(nav.push).not.toHaveBeenCalled();
    expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(0);
  });

  it('tidak menampilkan input atau tombol Generate PO tanpa permission create', async () => {
    setup({}, ['purchase-order.view']);
    await screen.findByText('Rincian Daftar Barang');
    expect(screen.queryByLabelText('Qty Dibeli baris 1 supplier 1')).toBeNull();
    expect(screen.queryByLabelText('Supplier baris 1 supplier 1')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Generate PO' })).toBeNull();
  });

  it('menandai stok yang gagal dimuat dan tidak menganggapnya nol', async () => {
    setup({ 'GET /api/v1/items/1': fail(500, 'Gagal membaca stok') });
    await ready();
    const row = screen.getByText('Triplex').closest('tr')!;
    expect(within(row).getByText('Tidak tersedia')).toBeTruthy();
  });

  it('mengunci Generate ketika daftar PO aktif gagal dimuat', async () => {
    setup({ 'GET /api/v1/purchase-orders': fail(500, 'Daftar PO gagal') });
    await screen.findAllByText('Daftar PO gagal');
    expect(screen.getByRole('button', { name: 'Generate PO' }).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByLabelText('Qty Dibeli baris 1 supplier 1')).toBeNull();
  });

  it('tidak mengirim ulang baris yang sudah masuk PO aktif', async () => {
    const po = { id: 11, nomorPo: 'PO/11', status: 'ISSUED', tanggalPo: '2026-11-23', supplierName: 'PT Kayu', grandTotal: 1000, barang: [{ lineIndex: 0 }] };
    setup({ 'GET /api/v1/purchase-orders': paged([po]), 'GET /api/v1/purchase-orders/11': po });
    await screen.findByLabelText('Qty Dibeli baris 2 supplier 1');
    expect(screen.queryByLabelText('Qty Dibeli baris 1 supplier 1')).toBeNull();
    expect(screen.getByText('Sudah dipesan')).toBeTruthy();
    await pick(2); await pick(3); await pick(4);
    fireEvent.click(screen.getByRole('button', { name: 'Generate PO' }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledTimes(1));
    const token = new URL(nav.push.mock.calls[0][0], 'http://localhost').searchParams.get('draft');
    const saved = JSON.parse(sessionStorage.getItem(`po-preparation:${token}`)!);
    expect(saved.lines.map((line: { lineIndex: number }) => line.lineIndex)).toEqual([1, 2, 3]);
  });

  it('memuat ulang mapping supplier sebagai nilai awal', async () => {
    setup({ 'GET /api/v1/approvals/7/mapping': { approvalRequestId: 7, status: 'PARTIAL', lines: [{ lineIndex: 0, namaBarang: 'Triplex', qty: 10, satuan: 'lbr', proyek: 'Proyek A', noSpk: '', mappedQty: 6, remainingQty: 4, mappings: [{ supplierId: 2, supplierName: 'PT Besi', qty: 6, purchaseOrderId: null, nomorPo: null }] }] } });
    await ready();
    expect(screen.getByLabelText('Supplier baris 1 supplier 1').textContent).toContain('S2 - PT Besi');
    expect(screen.getByLabelText('Qty Dibeli baris 1 supplier 1')).toHaveProperty('value', '6');
  });

  it('hanya mengunci baris supplier yang sudah punya PO pada baris permintaan yang dipecah', async () => {
    const { api } = setup({
      'GET /api/v1/approvals/7/mapping': {
        approvalRequestId: 7, status: 'PARTIAL', lines: [{
          lineIndex: 0, namaBarang: 'Triplex', qty: 10, satuan: 'lbr', proyek: 'Proyek A', noSpk: '', mappedQty: 14, remainingQty: 0,
          mappings: [
            { supplierId: 1, supplierName: 'PT Kayu', qty: 10, purchaseOrderId: 11, nomorPo: 'PO/11' },
            { supplierId: 2, supplierName: 'PT Besi', qty: 4, purchaseOrderId: null, nomorPo: null },
          ],
        }],
      },
    });
    await readyGenerate();
    expect(screen.queryByLabelText('Qty Dibeli baris 1 supplier 1')).toBeNull();
    expect(screen.getByLabelText('Qty Dibeli baris 1 supplier 2')).toHaveProperty('value', '4');
    await pick(2); await pick(3); await pick(4);
    fireEvent.click(screen.getByRole('button', { name: 'Generate PO' }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledTimes(1));
    expect(api.calls('PUT /api/v1/approvals/7/mapping')[0].body).toEqual({
      lines: [{ lineIndex: 0, suppliers: [{ supplierId: 1, qty: 10 }, { supplierId: 2, qty: 4 }] }, { lineIndex: 1, suppliers: [{ supplierId: 1, qty: 2 }] }, { lineIndex: 2, suppliers: [{ supplierId: 1, qty: 3 }] }, { lineIndex: 3, suppliers: [{ supplierId: 1, qty: 4 }] }],
    });
    const token = new URL(nav.push.mock.calls[0][0], 'http://localhost').searchParams.get('draft');
    const saved = JSON.parse(sessionStorage.getItem(`po-preparation:${token}`)!);
    expect(saved.lines.filter((line: { lineIndex: number }) => line.lineIndex === 0)).toHaveLength(1);
    expect(saved.lines.find((line: { lineIndex: number }) => line.lineIndex === 0).supplier.id).toBe(2);
  });

  it('menampilkan error untuk draft yang hilang alih-alih memakai Qty permintaan asli', async () => {
    nav.query = 'draft=tidak-ada';
    installFakeApi({ 'GET /api/v1/approvals/7': request, 'GET /api/v1/purchase-orders': paged([]) });
    render(withUser(<Pemesanan />, permissions));
    await screen.findByText(/Data persiapan PO tidak tersedia/);
    expect(screen.queryByRole('form')).toBeNull();
  });
});
