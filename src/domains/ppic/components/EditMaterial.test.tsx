import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, fail } from '@/test/fake-api';
import { vi as viTimeout } from 'vitest';
viTimeout.setConfig({ testTimeout: 30000 });
import EditMaterial from './EditMaterial';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: '7' }),
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

async function load(extra: Record<string, unknown> = {}) {
  const api = installFakeApi({ 'GET /api/v1/dokubah/7': detail, 'PUT /api/v1/dokubah/7/materials': detail, ...extra });
  render(<EditMaterial />);
  await screen.findByText('Triplex');
  return api;
}

beforeEach(() => replace.mockClear());

describe('EditMaterial', () => {
  it('loads header and materials into inputs', async () => {
    await load();
    expect(input('Nomor SPK :').value).toBe('SPK-007');
    expect(input('Nama Client :').value).toBe('PT Maju');
    expect(input('Kuota alokasi A-1').value).toBe('20');
    expect(input('Estimasi harga A-1').value).toBe('1500');
    expect(input('Keterangan A-1').value).toBe('cat');
  });

  it('shows backend error when load fails', async () => {
    installFakeApi({ 'GET /api/v1/dokubah/7': fail(404, 'Dokubah tidak ada') });
    render(<EditMaterial />);
    expect(await screen.findByText('Dokubah tidak ada')).toBeTruthy();
  });

  it('PUTs all materials with integer numbers and trimmed keterangan, then goes to view', async () => {
    const api = await load();
    type('Kuota alokasi A-1', '30');
    type('Estimasi harga B-2', '2500');
    type('Keterangan B-2', '  baru ');
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard/ppic/transaksi/dokubah/view-dokubah/7'));
    expect(api.calls('PUT /api/v1/dokubah/7/materials')[0].body).toEqual({
      bahan: [
        { kodeBarang: 'A-1', namaBahan: 'Triplex', satuan: 'lembar', kuota: 30, hargaSatuan: 1500, keterangan: 'cat' },
        { kodeBarang: 'B-2', namaBahan: 'Paku', satuan: 'kg', kuota: 5, hargaSatuan: 2500, keterangan: 'baru' },
      ],
    });
  });

  it('Hapus Material removes the row from the PUT', async () => {
    const api = await load();
    fireEvent.click(screen.getByLabelText('Hapus material A-1'));
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(replace).toHaveBeenCalled());
    const body = api.calls('PUT /api/v1/dokubah/7/materials')[0].body as { bahan: { kodeBarang: string }[] };
    expect(body.bahan.map((b) => b.kodeBarang)).toEqual(['B-2']);
  });

  it('refuses to save an emptied dokubah', async () => {
    const api = await load();
    fireEvent.click(screen.getByLabelText('Hapus material A-1'));
    fireEvent.click(screen.getByLabelText('Hapus material B-2'));
    expect(screen.getByText('Tidak ada material pada Dokubah ini.')).toBeTruthy();
    fireEvent.click(screen.getByText('Simpan'));
    expect(await screen.findByText('Dokubah harus punya minimal satu bahan.')).toBeTruthy();
    expect(api.calls('PUT /api/v1/dokubah/7/materials')).toHaveLength(0);
  });

  it('blank kuota or harga is rejected with a message and no request', async () => {
    const api = await load();
    type('Kuota alokasi A-1', '');
    fireEvent.click(screen.getByText('Simpan'));
    expect(await screen.findByText(/wajib diisi dengan angka 0 atau lebih/)).toBeTruthy();
    expect(api.calls('PUT /api/v1/dokubah/7/materials')).toHaveLength(0);
  });

  it('shows backend error on save', async () => {
    await load({ 'PUT /api/v1/dokubah/7/materials': fail(409, 'Dokubah sudah APPROVED') });
    fireEvent.click(screen.getByText('Simpan'));
    expect(await screen.findByText('Dokubah sudah APPROVED')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('integer inputs keep digits only; text limits', async () => {
    await load();
    for (const f of ['Kuota alokasi A-1', 'Estimasi harga A-1']) {
      for (const bad of ['1e5', '-3', '2.5']) {
        type(f, bad);
        expect(input(f).value).toBe(bad.replace(/\D/g, ''));
      }
      expect(input(f).maxLength).toBe(9);
    }
    expect(input('Keterangan A-1').maxLength).toBe(500);
  });

  it('Batal links back to the view page', async () => {
    await load();
    expect(screen.getByText('Batal').closest('a')?.getAttribute('href')).toBe('/dashboard/ppic/transaksi/dokubah/view-dokubah/7');
  });
});
