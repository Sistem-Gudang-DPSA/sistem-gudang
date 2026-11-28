import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.setConfig({ testTimeout: 30000 });
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { fail, installFakeApi, paged, type FakeRequest } from '@/test/fake-api';
import DaftarPermintaanPembelianReview from './DaftarPermintaanPembelian';
import { DaftarPermintaanPembelian as DaftarPermintaanPembelianPPIC } from './DaftarPermintaanPembelian';
import { withUser } from '@/test/as-user';
import PermintaanPembelianGudang from '@/domains/inventory/components/PermintaanPembelian';

const cetak = vi.hoisted(() => ({ cetakLaporan: vi.fn(async () => {}) }));
vi.mock('@/shared/lib/print-laporan', () => ({ cetakLaporan: cetak.cetakLaporan }));
beforeEach(() => cetak.cetakLaporan.mockClear());

const row = (id: number, status: string, over: Record<string, unknown> = {}) => ({
  id, type: 'purchase-request', requestedBy: 1, requestedByDomainId: 1, currentStepOrder: 1, cycle: 1, status,
  createdAt: '2026-03-01T00:00:00Z',
  payload: {
    bagian: 'Produksi', namaPemohon: 'Budi', jabatan: 'Staff', tanggalPengajuan: '2026-03-05', notes: 'Segera',
    items: [{ namaBarang: 'Triplex', qty: 5, satuan: 'Lbr', proyek: 'Kantor', noSpk: 'SPK-1' }],
  },
  ...over,
});

