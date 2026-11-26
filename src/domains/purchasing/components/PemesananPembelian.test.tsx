import { describe, it, expect, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { installFakeApi, paged, fail, type FakeRequest } from '@/test/fake-api';
import PemesananPembelian from './PemesananPembelian';
import { AuthUserProvider } from '@/domains/auth/user-context';
import { todayIso } from '@/domains/inventory/date';

vi.setConfig({ testTimeout: 20000 });

const nav = vi.hoisted(() => ({ query: '' }));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: '7' }), useRouter: () => ({ push: vi.fn() }), usePathname: () => '/', useSearchParams: () => new URLSearchParams(nav.query) }));

const print = vi.hoisted(() => ({ printPurchaseOrder: vi.fn<(po: import('@/domains/purchasing/types').PurchaseOrder) => Promise<void>>(async () => {}) }));
vi.mock('@/domains/purchasing/export/print-po', () => print);

const request = (status: string) => ({
  request: {
    id: 7, type: 'purchase-request', requestedBy: 1, requestedByDomainId: 1, currentStepOrder: 1, cycle: 1, status, createdAt: '2026-03-01T00:00:00Z',
    payload: {
      bagian: 'Produksi', namaPemohon: 'Budi', jabatan: 'Staff', tanggalPengajuan: '2026-03-05',
      items: [
        { namaBarang: 'Triplex', qty: 10, satuan: 'lbr', proyek: 'Proyek A', noSpk: 'SPK-1' },
        { namaBarang: 'Paku', qty: 2, satuan: 'kg', proyek: 'Proyek A', noSpk: 'SPK-1' },
      ],
    },
  },
  actions: [],
});
const suppliers = paged([{ id: 3, code: 'S3', name: 'PT Kayu', bank: 'BCA 123', npwp: '01.2', phone: '0812', address: 'Jl. Mawar', pajak: 'PKP' }]);

function setup(status = 'approved', extra: Record<string, unknown> = {}) {
  const api = installFakeApi({ 'GET /api/v1/approvals/7': request(status), 'GET /api/v1/suppliers': suppliers, 'GET /api/v1/purchase-orders': paged([]), 'PUT /api/v1/approvals/7/mapping': {}, ...extra });
  render(<PemesananPembelian />);
  return api;
}
const val = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

