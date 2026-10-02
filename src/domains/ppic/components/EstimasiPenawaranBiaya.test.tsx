import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.setConfig({ testTimeout: 30000 });
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { fail, installFakeApi } from '@/test/fake-api';
import Estimasi from './EstimasiPenawaranBiaya';
import { withUser } from './as-user';

vi.mock('next/navigation', () => ({ useParams: () => ({ id: '3' }), useRouter: () => ({ push: vi.fn() }) }));

const KATS = ['Lembaran & Bahan Baku', 'Supplier', 'Perabotan', 'Finishing', 'Packing', 'Tenaga'];
const bahan = (over: Record<string, unknown> = {}) => ({ id: 1, namaBahan: 'Triplex', satuan: 'Lbr', panjang: 2.4, lebar: 1.2, tinggi: 0, jumlahSatuan: 1, jumlahOrder: 2.5, hargaSatuan: 1001, keterangan: 'ok', total: 0, ...over });
const detail = (status = 'DRAFT', over: Record<string, unknown> = {}) => ({
  id: 3, noOrder: 'SPH-003', namaClient: 'PT Maju', namaProyek: 'Kantor', status, tanggal: '2026-03-01', grandTotal: 0,
  pekerjaan: 'Interior', ruangan: 'Lt 2', ukuran: '3x4', jumlah: '2', tglMulaiProduksi: '2026-04-01', tglSelesaiProduksi: '2026-04-20',
  kategori: [{ kategori: 'Lembaran & Bahan Baku', subtotal: 0, bahan: [bahan()] }],
  ...over,
});

const box = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const type = (label: string, value: string) => fireEvent.change(box(label), { target: { value } });
const L = (name: string, kat = 'Lembaran & Bahan Baku', row = 1) => `${name} ${kat} baris ${row}`;
const disabled = (el: HTMLElement) => el.matches(':disabled');

beforeEach(() => vi.unstubAllGlobals());

