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
  { itemId: 1, namaBarang: 'Triplex', qty: 10, satuan: 'lbr', proyek: 'Proyek A', tanggal: '2026-11-23', deadlineTanggal: '2026-11-30', keterangan: 'Segera' },
  { itemId: 2, namaBarang: 'Paku', qty: 2, satuan: 'kg', proyek: 'Proyek A' },
  { itemId: 3, namaBarang: 'Cat', qty: 3, satuan: 'kaleng', proyek: 'Proyek B' },
  { itemId: 4, namaBarang: 'Baut', qty: 4, satuan: 'pcs', proyek: 'Proyek A' },
];
const request = {
  request: { id: 7, type: 'purchase-request', status: 'approved', createdAt: '2026-11-23T00:00:00Z',
    payload: { bagian: 'Gudang', namaPemohon: 'Budi', jabatan: 'Staff', tanggalPengajuan: '2026-11-23', items } },
  actions: [{ id: 9, cycle: 1, action: 'approved', actorName: 'Admin', createdAt: '2026-11-23T00:00:00Z' }],
};
const permissions = ['purchase-order.create', 'purchase-order.view', 'item.view', 'supplier.view'];

function setup(extra: Record<string, unknown> = {}, perms = permissions) {
  const master = Object.fromEntries(items.map((line, index) => [`GET /api/v1/items/${line.itemId}`, { id: line.itemId, name: line.namaBarang, code: `BRG-${line.itemId}`, unit: line.satuan, stock: index + 20 }]));
  const api = installFakeApi({
    'GET /api/v1/approvals/7': request,
    'GET /api/v1/purchase-orders': paged([]),
    'PUT /api/v1/approvals/7/mapping': {},
    'GET /api/v1/suppliers': paged([supplierA, supplierB]),
    'POST /api/v1/purchase-orders': (req: FakeRequest) => ({ id: 20, nomorPo: 'PO/20', supplierName: 'PT Kayu', grandTotal: 9990, ...req.body as object }),
    ...master, ...extra,
  });
  const view = render(withUser(<Detail />, perms));
  return { api, view };
}
async function ready() {
  await screen.findByLabelText('Qty Beli baris 1');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Buat PO' }).hasAttribute('disabled')).toBe(false));
}
async function pick(index: number, name = 'S1 - PT Kayu') {
  fireEvent.click(await screen.findByLabelText(`Supplier baris ${index}`));
  fireEvent.click(await screen.findByRole('option', { name }));
}
async function completeSuppliers() {
  await pick(1);
  await pick(2, 'S2 - PT Besi');
  await pick(3);
  await pick(4);
}
afterEach(() => { nav.query = ''; nav.push.mockClear(); sessionStorage.clear(); });