describe.each([
  ['PPIC', DaftarPermintaanPembelianPPIC, '/dashboard/ppic/transaksi/permintaan-pembelian'],
] as const)('Cetak daftar permintaan %s', (_, Component, basePath) => {
  it('mencetak data permintaan yang dipilih tanpa menyimpan ulang dan mempertahankan link divisi', async () => {
    const request = row(1, 'pending');
    request.payload.items[0] = { ...request.payload.items[0], namaBarang: '<b>Triplex</b>' };
    const api = installFakeApi({ 'GET /api/v1/approvals': paged([request]) });
    render(withUser(<Component />, ['purchase-request.create']));
    const button = await screen.findByRole('button', { name: 'Cetak' });
    fireEvent.click(button);
    expect((screen.getByRole('button', { name: 'Mencetak...' }) as HTMLButtonElement).disabled).toBe(true);
    await waitFor(() => expect(cetak.cetakLaporan).toHaveBeenCalledTimes(1));
    const [title, html, options] = cetak.cetakLaporan.mock.calls[0] as unknown as [string, string, { meta: string[] }];
    expect(title).toBe('Form Permintaan Pembelian Bahan Baku');
    expect(html).toContain('&lt;b&gt;Triplex&lt;/b&gt;');
    expect(html).not.toContain('<b>Triplex</b>');
    expect(html).toContain('Kantor');
    expect(html).toContain('Kepala Gudang');
    expect(options.meta.join(' ')).toContain('Budi');
    expect(options.meta.join(' ')).toContain('2026-03-05');
    expect(api.calls('POST /api/v1/purchase-requests')).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Edit' }).getAttribute('href')).toBe(`${basePath}/1/edit`);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cetak' })).not.toBeNull());
  });

  it('menampilkan kegagalan cetak dan mengaktifkan kembali tombol', async () => {
    cetak.cetakLaporan.mockRejectedValueOnce(new Error('Gagal membuka cetak'));
    installFakeApi({ 'GET /api/v1/approvals': paged([row(1, 'approved')]) });
    render(withUser(<Component />, ['approval.view']));
    fireEvent.click(await screen.findByRole('button', { name: 'Cetak' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Gagal membuka cetak');
    expect((screen.getByRole('button', { name: 'Cetak' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('menonaktifkan cetak jika payload tidak tersedia', async () => {
    installFakeApi({ 'GET /api/v1/approvals': paged([row(1, 'pending', { payload: null })]) });
    render(withUser(<Component />, ['approval.view']));
    const button = await screen.findByRole('button', { name: 'Cetak' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);
    expect(cetak.cetakLaporan).not.toHaveBeenCalled();
  });

  it('menyembunyikan cetak tanpa izin membaca permintaan', async () => {
    installFakeApi({ 'GET /api/v1/approvals': paged([row(1, 'pending')]) });
    render(withUser(<Component />, []));
    await screen.findByText('Triplex — 5 Lbr');
    expect(screen.queryByRole('button', { name: 'Cetak' })).toBeNull();
  });
});

describe('Daftar permintaan Gudang tanpa cetak', () => {
  it.each(['purchase-request.create', 'approval.view'])('menyembunyikan Cetak untuk %s dan tetap membuka Detail', async (permission) => {
    installFakeApi({ 'GET /api/v1/approvals': paged([row(1, 'pending')]) });
    render(withUser(<PermintaanPembelianGudang />, [permission]));
    fireEvent.click(await screen.findByRole('button', { name: 'Detail' }));
    expect(screen.getByText('Tanggal Pengajuan')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Cetak' })).toBeNull();
    expect(cetak.cetakLaporan).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
    expect(screen.queryByRole('button', { name: 'Cetak' })).toBeNull();
  });
});

describe('DaftarPermintaanPembelian', () => {
  it('PPIC memiliki tombol pengajuan baru menuju form PPIC', async () => {
    installFakeApi({ 'GET /api/v1/approvals': paged([row(1, 'pending')]) });
    render(withUser(<DaftarPermintaanPembelianReview />, ['purchase-request.create']));
    const tambah = await screen.findByRole('link', { name: 'Ajukan Permintaan Pembelian' });
    expect(tambah.getAttribute('href')).toBe('/dashboard/ppic/transaksi/permintaan-pembelian/tambah');
    expect(screen.getByRole('link', { name: 'Tinjau Permintaan' })).not.toBeNull();
  });

  it('menyembunyikan tombol pengajuan PPIC tanpa permission create', async () => {
    installFakeApi({ 'GET /api/v1/approvals': paged([row(1, 'pending')]) });
    render(withUser(<DaftarPermintaanPembelianReview />, ['approval.view']));
    await screen.findByText('Triplex — 5 Lbr');
    expect(screen.queryByRole('link', { name: 'Ajukan Permintaan Pembelian' })).toBeNull();
  });

  it('loads purchase-request approvals and renders rows', async () => {
    const api = installFakeApi({ 'GET /api/v1/approvals': paged([row(1, 'pending')]) });
    render(<DaftarPermintaanPembelianPPIC />);
    expect(await screen.findByText('Triplex — 5 Lbr')).toBeTruthy();
    expect(screen.getByText('05-03-2026')).toBeTruthy();
    const q = api.calls('GET /api/v1/approvals')[0].query;
    expect(q.get('type')).toBe('purchase-request');
    expect(q.get('page')).toBe('1');
  });

  it.each([
    ['pending', 'Menunggu'],
    ['approved', 'Disetujui'],
    ['rejected', 'Ditolak'],
    ['revision_requested', 'Perlu Revisi'],
  ])('detail modal shows status label for %s', async (status, label) => {
    installFakeApi({ 'GET /api/v1/approvals': paged([row(1, status)]) });
    render(<DaftarPermintaanPembelianPPIC />);
    await screen.findByText('Triplex — 5 Lbr');
    fireEvent.click(screen.getByText('Detail'));
    const dialogStatus = screen.getByText('Status').parentElement as HTMLElement;
    expect(dialogStatus.textContent).toContain(label);
    expect(screen.getByText('Segera')).toBeTruthy();
    expect(screen.getByText('SPK-1')).toBeTruthy();
    fireEvent.click(screen.getByText('Tutup'));
    expect(screen.queryByText('Tanggal Pengajuan')).toBeNull();
  });

  it('does not crash when a payload misses items and the other fields', async () => {
    const partial = row(2, 'pending', { payload: { bagian: 'Gudang' } });
    installFakeApi({ 'GET /api/v1/approvals': paged([partial]) });
    render(<DaftarPermintaanPembelianPPIC />);
    expect(await screen.findByText('0 barang')).toBeTruthy();
    fireEvent.click(screen.getByText('Detail'));
    // Without tanggalPengajuan the date falls back to createdAt, like the list row
    expect(screen.getByText('Tanggal Pengajuan').parentElement!.textContent).toContain('01-03-2026');
    expect(screen.getByText('Nama').parentElement!.textContent).toContain('-');
  });

  it('shows the empty state', async () => {
    installFakeApi({ 'GET /api/v1/approvals': paged([]) });
    render(<DaftarPermintaanPembelianPPIC />);
    expect(await screen.findByText('Data tidak ditemukan untuk filter tersebut.')).toBeTruthy();
  });

  it('shows the error state', async () => {
    installFakeApi({ 'GET /api/v1/approvals': fail(500, 'Server mati') });
    render(<DaftarPermintaanPembelianPPIC />);
    expect(await screen.findByText('Server mati')).toBeTruthy();
  });

  it('requests page=2 from the pagination', async () => {
    const api = installFakeApi({ 'GET /api/v1/approvals': (req: FakeRequest) => paged([row(1, 'pending')], { total: 45, page: Number(req.query.get('page')) }) });
    render(<DaftarPermintaanPembelianPPIC />);
    await screen.findByText('Triplex — 5 Lbr');
    fireEvent.click(screen.getByRole('button', { name: 'Selanjutnya' }));
    await waitFor(() => expect(api.calls('GET /api/v1/approvals').some((c) => c.query.get('page') === '2')).toBe(true));
  });

  it('sends the search text and date range filter to the server', async () => {
    const api = installFakeApi({
      'GET /api/v1/approvals': paged([
        row(1, 'pending'),
        row(2, 'pending', { payload: { bagian: 'Gudang', namaPemohon: 'A', jabatan: 'B', tanggalPengajuan: '2026-03-06', items: [{ namaBarang: 'Paku', qty: 1, satuan: 'Kg', proyek: 'P', noSpk: 'S' }] } }),
      ]),
    });
    render(<DaftarPermintaanPembelianPPIC />);
    await screen.findByText('Paku — 1 Kg');
    fireEvent.change(screen.getByPlaceholderText('Cari rincian permintaan...'), { target: { value: 'paku' } });
    await waitFor(() => expect(api.calls('GET /api/v1/approvals').at(-1)!.query.get('search')).toBe('paku'));
    fireEvent.change(screen.getByDisplayValue('Bulan'), { target: { value: '03' } });
    fireEvent.change(screen.getByDisplayValue('Tahun'), { target: { value: '2026' } });
    await waitFor(() => {
      const last = api.calls('GET /api/v1/approvals').at(-1)!;
      expect(last.query.get('startDate')).toBe('2026-03-01');
      expect(last.query.get('endDate')).toBe('2026-03-31');
    });
  });

  it('has a link to the tambah page', async () => {
    installFakeApi({ 'GET /api/v1/approvals': paged([]) });
    render(<DaftarPermintaanPembelianPPIC />);
    const link = screen.getByText('Ajukan Permintaan Pembelian').closest('a');
    expect(link?.getAttribute('href')).toBe('/dashboard/ppic/transaksi/permintaan-pembelian/tambah');
    await within(document.body).findByText('Data tidak ditemukan untuk filter tersebut.');
  });
});


describe('permissions', () => {
  it('a view-only user keeps the screen but not the actions', async () => {
    installFakeApi({ 'GET /api/v1/approvals': paged([row(1, 'pending')]) });
    render(withUser(<DaftarPermintaanPembelianPPIC />, ['approval.view']));
    await screen.findByText('Detail');
    expect(screen.queryByText('Ajukan Permintaan Pembelian')).toBeNull();
  });

  it.each([
    ['holds the permission', ['purchase-request.create'], false],
    ['is a superadmin', [], true],
  ])('a user who %s sees the actions', async (_label, perms, isSuperadmin) => {
    installFakeApi({ 'GET /api/v1/approvals': paged([row(1, 'pending')]) });
    render(withUser(<DaftarPermintaanPembelianPPIC />, perms, isSuperadmin));
    await screen.findByText('Detail');
    expect(screen.getByText('Ajukan Permintaan Pembelian')).toBeTruthy();
  });
});


describe('purchase status and edit links', () => {
  it('uses purchase progress rather than approval status and keeps Gudang links in Gudang', async () => {
    installFakeApi({ 'GET /api/v1/approvals': paged([
      row(1, 'pending', { purchaseStatus: 'NOT_PURCHASED' }),
      row(2, 'approved', { purchaseStatus: 'PARTIALLY_PURCHASED' }),
      row(3, 'approved', { purchaseStatus: 'PURCHASED' }),
    ]) });
    render(withUser(<DaftarPermintaanPembelianPPIC basePath="/dashboard/gudang/transaksi/permintaan-pembelian" />, ['purchase-request.create']));
    expect(await screen.findByText('Belum dibeli')).toBeTruthy();
    expect(screen.getByText('Sebagian dibeli')).toBeTruthy();
    expect(screen.getByText('Sudah dibeli')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Edit' })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Edit' }).getAttribute('href')).toBe('/dashboard/gudang/transaksi/permintaan-pembelian/1/edit');
    expect(screen.getByText('Ajukan Permintaan Pembelian').closest('a')?.getAttribute('href')).toBe('/dashboard/gudang/transaksi/permintaan-pembelian/tambah');
    expect(screen.queryByRole('button', { name: 'Tambah' })).toBeNull();
  });

  it('does not expose editing for another requester', async () => {
    installFakeApi({ 'GET /api/v1/approvals': paged([row(9, 'pending', { requestedBy: 42 })]) });
    render(withUser(<DaftarPermintaanPembelianPPIC />, ['purchase-request.create']));
    await screen.findByText('Detail');
    expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull();
  });
});

describe('Batalkan', () => {
  const perms = ['purchase-request.create'];

  it('shows only for pending/revision rows of the requester', async () => {
    installFakeApi({ 'GET /api/v1/approvals': paged([
      row(1, 'pending'), row(2, 'revision_requested'), row(3, 'approved'), row(4, 'pending', { requestedBy: 42 }),
    ]) });
    render(withUser(<DaftarPermintaanPembelianPPIC />, perms));
    await screen.findAllByText('Detail');
    expect(screen.getAllByRole('button', { name: 'Batalkan' })).toHaveLength(2);
  });

  it('posts the reason and reloads the list', async () => {
    const api = installFakeApi({
      'GET /api/v1/approvals': paged([row(1, 'pending')]),
      'POST /api/v1/approvals/1/cancel': () => row(1, 'cancelled'),
    });
    render(withUser(<DaftarPermintaanPembelianPPIC />, perms));
    fireEvent.click(await screen.findByRole('button', { name: 'Batalkan' }));
    fireEvent.change(screen.getByLabelText(/Alasan pembatalan/), { target: { value: 'Salah input' } });
    fireEvent.click(screen.getByRole('button', { name: 'Batalkan Permintaan' }));
    await waitFor(() => expect(api.calls('POST /api/v1/approvals/1/cancel')).toHaveLength(1));
    expect(api.calls('POST /api/v1/approvals/1/cancel')[0].body).toEqual({ reason: 'Salah input' });
    await waitFor(() => expect(api.calls('GET /api/v1/approvals').length).toBeGreaterThan(1));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the server error and keeps the dialog open', async () => {
    installFakeApi({
      'GET /api/v1/approvals': paged([row(1, 'pending')]),
      'POST /api/v1/approvals/1/cancel': fail(409, 'Sudah diproses'),
    });
    render(withUser(<DaftarPermintaanPembelianPPIC />, perms));
    fireEvent.click(await screen.findByRole('button', { name: 'Batalkan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Batalkan Permintaan' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Sudah diproses');
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('shows Dibatalkan without actions', async () => {
    installFakeApi({ 'GET /api/v1/approvals': paged([row(1, 'cancelled')]) });
    render(withUser(<DaftarPermintaanPembelianPPIC />, perms));
    expect(await screen.findAllByText('Dibatalkan')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Batalkan' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull();
  });
});


describe.each([
  ['PPIC', DaftarPermintaanPembelianPPIC, '/dashboard/ppic/transaksi/permintaan-pembelian'],
  ['Gudang', PermintaanPembelianGudang, '/dashboard/gudang/transaksi/permintaan-pembelian'],
] as const)('kolom rincian permintaan %s', (_division, Component, basePath) => {
  it('menampilkan bagian, pengaju, seluruh client unik dan rincian setiap barang tanpa memotong isinya', async () => {
    const request = row(1, 'pending', { payload: {
      bagian: 'Gudang Bahan Baku', namaPemohon: 'imel', jabatan: 'Koordinator', tanggalPengajuan: '2026-11-23',
      items: [
        { namaBarang: 'Triplex 2mm', qty: 10, satuan: 'Lbr', proyek: 'PT MAJU JAYA', keterangan: 'Untuk lemari ruang rapat' },
        { namaBarang: 'Paku', qty: 2, satuan: 'Kg', proyek: ' CV SINAR ABADI ' },
        { namaBarang: 'Lem', qty: 3, satuan: 'Kaleng', proyek: 'PT MAJU JAYA' },
      ],
    } });
    const api = installFakeApi({ 'GET /api/v1/approvals': paged([request]) });
    render(withUser(<Component />, ['purchase-request.create']));
    await screen.findByText('Triplex 2mm — 10 Lbr');
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'No', 'Tanggal', 'Bagian / Sub Bagian', 'Nama Pengaju', 'Proyek / Client', 'Rincian Permintaan', 'Status Persetujuan', 'Status Pembelian', 'Aksi',
    ]);
    const cells = within(screen.getAllByRole('row')[1]).getAllByRole('cell');
    expect(cells[2].textContent).toBe('Gudang Bahan Baku');
    expect(cells[3].textContent).toBe('imel');
    expect(within(cells[4]).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['PT MAJU JAYA', 'CV SINAR ABADI']);
    expect(within(cells[5]).getByText('3 barang')).not.toBeNull();
    expect(within(cells[5]).getByText('Paku — 2 Kg')).not.toBeNull();
    expect(within(cells[5]).getByText('Lem — 3 Kaleng')).not.toBeNull();
    expect(within(cells[5]).getByText('Untuk lemari ruang rapat')).not.toBeNull();
    expect(within(cells[5]).getByText('Proyek / Client: CV SINAR ABADI')).not.toBeNull();
    expect(cells[5].className).not.toContain('truncate');
    expect(cells[8].className).toContain('text-center');
    expect(cells[8].firstElementChild?.className).toContain('justify-center');
    expect(screen.getByRole('link', { name: 'Edit' }).getAttribute('href')).toBe(`${basePath}/1/edit`);
    expect(screen.getByRole('link', { name: 'Ajukan Permintaan Pembelian' }).getAttribute('href')).toBe(`${basePath}/tambah`);
    expect(api.calls('GET /api/v1/approvals')).toHaveLength(1);
  });

  it.each([null, {}, { items: [{ namaBarang: 'Paku', qty: 0, satuan: 'Kg', proyek: ' ' }] }])('menampilkan nilai pengganti saat identitas atau proyek tidak tersedia: %j', async (payload) => {
    installFakeApi({ 'GET /api/v1/approvals': paged([row(1, 'approved', { payload })]) });
    render(withUser(<Component />, ['approval.view']));
    await screen.findByRole('button', { name: 'Detail' });
    const cells = within(screen.getAllByRole('row')[1]).getAllByRole('cell');
    expect(cells[2].textContent).toBe('-');
    expect(cells[3].textContent).toBe('-');
    expect(cells[4].textContent).toBe('-');
    if (payload && 'items' in payload) expect(cells[5].textContent).toContain('Paku — 0 Kg');
    expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Ajukan Permintaan Pembelian' })).toBeNull();
  });
});
