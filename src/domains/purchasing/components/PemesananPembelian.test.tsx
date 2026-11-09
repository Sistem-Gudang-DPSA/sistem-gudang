import { describe, it, expect, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import PemesananPembelian from './PemesananPembelian';
import { AuthUserProvider } from '@/domains/auth/user-context';

vi.setConfig({ testTimeout: 20000 });

vi.mock('next/navigation', () => ({ useParams: () => ({ id: '7' }), useRouter: () => ({ push: vi.fn() }), usePathname: () => '/' }));

const request = (status: string) => ({
  request: {
    id: 7, type: 'purchase-request', requestedBy: 1, requestedByDomainId: 1, currentStepOrder: 1, cycle: 1, status, createdAt: '2026-03-01T00:00:00Z',
    payload: {
      bagian: 'Produksi', namaPemohon: 'Budi', jabatan: 'Staff', tanggalPengajuan: '2026-03-05',
      items: [
        { namaBarang: 'Triplex', qty: 10, satuan: 'lbr', proyek: 'Proyek A', noSpk: 'SPK-1' },
        { namaBarang: 'Paku', qty: 2, satuan: 'kg', proyek: 'Proyek B', noSpk: 'SPK-2' },
      ],
    },
  },
  actions: [],
});
const suppliers = paged([{ id: 3, code: 'S3', name: 'PT Kayu', bank: 'BCA 123', npwp: '01.2', phone: '0812', address: 'Jl. Mawar', pajak: 'PKP' }]);

function setup(status = 'approved', extra: Record<string, unknown> = {}) {
  const api = installFakeApi({ 'GET /api/v1/approvals/7': request(status), 'GET /api/v1/suppliers': suppliers, ...extra });
  render(<PemesananPembelian />);
  return api;
}
const val = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

async function ready() {
  await screen.findByText('Pemesanan Pembelian');
}
async function pickSupplier() {
  fireEvent.click(screen.getByLabelText('Data Supplier'));
  fireEvent.click(await screen.findByText('S3 - PT Kayu'));
}
async function fillValid() {
  fireEvent.change(screen.getByLabelText('Tanggal PO'), { target: { value: '2026-03-10' } });
  await pickSupplier();
  type('PIC / Telp', ' Andi / 0811 ');
  type('Kode barang Triplex', 'TRP-1');
  type('Kode barang Paku', 'PKU-1');
  type('Harga satuan Triplex', '1000');
  type('Diskon Triplex', '500');
  type('Harga satuan Paku', '2500');
}
const submit = () => fireEvent.click(screen.getByText('Buat'));

describe('PemesananPembelian guards', () => {
  it.each(['pending', 'rejected', 'revision_requested'])('is blocked while status is %s', async (st) => {
    setup(st);
    expect(await screen.findByText('PO baru bisa dibuat setelah permintaan pembelian disetujui.')).not.toBeNull();
    expect(screen.queryByText('Pemesanan Pembelian')).toBeNull();
  });

  it('shows load error', async () => {
    setup('approved', { 'GET /api/v1/approvals/7': fail(404, 'Approval tidak ada') });
    expect(await screen.findByText('Approval tidak ada')).not.toBeNull();
  });

  it('renders the form for an approved request with one price row per item', async () => {
    setup();
    await ready();
    expect(screen.getByLabelText('Harga satuan Triplex')).not.toBeNull();
    expect(screen.getByLabelText('Harga satuan Paku')).not.toBeNull();
    expect(val('PPN (persen)')).toBe('12');
    expect(screen.getByText('Proyek A, Proyek B')).not.toBeNull();
    // no nomor PO input at all: backend generates it
    expect(screen.queryByLabelText(/nomor po/i)).toBeNull();
  });
});

describe('PemesananPembelian preview totals', () => {
  it('uses subtotal, dppLain=round(sub*11/12), ppn=round(dpp*ppn/100), grand=sub+ppn+jasa', async () => {
    setup();
    await ready();
    await fillValid();
    type('Jasa', '300');
    expect(val('Total harga setelah diskon')).toBe('14.500');
    expect((document.getElementById('po-dpp') as HTMLInputElement).value).toBe('13.292');
    expect(val('Nilai PPN')).toBe('1.595');
    expect(val('Total harga setelah PPN')).toBe('16.095');
    expect(val('Grand total')).toBe('16.395');
    type('PPN (persen)', '11');
    expect(val('Nilai PPN')).toBe('1.462'); // round(13292*0.11)=1462.12
  });

  it('inputs are digits only and maxLength limited', async () => {
    setup();
    await ready();
    const harga = screen.getByLabelText('Harga satuan Triplex') as HTMLInputElement;
    type('Harga satuan Triplex', '1a2.5');
    expect(harga.value).toBe('125');
    expect(harga.maxLength).toBe(9);
    expect((screen.getByLabelText('Jasa') as HTMLInputElement).maxLength).toBe(9);
    expect((screen.getByLabelText('Kode barang Triplex') as HTMLInputElement).maxLength).toBe(191);
    type('PPN (persen)', '1x2.5-');
    expect(val('PPN (persen)')).toBe('12.5');
  });
});

describe('PemesananPembelian submit', () => {
  it('posts the PO payload with integers and no nomorPo/dppLain, then shows PO number and grand total', async () => {
    const api = setup('approved', {
      'POST /api/v1/purchase-orders': { id: 1, nomorPo: 'PO/2026/0001', supplierName: 'PT Kayu', grandTotal: 16395 },
    });
    await ready();
    await fillValid();
    type('Jasa', '300');
    submit();
    expect(await screen.findByText('PO PO/2026/0001 berhasil dibuat')).not.toBeNull();
    expect(screen.getByText(/grand total Rp\. 16\.395/)).not.toBeNull();
    const body = api.calls('POST /api/v1/purchase-orders')[0].body as Record<string, unknown>;
    expect(body).toEqual({
      approvalRequestId: 7,
      tanggalPo: '2026-03-10',
      supplierId: 3,
      picSupplier: 'Andi / 0811',
      barang: [
        { kodeBarang: 'TRP-1', namaBarang: 'Triplex', satuan: 'lbr', jumlah: 10, hargaSatuan: 1000, diskon: 500 },
        { kodeBarang: 'PKU-1', namaBarang: 'Paku', satuan: 'kg', jumlah: 2, hargaSatuan: 2500, diskon: 0 },
      ],
      persenPpn: 12,
      jasa: 300,
    });
    expect(body).not.toHaveProperty('nomorPo');
    expect(body).not.toHaveProperty('dppLain');
    expect(screen.getByText('Kembali ke Rekap Pembelian').getAttribute('href')).toBe('/dashboard/purchasing/laporan/rekap-pembelian');
  });

  it('shows backend 409 and stays on the form', async () => {
    setup('approved', { 'POST /api/v1/purchase-orders': fail(409, 'PO untuk permintaan ini sudah ada') });
    await ready();
    await fillValid();
    submit();
    expect(await screen.findByText('PO untuk permintaan ini sudah ada')).not.toBeNull();
    expect(screen.getByText('Pemesanan Pembelian')).not.toBeNull();
  });

  it.each([
    ['Tanggal PO wajib diisi.', () => {}],
    ['Pilih supplier terlebih dahulu.', () => fireEvent.change(screen.getByLabelText('Tanggal PO'), { target: { value: '2026-03-10' } })],
  ])('validation: %s', async (msg, prep) => {
    const api = setup();
    await ready();
    prep();
    submit();
    expect(await screen.findByText(msg)).not.toBeNull();
    expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(0);
  });

  it('validates pic, kode barang, harga > 0, discount and ppn limits in order', async () => {
    const api = setup();
    await ready();
    fireEvent.change(screen.getByLabelText('Tanggal PO'), { target: { value: '2026-03-10' } });
    await pickSupplier();
    submit();
    expect(await screen.findByText('PIC supplier wajib diisi.')).not.toBeNull();
    type('PIC / Telp', 'Andi');
    submit();
    expect(await screen.findByText('Kode barang setiap baris wajib diisi.')).not.toBeNull();
    type('Kode barang Triplex', 'A');
    type('Kode barang Paku', 'B');
    submit();
    expect(await screen.findByText('Harga satuan setiap barang wajib diisi lebih dari 0.')).not.toBeNull();
    type('Harga satuan Triplex', '100');
    type('Harga satuan Paku', '100');
    type('Diskon Triplex', '5000'); // exceeds 10*100
    submit();
    expect(await screen.findByText(/diskon tidak boleh melebihi harga barang/)).not.toBeNull();
    type('Diskon Triplex', '0');
    type('PPN (persen)', '101');
    submit();
    expect(await screen.findByText(/PPN maksimal 100/)).not.toBeNull();
    expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(0);
  });

  it('shows supplier load error', async () => {
    setup('approved', { 'GET /api/v1/suppliers': fail(500, 'Supplier gagal') });
    await screen.findByText('Pemesanan Pembelian');
    expect(await screen.findByText('Supplier gagal')).not.toBeNull();
  });
});

describe('permissions', () => {
  const user = (permissions: string[], isSuperadmin = false) => ({ id: 1, username: 'u', email: 'u@x.id', roleId: 1, roleName: 'R', isSuperadmin, permissions });
  const renderAs = (u: ReturnType<typeof user>) => {
    installFakeApi({ 'GET /api/v1/approvals/7': request('approved'), 'GET /api/v1/suppliers': suppliers });
    render(<AuthUserProvider user={u}><PemesananPembelian /></AuthUserProvider>);
  };
  it('without purchase-order.create shows a message instead of the form', async () => {
    renderAs(user(['purchase-order.view']));
    await screen.findByText('Anda tidak memiliki izin untuk membuat PO.');
    expect(screen.queryByText('Buat')).toBeNull();
  });
  it('with permission or superadmin shows the form', async () => {
    renderAs(user(['purchase-order.create']));
    await screen.findByText('Pemesanan Pembelian');
    cleanup();
    renderAs(user([], true));
    await screen.findByText('Pemesanan Pembelian');
  });
});