describe('rincian permintaan Purchasing', () => {
  it('menampilkan kolom sesuai rincian, stok terkini, Qty Beli awal, dan menyembunyikan riwayat hanya di Purchasing', async () => {
    setup();
    await ready();
    const headers = screen.getAllByRole('columnheader').slice(0, 11).map((el) => el.textContent);
    expect(headers).toEqual(['No', 'Tanggal', 'Supplier', 'Nama Barang', 'Stok Saat Ini', 'QTY', 'Qty Beli', 'SAT', 'Proyek', 'Keterangan', 'Dikirim Tanggal']);
    expect(screen.getByLabelText('Qty Beli baris 1')).toHaveProperty('value', '10');
    expect(screen.getByLabelText('Qty Beli baris 2')).toHaveProperty('value', '2');
    expect(await screen.findByText('20')).toBeTruthy();
    expect(screen.getByText('Segera')).toBeTruthy();
    expect(screen.getByLabelText('Kembali').getAttribute('href')).toBe('/dashboard/purchasing/laporan/rekap-pembelian');
    expect(screen.queryByText('Riwayat Persetujuan')).toBeNull();
  });

  it('mempertahankan riwayat persetujuan dan tabel asli pada detail PPIC', async () => {
    installFakeApi({ 'GET /api/v1/approvals/7': request });
    render(withUser(<DetailPpic />, ['purchase-request.create']));
    expect(await screen.findByText('Riwayat Persetujuan')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Detail Barang' })).toBeTruthy();
    expect(screen.queryByLabelText('Qty Beli baris 1')).toBeNull();
  });

  it('hanya menggunakan kecocokan master yang unik untuk permintaan lama tanpa itemId', async () => {
    const legacy = { ...request, request: { ...request.request, payload: { ...request.request.payload, items: items.slice(0, 2).map((line) => ({ ...line, itemId: undefined })) } } };
    const { api } = setup({
      'GET /api/v1/approvals/7': legacy,
      'GET /api/v1/items': (req: FakeRequest) => req.query.get('search') === 'Triplex'
        ? paged([{ id: 10, name: 'triplex', unit: 'LBR', code: 'TRP', stock: 123 }])
        : paged([{ id: 11, name: 'Paku', unit: 'kg', stock: 9 }, { id: 12, name: 'Paku', unit: 'kg', stock: 99 }]),
    });
    await ready();
    expect(screen.getByText('123')).toBeTruthy();
    expect(within(screen.getByText('Paku').closest('tr')!).getByText('Tidak tersedia')).toBeTruthy();
    expect(api.calls('GET /api/v1/items')).toHaveLength(2);
  });

  it('langsung membuka form PO setelah persetujuan PPIC dan menyelesaikan tahap backend sekali saat menyimpan beberapa PO', async () => {
    let current = { ...request, request: { ...request.request, status: 'pending', currentStepOrder: 3 } };
    const { api, view } = setup({
      'GET /api/v1/approvals/7': () => current,
      'POST /api/v1/approvals/7/approve': () => { current = { ...current, request: { ...current.request, status: 'approved' } }; return null; },
    }, [...permissions, 'purchase-request.approve']);
    await ready();
    await completeSuppliers();
    fireEvent.change(screen.getByLabelText('Qty Beli baris 1'), { target: { value: '7' } });
    for (const name of ['Setuju', 'Tolak', 'Revisi']) expect(screen.queryByRole('button', { name })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Buat PO' }));
    expect(api.calls('POST /api/v1/approvals/7/approve')).toHaveLength(0);
    nav.query = new URL(nav.push.mock.calls[0][0], 'http://localhost').search;
    view.unmount();
    render(withUser(<Pemesanan />, [...permissions, 'purchase-request.approve']));
    const first = within(await screen.findByRole('form', { name: 'PO Proyek A — PT Kayu' }));
    expect(first.getByText('7')).toBeTruthy();
    fireEvent.change(first.getByLabelText('Tanggal PO'), { target: { value: '2026-11-24' } });
    fireEvent.change(first.getByLabelText('PIC / Telp'), { target: { value: 'Andi' } });
    fireEvent.change(first.getByLabelText('Harga satuan Triplex'), { target: { value: '1000' } });
    fireEvent.change(first.getByLabelText('Harga satuan Baut'), { target: { value: '500' } });
    await waitFor(() => expect(first.getByRole('button', { name: 'Buat' }).hasAttribute('disabled')).toBe(false));
    fireEvent.click(first.getByRole('button', { name: 'Buat' }));
    await screen.findByText('PO PO/20 berhasil dibuat');
    expect(api.calls('POST /api/v1/approvals/7/approve')).toHaveLength(1);
    expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(1);
    const calls = api.all().map((req) => `${req.method} ${req.path}`);
    expect(calls.indexOf('POST /api/v1/approvals/7/approve')).toBeLessThan(calls.indexOf('PUT /api/v1/approvals/7/mapping'));
    expect(calls.indexOf('PUT /api/v1/approvals/7/mapping')).toBeLessThan(calls.indexOf('POST /api/v1/purchase-orders'));
    const second = within(screen.getByRole('form', { name: 'PO Proyek A — PT Besi' }));
    fireEvent.change(second.getByLabelText('Tanggal PO'), { target: { value: '2026-11-24' } });
    fireEvent.change(second.getByLabelText('PIC / Telp'), { target: { value: 'Budi' } });
    fireEvent.change(second.getByLabelText('Harga satuan Paku'), { target: { value: '500' } });
    fireEvent.click(second.getByRole('button', { name: 'Buat' }));
    await waitFor(() => expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(2));
    expect(api.calls('POST /api/v1/approvals/7/approve')).toHaveLength(1);
  });

  it.each(['tanpa permission', 'backend gagal', 'tahap belum selesai'])('tidak menyimpan pemetaan atau PO jika penyelesaian tahap backend terhalang: %s', async (reason) => {
    const pending = { ...request, request: { ...request.request, status: 'pending', currentStepOrder: 3 } };
    const { api, view } = setup({
      'GET /api/v1/approvals/7': pending,
      'POST /api/v1/approvals/7/approve': reason === 'backend gagal' ? fail(500, 'Gagal menyelesaikan tahap Purchasing') : {},
    });
    await ready();
    await completeSuppliers();
    fireEvent.click(screen.getByRole('button', { name: 'Buat PO' }));
    nav.query = new URL(nav.push.mock.calls[0][0], 'http://localhost').search;
    view.unmount();
    render(withUser(<Pemesanan />, reason === 'tanpa permission' ? permissions : [...permissions, 'purchase-request.approve']));
    const form = within(await screen.findByRole('form', { name: 'PO Proyek A — PT Kayu' }));
    fireEvent.change(form.getByLabelText('Tanggal PO'), { target: { value: '2026-11-24' } });
    fireEvent.change(form.getByLabelText('PIC / Telp'), { target: { value: 'Andi' } });
    fireEvent.change(form.getByLabelText('Harga satuan Triplex'), { target: { value: '1000' } });
    fireEvent.change(form.getByLabelText('Harga satuan Baut'), { target: { value: '500' } });
    await waitFor(() => expect(form.getByRole('button', { name: 'Buat' }).hasAttribute('disabled')).toBe(false));
    fireEvent.click(form.getByRole('button', { name: 'Buat' }));
    const message = reason === 'tanpa permission' ? /Akun ini belum memiliki izin menyelesaikan proses/ : reason === 'backend gagal' ? /Gagal menyelesaikan tahap Purchasing/ : /Status permintaan belum siap/;
    await screen.findByText(message);
    expect(api.calls('PUT /api/v1/approvals/7/mapping')).toHaveLength(0);
    expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(0);
    expect(form.getByLabelText('Harga satuan Triplex')).toHaveProperty('value', '1000');
    if (reason === 'tanpa permission') expect(api.calls('POST /api/v1/approvals/7/approve')).toHaveLength(0);
  });

  it('belum membuka input Purchasing selama permintaan masih menunggu PPIC', async () => {
    setup({ 'GET /api/v1/approvals/7': { ...request, request: { ...request.request, status: 'pending', currentStepOrder: 2 } } });
    await screen.findByText('Rincian Daftar Barang');
    expect(screen.queryByLabelText('Qty Beli baris 1')).toBeNull();
    expect(screen.queryByLabelText('Supplier baris 1')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Buat PO' })).toBeNull();
  });

  it('mewajibkan supplier tiap baris dan Qty Beli positif sesuai batas API', async () => {
    const { api } = setup();
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Buat PO' }));
    expect(screen.getByText('Pilih supplier untuk baris 1.')).toBeTruthy();
    await completeSuppliers();
    for (const qty of ['', '0', '1000001']) {
      fireEvent.change(screen.getByLabelText('Qty Beli baris 1'), { target: { value: qty } });
      fireEvent.click(screen.getByRole('button', { name: 'Buat PO' }));
      expect(screen.getByText('Qty Beli baris 1 harus bilangan bulat antara 1 dan 1.000.000.')).toBeTruthy();
    }
    expect(nav.push).not.toHaveBeenCalled();
    expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(0);
  });

  it('mengelompokkan PO dan mengirim Qty Beli yang melebihi QTY permintaan tanpa mengubah QTY asli', async () => {
    const { api, view } = setup();
    await ready();
    await completeSuppliers();
    fireEvent.change(screen.getByLabelText('Qty Beli baris 1'), { target: { value: '20' } });
    expect(within(screen.getByText('Triplex').closest('tr')!).getByText('10')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Buat PO' }));
    expect(nav.push).toHaveBeenCalledTimes(1);
    expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(0);
    const target = new URL(nav.push.mock.calls[0][0], 'http://localhost');
    expect(target.pathname).toBe('/dashboard/purchasing/transaksi/buat-po-barang/buat-po/7');
    nav.query = target.search;
    view.unmount();
    render(withUser(<Pemesanan />, permissions));
    const first = await screen.findByRole('form', { name: 'PO Proyek A — PT Kayu' });
    expect(screen.getAllByRole('form')).toHaveLength(3);
    expect(screen.getByRole('form', { name: 'PO Proyek A — PT Besi' })).toBeTruthy();
    expect(screen.getByRole('form', { name: 'PO Proyek B — PT Kayu' })).toBeTruthy();
    const form = within(first);
    expect(form.getByLabelText('Data Supplier').hasAttribute('disabled')).toBe(true);
    expect(form.getByLabelText('Kode barang Triplex')).toHaveProperty('value', 'BRG-1');
    expect(form.getByLabelText('Kode barang Baut')).toHaveProperty('value', 'BRG-4');
    expect(form.queryByLabelText('Kode barang Paku')).toBeNull();
    expect(form.queryByLabelText('Kode barang Cat')).toBeNull();
    expect(form.getByText('20')).toBeTruthy();
    fireEvent.change(form.getByLabelText('Tanggal PO'), { target: { value: '2026-11-24' } });
    fireEvent.change(form.getByLabelText('PIC / Telp'), { target: { value: 'Andi' } });
    fireEvent.change(form.getByLabelText('Harga satuan Triplex'), { target: { value: '1000' } });
    fireEvent.change(form.getByLabelText('Harga satuan Baut'), { target: { value: '500' } });
    expect(form.getByLabelText('Total harga setelah diskon')).toHaveProperty('value', '22.000');
    await waitFor(() => expect(form.getByRole('button', { name: 'Buat' }).hasAttribute('disabled')).toBe(false));
    fireEvent.click(form.getByRole('button', { name: 'Buat' }));
    await screen.findByText('PO PO/20 berhasil dibuat');
    expect(api.calls('PUT /api/v1/approvals/7/mapping')[0].body).toEqual({ lines: [{ lineIndex: 0, suppliers: [{ supplierId: 1, qty: 20 }] }, { lineIndex: 3, suppliers: [{ supplierId: 1, qty: 4 }] }] });
    expect(api.calls('POST /api/v1/purchase-orders')[0].body).toMatchObject({
      approvalRequestId: 7, supplierId: 1, kebutuhanProyek: 'Proyek A', tanggalPo: '2026-11-24', picSupplier: 'Andi',
      barang: [
        { lineIndex: 0, namaBarang: 'Triplex', kodeBarang: 'BRG-1', jumlah: 20, hargaSatuan: 1000 },
        { lineIndex: 3, namaBarang: 'Baut', kodeBarang: 'BRG-4', jumlah: 4, hargaSatuan: 500 },
      ],
    });
    const second = within(screen.getByRole('form', { name: 'PO Proyek A — PT Besi' }));
    fireEvent.change(second.getByLabelText('Tanggal PO'), { target: { value: '2026-11-24' } });
    fireEvent.change(second.getByLabelText('PIC / Telp'), { target: { value: 'Budi' } });
    fireEvent.change(second.getByLabelText('Harga satuan Paku'), { target: { value: '2000' } });
    fireEvent.click(second.getByRole('button', { name: 'Buat' }));
    await waitFor(() => expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(2));
    expect(api.calls('POST /api/v1/purchase-orders')[1].body).toMatchObject({ supplierId: 2, kebutuhanProyek: 'Proyek A', barang: [{ lineIndex: 1, namaBarang: 'Paku', jumlah: 2 }] });
  });

  it('tidak membuat PO jika penyimpanan pemetaan supplier gagal', async () => {
    const { api, view } = setup({ 'PUT /api/v1/approvals/7/mapping': fail(409, 'Pemetaan supplier sudah berubah') });
    await ready();
    await completeSuppliers();
    fireEvent.click(screen.getByRole('button', { name: 'Buat PO' }));
    nav.query = new URL(nav.push.mock.calls[0][0], 'http://localhost').search;
    view.unmount();
    render(withUser(<Pemesanan />, permissions));
    const form = within(await screen.findByRole('form', { name: 'PO Proyek A — PT Kayu' }));
    fireEvent.change(form.getByLabelText('Tanggal PO'), { target: { value: '2026-11-24' } });
    fireEvent.change(form.getByLabelText('PIC / Telp'), { target: { value: 'Andi' } });
    fireEvent.change(form.getByLabelText('Harga satuan Triplex'), { target: { value: '1000' } });
    fireEvent.change(form.getByLabelText('Harga satuan Baut'), { target: { value: '500' } });
    await waitFor(() => expect(form.getByRole('button', { name: 'Buat' }).hasAttribute('disabled')).toBe(false));
    fireEvent.click(form.getByRole('button', { name: 'Buat' }));
    await screen.findByText('Pemetaan supplier sudah berubah');
    expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(0);
    expect(form.getByLabelText('Harga satuan Triplex')).toHaveProperty('value', '1000');
  });

  it('tidak menampilkan input atau tombol Buat PO tanpa permission create', async () => {
    setup({}, ['purchase-order.view']);
    await screen.findByText('Rincian Daftar Barang');
    expect(screen.queryByLabelText('Qty Beli baris 1')).toBeNull();
    expect(screen.queryByLabelText('Supplier baris 1')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Buat PO' })).toBeNull();
  });

  it('menandai stok yang gagal dimuat dan tidak menganggapnya nol', async () => {
    setup({ 'GET /api/v1/items/1': fail(500, 'Gagal membaca stok') });
    await ready();
    const row = screen.getByText('Triplex').closest('tr')!;
    expect(within(row).getByText('Tidak tersedia')).toBeTruthy();
  });

  it('mengunci persiapan ketika daftar PO aktif gagal dimuat', async () => {
    setup({ 'GET /api/v1/purchase-orders': fail(500, 'Daftar PO gagal') });
    await screen.findAllByText('Daftar PO gagal');
    expect(screen.getByRole('button', { name: 'Buat PO' }).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByLabelText('Qty Beli baris 1')).toBeNull();
  });

  it('tidak mengirim ulang baris yang sudah masuk PO aktif', async () => {
    const po = { id: 11, nomorPo: 'PO/11', status: 'ISSUED', tanggalPo: '2026-11-23', supplierName: 'PT Kayu', grandTotal: 1000, barang: [{ lineIndex: 0 }] };
    setup({ 'GET /api/v1/purchase-orders': paged([po]), 'GET /api/v1/purchase-orders/11': po });
    await screen.findByLabelText('Qty Beli baris 2');
    expect(screen.queryByLabelText('Qty Beli baris 1')).toBeNull();
    expect(screen.getByText('Sudah dipesan')).toBeTruthy();
    await pick(2); await pick(3); await pick(4);
    fireEvent.click(screen.getByRole('button', { name: 'Buat PO' }));
    const token = new URL(nav.push.mock.calls[0][0], 'http://localhost').searchParams.get('draft');
    const saved = JSON.parse(sessionStorage.getItem(`po-preparation:${token}`)!);
    expect(saved.lines.map((line: { lineIndex: number }) => line.lineIndex)).toEqual([1, 2, 3]);
  });

  it('menampilkan error untuk draft yang hilang alih-alih memakai Qty permintaan asli', async () => {
    nav.query = 'draft=tidak-ada';
    installFakeApi({ 'GET /api/v1/approvals/7': request, 'GET /api/v1/purchase-orders': paged([]) });
    render(withUser(<Pemesanan />, permissions));
    await screen.findByText(/Data persiapan PO tidak tersedia/);
    expect(screen.queryByRole('form')).toBeNull();
  });
});
