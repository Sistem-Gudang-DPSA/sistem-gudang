import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, fail } from '@/test/fake-api';
import { vi as viTimeout } from 'vitest';
viTimeout.setConfig({ testTimeout: 30000 });
import EditMaterial from './EditMaterial';
import { withUser } from './as-user';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: '7' }),
  useSearchParams: () => new URLSearchParams(),
}));

const detail = {
  id: 7, noSpk: 'SPK-007', client: 'PT Maju', tanggalMulai: '2026-05-01', tanggalSelesai: '2026-05-31',
  status: 'DRAFT', fileDokubah: null, totalAnggaran: 0, createdBy: 1, createdAt: '', updatedAt: '',
  totalKuota: 0, totalRealisasi: 0, totalRealisasiNilai: 0,
  bahan: [
    { kodeBarang: 'A-1', namaBahan: 'Triplex', satuan: 'lembar', hargaSatuan: 1500, kuota: 20, realisasi: 3, keterangan: 'cat' },
    { kodeBarang: 'B-2', namaBahan: 'Paku', satuan: 'kg', hargaSatuan: 0, kuota: 5, realisasi: 0, keterangan: '' },
  ],
};
const input = (l: string) => screen.getByLabelText(l) as HTMLInputElement;
const type = (l: string, v: string) => fireEvent.change(screen.getByLabelText(l), { target: { value: v } });
const OK = ['dokubah.update'];
const body = (api: ReturnType<typeof installFakeApi>) => api.calls('PUT /api/v1/dokubah/7/materials')[0].body;

async function load(extra: Record<string, unknown> = {}) {
  const api = installFakeApi({ 'GET /api/v1/dokubah/7': detail, 'PUT /api/v1/dokubah/7/materials': detail, ...extra });
  render(withUser(<EditMaterial />, OK));
  await screen.findByDisplayValue('Triplex');
  return api;
}

beforeEach(() => replace.mockClear());

describe('EditMaterial', () => {
  it('loads header and materials into inputs', async () => {
    await load();
    expect(input('Nomor SPK :').value).toBe('SPK-007');
    expect(input('Nama Client :').value).toBe('PT Maju');
    expect(input('Kode barang baris 1').value).toBe('A-1');
    expect(input('Kuota alokasi baris 1').value).toBe('20');
    expect(input('Satuan baris 1').value).toBe('lembar');
  });

  it('shows backend error when load fails', async () => {
    installFakeApi({ 'GET /api/v1/dokubah/7': fail(404, 'Dokubah tidak ada') });
    render(withUser(<EditMaterial />, OK));
    expect(await screen.findByText('Dokubah tidak ada')).toBeTruthy();
  });

  it('PUTs all materials with integer numbers, keeps harga and keterangan, then goes to view', async () => {
    const api = await load();
    type('Kuota alokasi baris 1', '30');
    type('Satuan baris 2', 'dus');
    fireEvent.click(screen.getByText('Simpan Perubahan'));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard/ppic/transaksi/dokubah/view-dokubah/7'));
    expect(body(api)).toEqual({
      bahan: [
        { kodeBarang: 'A-1', namaBahan: 'Triplex', satuan: 'lembar', kuota: 30, hargaSatuan: 1500, keterangan: 'cat' },
        { kodeBarang: 'B-2', namaBahan: 'Paku', satuan: 'dus', kuota: 5, hargaSatuan: 0, keterangan: '' },
      ],
    });
  });

  it('Tambah Baris adds a row that saves with harga 0', async () => {
    const api = await load();
    fireEvent.click(screen.getByText('Tambah Baris'));
    type('Kode barang baris 3', 'C-3');
    type('Nama dan spesifikasi bahan baris 3', 'Cat');
    type('Kuota alokasi baris 3', '7');
    fireEvent.click(screen.getByText('Simpan Perubahan'));
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect((body(api) as { bahan: unknown[] }).bahan[2]).toEqual({ kodeBarang: 'C-3', namaBahan: 'Cat', satuan: 'Pcs', kuota: 7, hargaSatuan: 0, keterangan: '' });
  });

  it('Hapus removes the row from the PUT', async () => {
    const api = await load();
    fireEvent.click(screen.getByLabelText('Hapus baris 1'));
    fireEvent.click(screen.getByText('Simpan Perubahan'));
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect((body(api) as { bahan: { kodeBarang: string }[] }).bahan.map((b) => b.kodeBarang)).toEqual(['B-2']);
  });

  it('refuses to save an emptied dokubah', async () => {
    const api = await load();
    fireEvent.click(screen.getByLabelText('Hapus baris 1'));
    fireEvent.click(screen.getByLabelText('Hapus baris 1'));
    fireEvent.click(screen.getByText('Simpan Perubahan'));
    expect(await screen.findByText('Dokubah harus punya minimal satu bahan.')).toBeTruthy();
    expect(api.calls('PUT /api/v1/dokubah/7/materials')).toHaveLength(0);
  });

  it('refuses duplicate kode barang and blank kuota, with no request', async () => {
    const api = await load();
    type('Kode barang baris 2', 'a-1');
    fireEvent.click(screen.getByText('Simpan Perubahan'));
    expect(await screen.findByText(/Kode Barang tidak boleh ada yang sama/)).toBeTruthy();
    type('Kode barang baris 2', 'B-2');
    type('Kuota alokasi baris 1', '');
    fireEvent.click(screen.getByText('Simpan Perubahan'));
    await waitFor(() => expect(screen.queryByText(/Kode Barang tidak boleh/)).toBeNull());
    expect(api.calls('PUT /api/v1/dokubah/7/materials')).toHaveLength(0);
  });

  it('shows backend error on save', async () => {
    await load({ 'PUT /api/v1/dokubah/7/materials': fail(409, 'Dokubah sudah APPROVED') });
    fireEvent.click(screen.getByText('Simpan Perubahan'));
    expect(await screen.findByText('Dokubah sudah APPROVED')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('kuota keeps digits only and has the backend limit', async () => {
    await load();
    for (const bad of ['1e5', '-3', '2.5']) {
      type('Kuota alokasi baris 1', bad);
      expect(input('Kuota alokasi baris 1').value).toBe(bad.replace(/\D/g, ''));
    }
    expect(input('Kuota alokasi baris 1').maxLength).toBe(9);
  });

  it('Batal links back to the list page', async () => {
    await load();
    expect(screen.getByText('Batal').closest('a')?.getAttribute('href')).toBe('/dashboard/ppic/transaksi/dokubah');
  });
});


describe('permissions', () => {
  it('a view-only user keeps the screen but not the actions', async () => {
    installFakeApi({ 'GET /api/v1/dokubah/7': detail });
    render(withUser(<EditMaterial />, ['dokubah.view']));
    expect(await screen.findByText(/Anda tidak punya izin/)).toBeTruthy();
    expect(screen.queryByText('Simpan Perubahan')).toBeNull();
  });

  it.each([
    ['holds the permission', ['dokubah.update'], false],
    ['is a superadmin', [], true],
  ])('a user who %s sees the actions', async (_label, perms, isSuperadmin) => {
    installFakeApi({ 'GET /api/v1/dokubah/7': detail });
    render(withUser(<EditMaterial />, perms, isSuperadmin));
    await screen.findByDisplayValue('Triplex');
    expect(screen.getByText('Simpan Perubahan')).toBeTruthy();
  });
});