describe('EstimasiPenawaranBiaya', () => {
  it('loads the detail, shows 6 categories in order and the prefilled values', async () => {
    const api = installFakeApi({ 'GET /api/v1/penawaran-harga/3': detail() });
    render(<Estimasi />);
    expect(await screen.findByText(/No Order SPH-003/)).toBeTruthy();
    expect(api.calls('GET /api/v1/penawaran-harga/3')).toHaveLength(1);
    const heads = Array.from(document.querySelectorAll('td.uppercase')).map((e) => e.textContent).filter((t) => KATS.includes(t ?? ''));
    expect(heads).toEqual(KATS);
    expect(box('Nama Client :').value).toBe('PT Maju');
    expect(box('Nama bahan Lembaran & Bahan Baku baris 1').value).toBe('Triplex');
    expect(box(L('Panjang')).value).toBe('2.4');
    expect(box(L('Tinggi')).value).toBe('');
    // every category has at least two rows
    expect(screen.getAllByLabelText(/^Nama bahan /)).toHaveLength(1 + 1 + 2 * 5);
    expect(screen.getByText('Draft')).toBeTruthy();
  });

  it('shows load error', async () => {
    installFakeApi({ 'GET /api/v1/penawaran-harga/3': fail(404, 'SPH hilang') });
    render(<Estimasi />);
    expect(await screen.findByText('SPH hilang')).toBeTruthy();
  });

  it('computes row total, subtotal and grand total', async () => {
    installFakeApi({ 'GET /api/v1/penawaran-harga/3': detail() });
    render(<Estimasi />);
    await screen.findByText(/No Order/);
    // 2.5 x 1001 = 2502.5 -> rounds to 2503 (id-ID formats as 2.503)
    const row = box(L('Jumlah order')).closest('tr') as HTMLElement;
    expect(row.textContent).toContain('2.503');
    expect(screen.getByText('Subtotal Lembaran & Bahan Baku').nextElementSibling?.textContent).toBe('2.503');
    expect(screen.getByText('Grand Total: Rp. 2.503')).toBeTruthy();
    type(L('Jumlah order', 'Supplier', 1), '3');
    type(L('Harga satuan', 'Supplier', 1), '1000');
    expect(screen.getByText('Subtotal Supplier').nextElementSibling?.textContent).toBe('3.000');
    expect(screen.getByText('Grand Total: Rp. 5.503')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Tambah baris Perabotan'));
    expect(screen.getAllByLabelText(/^Nama bahan Perabotan/)).toHaveLength(3);
  });

  it('restricts decimal and integer inputs', async () => {
    installFakeApi({ 'GET /api/v1/penawaran-harga/3': detail() });
    render(<Estimasi />);
    await screen.findByText(/No Order/);
    type(L('Panjang', 'Supplier'), '1a2.3.4-');
    expect(box(L('Panjang', 'Supplier')).value).toBe('12.34');
    type(L('Jumlah order', 'Supplier'), 'x1..5');
    expect(box(L('Jumlah order', 'Supplier')).value).toBe('1.5');
    type(L('Harga satuan', 'Supplier'), '1.5e3');
    expect(box(L('Harga satuan', 'Supplier')).value).toBe('153');
    expect(box(L('Harga satuan', 'Supplier')).maxLength).toBe(9);
    expect(box(L('Panjang', 'Supplier')).maxLength).toBe(13);
    type('Jumlah :', '1a2');
    expect(box('Jumlah :').value).toBe('12');
    expect(box(L('Nama bahan', 'Supplier')).maxLength).toBe(191);
    expect(box(L('Satuan', 'Supplier')).maxLength).toBe(50);
    expect(box(L('Keterangan', 'Supplier')).maxLength).toBe(500);
  });

  it('Simpan sends PUT with converted numbers, enum kategori and drops empty rows', async () => {
    const api = installFakeApi({ 'GET /api/v1/penawaran-harga/3': detail(), 'PUT /api/v1/penawaran-harga/3': detail() });
    render(<Estimasi />);
    await screen.findByText(/No Order/);
    type(L('Nama bahan', 'Tenaga', 2), 'Tukang');
    type(L('Jumlah order', 'Tenaga', 2), '1.5');
    type(L('Harga satuan', 'Tenaga', 2), '50000');
    fireEvent.click(screen.getByText('Simpan'));
    expect(await screen.findByText('Penawaran harga tersimpan.')).toBeTruthy();
    const body = api.calls('PUT /api/v1/penawaran-harga/3')[0].body as { bahan: Record<string, unknown>[] } & Record<string, unknown>;
    expect(body).toMatchObject({ namaClient: 'PT Maju', namaProyek: 'Kantor', tanggal: '2026-03-01', pekerjaan: 'Interior', jumlah: '2', tglMulaiProduksi: '2026-04-01', tglSelesaiProduksi: '2026-04-20' });
    expect(body.bahan).toEqual([
      { kategori: 'Lembaran & Bahan Baku', namaBahan: 'Triplex', satuan: 'Lbr', panjang: 2.4, lebar: 1.2, tinggi: 0, jumlahSatuan: 1, jumlahOrder: 2.5, hargaSatuan: 1001, keterangan: 'ok' },
      { kategori: 'Tenaga', namaBahan: 'Tukang', satuan: '', panjang: 0, lebar: 0, tinggi: 0, jumlahSatuan: 0, jumlahOrder: 1.5, hargaSatuan: 50000, keterangan: '' },
    ]);
    expect(api.calls('POST /api/v1/penawaran-harga/3/publish')).toHaveLength(0);
  });

  it('validates names, dates and nama bahan without calling the API', async () => {
    const api = installFakeApi({ 'GET /api/v1/penawaran-harga/3': detail() });
    render(<Estimasi />);
    await screen.findByText(/No Order/);
    const submit = async (msg: string) => {
      fireEvent.click(await screen.findByText('Simpan'));
      await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(msg));
      await screen.findByText('Simpan');
    };
    type('Nama Projek :', '  ');
    await submit('Nama client dan nama projek wajib diisi.');
    type('Nama Projek :', 'Kantor');
    type('Tgl Selesai Produksi :', '2026-03-01');
    await submit('Tgl Selesai Produksi tidak boleh lebih awal');
    type('Tgl Selesai Produksi :', '2026-04-01');
    type(L('Harga satuan', 'Supplier'), '500');
    await submit('Nama bahan wajib diisi untuk setiap baris yang dipakai.');
    expect(api.calls('PUT /api/v1/penawaran-harga/3')).toHaveLength(0);
  });

  it('Simpan with a validation error does not also show the success notice', async () => {
    installFakeApi({ 'GET /api/v1/penawaran-harga/3': detail() });
    render(<Estimasi />);
    await screen.findByText(/No Order/);
    type('Nama Client :', '');
    fireEvent.click(screen.getByText('Simpan'));
    await screen.findByRole('alert');
    await screen.findByText('Simpan');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('Publish asks for confirmation, saves then POSTs /publish and locks', async () => {
    const calls: string[] = [];
    const api = installFakeApi({
      'GET /api/v1/penawaran-harga/3': detail(),
      'PUT /api/v1/penawaran-harga/3': () => { calls.push('put'); return detail(); },
      'POST /api/v1/penawaran-harga/3/publish': () => { calls.push('publish'); return detail('PUBLISH'); },
    });
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValue(true);
    vi.stubGlobal('confirm', confirm);
    render(<Estimasi />);
    await screen.findByText(/No Order/);
    fireEvent.click(screen.getByText('Publish'));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(api.calls('PUT /api/v1/penawaran-harga/3')).toHaveLength(0);
    fireEvent.click(screen.getByText('Publish'));
    expect(await screen.findByText('Penawaran harga dipublish dan dikunci.')).toBeTruthy();
    expect(calls).toEqual(['put', 'publish']);
    expect(screen.queryByText('Publish', { selector: 'button' })).toBeNull();
    expect(screen.queryByText('Simpan')).toBeNull();
    expect(disabled(box('Nama Client :'))).toBe(true);
  });

  it('does not publish when saving fails validation', async () => {
    const api = installFakeApi({ 'GET /api/v1/penawaran-harga/3': detail() });
    vi.stubGlobal('confirm', vi.fn(() => true));
    render(<Estimasi />);
    await screen.findByText(/No Order/);
    type('Nama Client :', '');
    fireEvent.click(screen.getByText('Publish'));
    expect(screen.getByRole('alert').textContent).toContain('wajib diisi');
    expect(api.calls('POST /api/v1/penawaran-harga/3/publish')).toHaveLength(0);
  });

  it('PUBLISH status locks the form', async () => {
    installFakeApi({ 'GET /api/v1/penawaran-harga/3': detail('PUBLISH') });
    render(<Estimasi />);
    expect(await screen.findByText(/sudah dipublish, tidak bisa diubah/)).toBeTruthy();
    expect(screen.queryByText('Publish', { selector: 'button' })).toBeNull();
    expect(screen.queryByText('Simpan')).toBeNull();
    for (const el of [box('Nama Client :'), box(L('Nama bahan')), box(L('Harga satuan', 'Tenaga', 2))]) expect(disabled(el)).toBe(true);
    expect(disabled(screen.getByLabelText('Tambah baris Supplier'))).toBe(true);
  });

  it.each([
    ['PUT', 409, 'Sudah dipublish'],
    ['PUT', 400, 'Nama bahan kosong'],
  ])('shows backend %s error %i on Simpan', async (_m, status, msg) => {
    installFakeApi({ 'GET /api/v1/penawaran-harga/3': detail(), 'PUT /api/v1/penawaran-harga/3': fail(status, msg) });
    render(<Estimasi />);
    await screen.findByText(/No Order/);
    fireEvent.click(screen.getByText('Simpan'));
    expect((await screen.findByRole('alert')).textContent).toBe(msg);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows a 409 from /publish and stays unlocked', async () => {
    installFakeApi({
      'GET /api/v1/penawaran-harga/3': detail(),
      'PUT /api/v1/penawaran-harga/3': detail(),
      'POST /api/v1/penawaran-harga/3/publish': fail(409, 'Penawaran sudah dipublish'),
    });
    vi.stubGlobal('confirm', vi.fn(() => true));
    render(<Estimasi />);
    await screen.findByText(/No Order/);
    fireEvent.click(screen.getByText('Publish'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Penawaran sudah dipublish'));
    expect(screen.getByText('Simpan')).toBeTruthy();
    expect(disabled(box('Nama Client :'))).toBe(false);
  });
});

describe('permissions', () => {
  const open = async (permissions: string[], isSuperadmin = false) => {
    installFakeApi({ 'GET /api/v1/penawaran-harga/3': detail() });
    render(withUser(<Estimasi />, permissions, isSuperadmin));
    await screen.findByText(/No Order/);
  };

  it('a view-only user sees the form read-only with a note and no Simpan/Publish', async () => {
    await open(['penawaran-harga.view']);
    expect(screen.getByText(/Anda tidak punya izin untuk mengubah/)).toBeTruthy();
    expect(screen.queryByText('Simpan')).toBeNull();
    expect(screen.queryByText('Publish', { selector: 'button' })).toBeNull();
    expect(disabled(box('Nama Client :'))).toBe(true);
  });

  it('update without publish sees Simpan only', async () => {
    await open(['penawaran-harga.update']);
    expect(screen.getByText('Simpan')).toBeTruthy();
    expect(screen.queryByText('Publish', { selector: 'button' })).toBeNull();
    expect(disabled(box('Nama Client :'))).toBe(false);
  });

  it.each([
    ['holds update and publish', ['penawaran-harga.update', 'penawaran-harga.publish'], false],
    ['is a superadmin', [], true],
  ])('a user who %s sees Simpan and Publish', async (_label, perms, isSuperadmin) => {
    await open(perms, isSuperadmin);
    expect(screen.getByText('Simpan')).toBeTruthy();
    expect(screen.getByText('Publish', { selector: 'button' })).toBeTruthy();
  });
});