async function ready() {
  await screen.findByText('Pemesanan Pembelian');
  await waitFor(() => expect(screen.queryByText('Memuat PO sebelumnya...')).toBeNull());
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
async function submit() {
  const button = screen.getByText('Simpan Draft') as HTMLButtonElement;
  // The button stays disabled while existing POs load; clicking earlier silently does nothing.
  await waitFor(() => expect(button.disabled).toBe(false));
  fireEvent.click(button);
}

describe('PemesananPembelian guards', () => {
  it.each(['pending', 'rejected', 'revision_requested'])('is blocked while status is %s', async (st) => {
    setup(st);
    expect(await screen.findByText('PO baru bisa dibuat setelah permintaan pembelian disetujui PPIC.')).not.toBeNull();
    expect(screen.queryByText('Pemesanan Pembelian')).toBeNull();
  });

  it('mengisi Tanggal PO dengan tanggal hari ini', async () => {
    setup('approved');
    await ready();
    expect(val('Tanggal PO')).toBe(todayIso());
  });

  it('kembali ke daftar PO Barang saat dibuka dengan ?from=po-barang', async () => {
    nav.query = 'from=po-barang';
    setup('approved');
    await ready();
    expect(screen.getByLabelText('Kembali').getAttribute('href')).toBe('/dashboard/purchasing/transaksi/buat-po-barang');
    nav.query = '';
  });

  it('kembali ke detail permintaan versi PO Barang saat dibuka dari tombol Buat PO di sana', async () => {
    nav.query = 'from=permintaan-po-barang';
    setup('approved');
    await ready();
    expect(screen.getByLabelText('Kembali').getAttribute('href')).toBe('/dashboard/purchasing/transaksi/buat-po-barang/permintaan-pembelian/7');
    nav.query = '';
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
    expect(screen.getByText('Proyek A')).not.toBeNull();
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
    expect(val('DPP Lain :')).toBe('13.292');
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
    await submit();
    expect(await screen.findByText('PO PO/2026/0001 berhasil disimpan sebagai DRAFT')).not.toBeNull();
    expect(screen.getByText(/grand total Rp\. 16\.395/)).not.toBeNull();
    const body = api.calls('POST /api/v1/purchase-orders')[0].body as Record<string, unknown>;
    expect(body).toEqual({
      approvalRequestId: 7,
      tanggalPo: '2026-03-10',
      supplierId: 3,
      picSupplier: 'Andi / 0811',
      barang: [
        { lineIndex: 0, kodeBarang: 'TRP-1', namaBarang: 'Triplex', satuan: 'lbr', jumlah: 10, hargaSatuan: 1000, diskon: 500 },
        { lineIndex: 1, kodeBarang: 'PKU-1', namaBarang: 'Paku', satuan: 'kg', jumlah: 2, hargaSatuan: 2500, diskon: 0 },
      ],
      persenPpn: 12,
      jasa: 300,
    });
    expect(body).not.toHaveProperty('nomorPo');
    expect(body).not.toHaveProperty('dppLain');
    expect(body).not.toHaveProperty('kebutuhanProyek');
    expect(screen.getByText('Kembali ke Detail Permintaan').getAttribute('href')).toBe('/dashboard/purchasing/laporan/rekap-pembelian/permintaan-pembelian/7');
  });

  it('mengirim submit untuk PO draft setelah dibuat', async () => {
    const api = setup('approved', {
      'POST /api/v1/purchase-orders': { id: 1, nomorPo: 'PO/1', supplierName: 'PT Kayu', grandTotal: 16395, status: 'DRAFT' },
      'POST /api/v1/purchase-orders/1/submit': { id: 1, nomorPo: 'PO/1', supplierName: 'PT Kayu', grandTotal: 16395, status: 'ISSUED', submittedAt: '2026-03-10T00:00:00Z', submittedBy: 1 },
    });
    await ready();
    await fillValid();
    await submit();
    await screen.findByText('PO PO/1 berhasil disimpan sebagai DRAFT');
    fireEvent.click(screen.getByRole('button', { name: 'Submit PO' }));
    await screen.findByText('PO PO/1 berhasil disimpan sebagai ISSUED');
    expect(api.calls('POST /api/v1/purchase-orders/1/submit')).toHaveLength(1);
    expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(1);
  });

  it('prints the saved PO without creating a new one', async () => {
    print.printPurchaseOrder.mockClear();
    const api = setup('approved', {
      'POST /api/v1/purchase-orders': { id: 1, nomorPo: 'PO/2026/0001', supplierName: 'PT Kayu', grandTotal: 16395 },
    });
    await ready();
    await fillValid();
    await submit();
    await screen.findByText('PO PO/2026/0001 berhasil disimpan sebagai DRAFT');
    fireEvent.click(screen.getByRole('button', { name: 'Cetak PO' }));
    await waitFor(() => expect(print.printPurchaseOrder).toHaveBeenCalledTimes(1));
    expect(print.printPurchaseOrder.mock.calls[0][0]).toMatchObject({ id: 1, nomorPo: 'PO/2026/0001' });
    expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(1);
  });

  it('shows backend 409 and stays on the form', async () => {
    setup('approved', { 'POST /api/v1/purchase-orders': fail(409, 'PO untuk permintaan ini sudah ada') });
    await ready();
    await fillValid();
    await submit();
    expect(await screen.findByText('PO untuk permintaan ini sudah ada')).not.toBeNull();
    expect(screen.getByText('Pemesanan Pembelian')).not.toBeNull();
  });

  it.each([
    ['Tanggal PO wajib diisi.', () => fireEvent.change(screen.getByLabelText('Tanggal PO'), { target: { value: '' } })],
    ['Pilih supplier terlebih dahulu.', () => fireEvent.change(screen.getByLabelText('Tanggal PO'), { target: { value: '2026-03-10' } })],
  ])('validation: %s', async (msg, prep) => {
    const api = setup();
    await ready();
    prep();
    await submit();
    expect(await screen.findByText(msg)).not.toBeNull();
    expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(0);
  });

  it('validates pic, kode barang, harga > 0, discount and ppn limits in order', async () => {
    const api = setup();
    await ready();
    fireEvent.change(screen.getByLabelText('Tanggal PO'), { target: { value: '2026-03-10' } });
    await pickSupplier();
    await submit();
    expect(await screen.findByText('PIC supplier wajib diisi.')).not.toBeNull();
    type('PIC / Telp', 'Andi');
    await submit();
    expect(await screen.findByText('Kode barang setiap baris wajib diisi.')).not.toBeNull();
    type('Kode barang Triplex', 'A');
    type('Kode barang Paku', 'B');
    await submit();
    expect(await screen.findByText('Harga satuan setiap barang wajib diisi lebih dari 0.')).not.toBeNull();
    type('Harga satuan Triplex', '100');
    type('Harga satuan Paku', '100');
    type('Diskon Triplex', '5000'); // exceeds 10*100
    await submit();
    expect(await screen.findByText(/diskon tidak boleh melebihi harga barang/)).not.toBeNull();
    type('Diskon Triplex', '0');
    type('PPN (persen)', '101');
    await submit();
    expect(await screen.findByText(/PPN maksimal 100/)).not.toBeNull();
    expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(0);
  });

  it('shows supplier load error', async () => {
    setup('approved', { 'GET /api/v1/suppliers': fail(500, 'Supplier gagal') });
    await screen.findByText('Pemesanan Pembelian');
    expect(await screen.findByText('Supplier gagal')).not.toBeNull();
  });
});

describe('pemilihan baris per PO', () => {
  const poLama = (lines: number[]) => ({
    id: 11, nomorPo: 'PO-1', approvalRequestId: 7, status: 'ISSUED', supplierName: 'PT Lama', tanggalPo: '2026-03-01', grandTotal: 1000,
    barang: lines.map((lineIndex) => ({ lineIndex, kodeBarang: 'X', namaBarang: lineIndex === 0 ? 'Triplex' : 'Paku', satuan: 'x', jumlah: 1, hargaSatuan: 1, diskon: 0 })),
  });

  it('hanya mengirim baris yang dicentang untuk PO ini', async () => {
    const api = setup('approved', { 'POST /api/v1/purchase-orders': { id: 1, nomorPo: 'PO/1', supplierName: 'PT Kayu', grandTotal: 5000 } });
    await ready();
    await fillValid();
    fireEvent.click(screen.getByLabelText('Pilih Paku'));
    await submit();
    await screen.findByText('PO PO/1 berhasil disimpan sebagai DRAFT');
    const body = api.calls('POST /api/v1/purchase-orders')[0].body as { barang: unknown[] };
    expect(body.barang).toEqual([{ lineIndex: 0, kodeBarang: 'TRP-1', namaBarang: 'Triplex', satuan: 'lbr', jumlah: 10, hargaSatuan: 1000, diskon: 500 }]);
  });

  it('menandai baris yang sudah masuk PO aktif dan tidak mengirimnya lagi', async () => {
    const lama = poLama([0]);
    const api = setup('approved', {
      'GET /api/v1/purchase-orders': paged([lama]),
      'GET /api/v1/purchase-orders/11': lama,
      'POST /api/v1/purchase-orders': { id: 2, nomorPo: 'PO/2', supplierName: 'PT Kayu', grandTotal: 5000 },
    });
    await ready();
    await screen.findByText('Sudah dipesan');
    expect(screen.queryByLabelText('Pilih Triplex')).toBeNull();
    expect(screen.getByLabelText('Pilih Paku')).not.toBeNull();
    await fillValid();
    await submit();
    await screen.findByText('PO PO/2 berhasil disimpan sebagai DRAFT');
    const body = api.calls('POST /api/v1/purchase-orders')[0].body as { barang: { lineIndex: number }[] };
    expect(body.barang.map((b) => b.lineIndex)).toEqual([1]);
  });

  it('menolak membuat PO saat semua baris sudah dipesan', async () => {
    const lama = poLama([0, 1]);
    const api = setup('approved', {
      'GET /api/v1/purchase-orders': paged([lama]),
      'GET /api/v1/purchase-orders/11': lama,
    });
    await ready();
    expect(await screen.findByText('Semua barang pada proyek ini sudah masuk PO.')).not.toBeNull();
    fireEvent.click(screen.getByText('Simpan Draft'));
    expect((screen.getByRole('button', { name: 'Simpan Draft' }) as HTMLButtonElement).disabled).toBe(true);
    expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(0);
  });
});

describe('permissions', () => {
  const user = (permissions: string[], isSuperadmin = false) => ({ id: 1, username: 'u', email: 'u@x.id', roleId: 1, roleName: 'R', isSuperadmin, permissions });
  const renderAs = (u: ReturnType<typeof user>) => {
    installFakeApi({ 'GET /api/v1/approvals/7': request('approved'), 'GET /api/v1/suppliers': suppliers, 'GET /api/v1/purchase-orders': paged([]) });
    render(<AuthUserProvider user={u}><PemesananPembelian /></AuthUserProvider>);
  };
  it('without purchase-order.create shows a message instead of the form', async () => {
    renderAs(user(['purchase-order.view']));
    await screen.findByText('Anda tidak memiliki izin untuk membuat PO.');
    expect(screen.queryByText('Simpan Draft')).toBeNull();
  });
  it('with permission or superadmin shows the form', async () => {
    renderAs(user(['purchase-order.create']));
    await screen.findByText('Pemesanan Pembelian');
    cleanup();
    renderAs(user([], true));
    await screen.findByText('Pemesanan Pembelian');
  });
});

describe('pemisahan otomatis per proyek', () => {
  function multiProject() {
    const data = request('approved');
    data.request.payload.items[1].proyek = 'Proyek B';
    data.request.payload.items.push({ namaBarang: 'Lem', qty: 3, satuan: 'kaleng', proyek: ' Proyek A ', noSpk: 'SPK-1' });
    return data;
  }

  async function fillProject(name: string, items: string[], supplierName = 'S3 - PT Kayu') {
    const form = within(screen.getByRole('form', { name: `PO ${name}` }));
    fireEvent.change(form.getByLabelText('Tanggal PO'), { target: { value: '2026-03-10' } });
    fireEvent.click(form.getByLabelText('Data Supplier'));
    fireEvent.click(await form.findByText(supplierName));
    fireEvent.change(form.getByLabelText('PIC / Telp'), { target: { value: `PIC ${name}` } });
    for (const item of items) {
      fireEvent.change(form.getByLabelText(`Kode barang ${item}`), { target: { value: `K-${item}` } });
      fireEvent.change(form.getByLabelText(`Harga satuan ${item}`), { target: { value: '1000' } });
    }
    const simpan = form.getByRole('button', { name: 'Simpan Draft' }) as HTMLButtonElement;
    await waitFor(() => expect(simpan.disabled).toBe(false));
    return form;
  }

  it('mengelompokkan form terpisah per SPK walau proyeknya sama', async () => {
    const data = request('approved');
    data.request.payload.items[1].noSpk = 'SPK-2';
    setup('approved', { 'GET /api/v1/approvals/7': data });
    const forms = await screen.findAllByRole('form', { name: 'PO Proyek A' });
    expect(forms).toHaveLength(2);
    expect(screen.getByText(/No SPK: SPK-1/)).toBeTruthy();
    expect(screen.getByText(/No SPK: SPK-2/)).toBeTruthy();
    expect(within(forms[0]).getByLabelText('Harga satuan Triplex')).toBeTruthy();
    expect(within(forms[0]).queryByLabelText('Harga satuan Paku')).toBeNull();
    expect(within(forms[1]).getByLabelText('Harga satuan Paku')).toBeTruthy();
    expect(within(forms[1]).queryByLabelText('Harga satuan Triplex')).toBeNull();
  });

  it('mengelompokkan barang, mempertahankan indeks asli, dan menyimpan supplier serta biaya per proyek', async () => {
    const api = setup('approved', {
      'GET /api/v1/approvals/7': multiProject(),
      'GET /api/v1/suppliers': paged([...suppliers.rows, { ...suppliers.rows[0], id: 4, code: 'S4', name: 'PT Cat' }]),
      'POST /api/v1/purchase-orders': (req: FakeRequest) => ({ ...req.body as object, id: 1, nomorPo: 'PO-A', supplierName: 'PT Kayu', grandTotal: 15000 }),
    });
    const a = within(await screen.findByRole('form', { name: 'PO Proyek A' }));
    const b = within(screen.getByRole('form', { name: 'PO Proyek B' }));
    expect(a.queryByLabelText('Harga satuan Paku')).toBeNull();
    expect(b.queryByLabelText('Harga satuan Triplex')).toBeNull();
    expect(a.getByLabelText('Harga satuan Lem')).not.toBeNull();
    const formA = await fillProject('Proyek A', ['Triplex', 'Lem']);
    fireEvent.change(formA.getByLabelText('Jasa'), { target: { value: '300' } });
    expect((b.getByLabelText('Jasa') as HTMLInputElement).value).toBe('');
    expect((formA.getByLabelText('Total harga setelah diskon') as HTMLInputElement).value).toBe('13.000');
    const formB = await fillProject('Proyek B', ['Paku'], 'S4 - PT Cat');
    fireEvent.change(formB.getByLabelText('PPN (persen)'), { target: { value: '11' } });
    fireEvent.click(formA.getByRole('button', { name: 'Simpan Draft' }));
    await screen.findByText('PO PO-A berhasil disimpan sebagai DRAFT');
    fireEvent.click(formB.getByRole('button', { name: 'Simpan Draft' }));
    await waitFor(() => expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(2));
    const bodies = api.calls('POST /api/v1/purchase-orders').map((call) => call.body as { barang: { lineIndex: number }[] });
    expect(bodies[0]).toMatchObject({ approvalRequestId: 7, supplierId: 3, jasa: 300, persenPpn: 12 });
    expect(bodies[0].barang.map((line) => line.lineIndex)).toEqual([0, 2]);
    expect(bodies[1]).toMatchObject({ approvalRequestId: 7, supplierId: 4, jasa: 0, persenPpn: 11 });
    expect(bodies[1].barang.map((line) => line.lineIndex)).toEqual([1]);
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('mempertahankan hasil proyek yang berhasil dan isian proyek gagal saat dicoba lagi', async () => {
    let gagal = true;
    const api = setup('approved', {
      'GET /api/v1/approvals/7': multiProject(),
      'POST /api/v1/purchase-orders': (req: FakeRequest) => {
        const body = req.body as { barang: { lineIndex: number }[] };
        // Proyek B punya satu baris dengan lineIndex 1; proyek A memakai 0 dan 2.
        const proyekB = body.barang[0]?.lineIndex === 1;
        return proyekB && gagal
          ? fail(500, 'Gagal menyimpan Proyek B')
          : { id: proyekB ? 2 : 1, nomorPo: proyekB ? 'Proyek B' : 'Proyek A', supplierName: 'PT Kayu', grandTotal: 1000 };
      },
    });
    await screen.findByRole('form', { name: 'PO Proyek A' });
    const a = await fillProject('Proyek A', ['Triplex', 'Lem']);
    const b = await fillProject('Proyek B', ['Paku']);
    fireEvent.click(a.getByRole('button', { name: 'Simpan Draft' }));
    await screen.findByText('PO Proyek A berhasil disimpan sebagai DRAFT');
    fireEvent.click(b.getByRole('button', { name: 'Simpan Draft' }));
    await b.findByText('Gagal menyimpan Proyek B');
    expect(screen.getByText('PO Proyek A berhasil disimpan sebagai DRAFT')).not.toBeNull();
    expect((b.getByLabelText('Harga satuan Paku') as HTMLInputElement).value).toBe('1000');
    gagal = false;
    fireEvent.click(b.getByRole('button', { name: 'Simpan Draft' }));
    await screen.findByText('PO Proyek B berhasil disimpan sebagai DRAFT');
    expect(api.calls('POST /api/v1/purchase-orders').map((call) => (call.body as { barang: { lineIndex: number }[] }).barang[0]?.lineIndex)).toEqual([0, 1, 1]);
  });

  it('membuat PO berikutnya untuk sisa barang tanpa memesan ulang baris yang berhasil', async () => {
    const api = setup('approved', {
      'POST /api/v1/purchase-orders': { id: 1, nomorPo: 'PO-1', supplierName: 'PT Kayu', grandTotal: 1000 },
    });
    await ready();
    await fillValid();
    fireEvent.click(screen.getByLabelText('Pilih Paku'));
    await submit();
    fireEvent.click(await screen.findByRole('button', { name: /Simpan Draft PO berikutnya/ }));
    expect(screen.queryByLabelText('Pilih Triplex')).toBeNull();
    expect(screen.getByText('Sudah dipesan')).not.toBeNull();
    expect((screen.getByLabelText('Pilih Paku') as HTMLInputElement).checked).toBe(true);
    await pickSupplier();
    type('PIC / Telp', 'PIC kedua');
    await submit();
    await screen.findByText('PO PO-1 berhasil disimpan sebagai DRAFT');
    expect((api.calls('POST /api/v1/purchase-orders')[1].body as { barang: { lineIndex: number }[] }).barang.map((line) => line.lineIndex)).toEqual([1]);
  });

  it('memblokir penyimpanan jika daftar PO sebelumnya gagal dimuat dan menyediakan coba lagi', async () => {
    let gagal = true;
    const api = setup('approved', { 'GET /api/v1/purchase-orders': () => gagal ? fail(500, 'Daftar PO gagal') : paged([]) });
    await screen.findByText('Daftar PO gagal');
    expect((screen.getByRole('button', { name: 'Simpan Draft' }) as HTMLButtonElement).disabled).toBe(true);
    gagal = false;
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Simpan Draft' }) as HTMLButtonElement).disabled).toBe(false));
    expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(0);
  });

  it('menampilkan barang tanpa proyek dan memblokir pembuatan PO-nya', async () => {
    const data = request('approved');
    data.request.payload.items.forEach((item) => { item.proyek = ''; });
    const api = setup('approved', { 'GET /api/v1/approvals/7': data });
    await screen.findByRole('form', { name: 'PO Belum diisi' });
    expect(screen.getByText('Proyek barang belum diisi. Perbaiki permintaan pembelian terlebih dahulu.')).not.toBeNull();
    expect(screen.getByLabelText('Harga satuan Triplex')).not.toBeNull();
    expect((screen.getByRole('button', { name: 'Simpan Draft' }) as HTMLButtonElement).disabled).toBe(true);
    expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(0);
  });
});
