import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, fail } from '@/test/fake-api';
import { vi as viTimeout } from 'vitest';
viTimeout.setConfig({ testTimeout: 30000 });
import BuatDokubah from './BuatDokubah';
import { withUser } from './as-user';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }) }));

const spk = [{ noSpk: 'SPK-001', client: 'PT Maju' }, { noSpk: 'SPK-002', client: 'PT Mundur' }];
const val = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

async function renderForm(extra: Record<string, unknown> = {}) {
  const api = installFakeApi({ 'GET /api/v1/tracking/spk': spk, 'POST /api/v1/dokubah': { id: 9, status: 'DRAFT', bahan: [] }, ...extra });
  render(<BuatDokubah />);
  return api;
}

const fillHeader = async (mulai = '2026-05-01', selesai = '2026-05-31') => {
  fireEvent.click(screen.getByLabelText('Pilih SPK / Proyek'));
  fireEvent.click(await screen.findByRole('option', { name: 'SPK-001' }));
  type('Tanggal Mulai', mulai);
  type('Tanggal Selesai', selesai);
};
const fillRow = (n: number, kode: string, nama: string, kuota: string, satuan = 'lembar') => {
  type(`Kode barang baris ${n}`, kode);
  type(`Nama dan spesifikasi bahan baris ${n}`, nama);
  type(`Kuota alokasi baris ${n}`, kuota);
  type(`Satuan baris ${n}`, satuan);
};

beforeEach(() => replace.mockClear());

describe('BuatDokubah', () => {
  it('fills the client from the chosen SPK and lists SPKs', async () => {
    await renderForm();
    await fillHeader();
    expect(val('Nama Client').value).toBe('PT Maju');
    fireEvent.click(screen.getByLabelText('Pilih SPK / Proyek'));
    expect(await screen.findByRole('option', { name: 'SPK-002' })).toBeTruthy();
  });

  it('shows the tracking load error in the SPK placeholder', async () => {
    installFakeApi({ 'GET /api/v1/tracking/spk': fail(500, 'Tracking down') });
    render(<BuatDokubah />);
    expect(await screen.findByText('Tracking down')).toBeTruthy();
  });

  it('Simpan Draft posts DRAFT with integer kuota, dropping blank rows', async () => {
    const api = await renderForm();
    await fillHeader();
    fillRow(1, ' BRG-1 ', ' Triplex 18mm ', '25');
    fillRow(3, 'BRG-2', 'Paku', '0', 'kg');
    fireEvent.click(screen.getByText('Simpan Draft'));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard/ppic/transaksi/dokubah'));
    expect(api.calls('POST /api/v1/dokubah')[0].body).toEqual({
      noSpk: 'SPK-001', tanggalMulai: '2026-05-01', tanggalSelesai: '2026-05-31', status: 'DRAFT',
      bahan: [
        { kodeBarang: 'BRG-1', namaBahan: 'Triplex 18mm', satuan: 'lembar', hargaSatuan: 0, kuota: 25, keterangan: '' },
        { kodeBarang: 'BRG-2', namaBahan: 'Paku', satuan: 'kg', hargaSatuan: 0, kuota: 0, keterangan: '' },
      ],
    });
  });

  it('Draft can be saved without any material', async () => {
    const api = await renderForm();
    await fillHeader();
    fireEvent.click(screen.getByText('Simpan Draft'));
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect((api.calls('POST /api/v1/dokubah')[0].body as { bahan: unknown[] }).bahan).toEqual([]);
  });

  it('Rilis posts PENDING', async () => {
    const api = await renderForm();
    await fillHeader();
    fillRow(1, 'BRG-1', 'Triplex', '5');
    fireEvent.click(screen.getByText('Rilis'));
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect((api.calls('POST /api/v1/dokubah')[0].body as { status: string }).status).toBe('PENDING');
  });

  it('Rilis requires at least one material', async () => {
    const api = await renderForm();
    await fillHeader();
    fireEvent.click(screen.getByText('Rilis'));
    expect(await screen.findByText('Isi minimal satu bahan sebelum Rilis.')).toBeTruthy();
    expect(api.calls('POST /api/v1/dokubah')).toHaveLength(0);
  });

  it('requires SPK and both dates', async () => {
    const api = await renderForm();
    fireEvent.click(screen.getByText('Simpan Draft'));
    expect(await screen.findByText('SPK / Proyek, Tanggal Mulai, dan Tanggal Selesai wajib diisi.')).toBeTruthy();
    expect(api.calls('POST /api/v1/dokubah')).toHaveLength(0);
  });

  it('rejects selesai before mulai', async () => {
    const api = await renderForm();
    await fillHeader('2026-05-10', '2026-05-01');
    fireEvent.click(screen.getByText('Simpan Draft'));
    expect(await screen.findByText('Tanggal Selesai tidak boleh sebelum Tanggal Mulai.')).toBeTruthy();
    expect(api.calls('POST /api/v1/dokubah')).toHaveLength(0);
  });

  it('accepts same-day start and end', async () => {
    const api = await renderForm();
    await fillHeader('2026-05-10', '2026-05-10');
    fireEvent.click(screen.getByText('Simpan Draft'));
    await waitFor(() => expect(api.calls('POST /api/v1/dokubah')).toHaveLength(1));
  });

  it('a filled row needs kode, nama and kuota', async () => {
    const api = await renderForm();
    await fillHeader();
    type('Kode barang baris 1', 'BRG-1');
    fireEvent.click(screen.getByText('Simpan Draft'));
    expect(await screen.findByText(/Setiap baris bahan yang diisi wajib punya/)).toBeTruthy();
    expect(api.calls('POST /api/v1/dokubah')).toHaveLength(0);
  });

  it('rejects duplicate kode barang (case-insensitive)', async () => {
    const api = await renderForm();
    await fillHeader();
    fillRow(1, 'BRG-1', 'A', '1');
    fillRow(2, 'brg-1', 'B', '2');
    fireEvent.click(screen.getByText('Simpan Draft'));
    expect(await screen.findByText('Kode Barang tidak boleh sama dalam satu Dokubah.')).toBeTruthy();
    expect(api.calls('POST /api/v1/dokubah')).toHaveLength(0);
  });

  it('displays a backend error and stays on the page', async () => {
    await renderForm({ 'POST /api/v1/dokubah': fail(409, 'No. SPK sudah punya Dokubah') });
    await fillHeader();
    fireEvent.click(screen.getByText('Simpan Draft'));
    expect(await screen.findByText('No. SPK sudah punya Dokubah')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('kuota keeps digits only', async () => {
    await renderForm();
    for (const bad of ['1e5', '-3', '2.5', 'abc4+']) {
      type('Kuota alokasi baris 1', bad);
      expect(val('Kuota alokasi baris 1').value).toBe(bad.replace(/\D/g, ''));
    }
    expect(val('Kuota alokasi baris 1').maxLength).toBe(9);
  });

  it('text inputs carry backend maxLength', async () => {
    await renderForm();
    expect(val('Kode barang baris 1').maxLength).toBe(191);
    expect(val('Nama dan spesifikasi bahan baris 1').maxLength).toBe(191);
    expect(val('Satuan baris 1').maxLength).toBe(50);
  });

  it('Tambah Baris adds a row; end date has min = start date', async () => {
    await renderForm();
    expect(screen.queryByLabelText('Kode barang baris 6')).toBeNull();
    fireEvent.click(screen.getByText('Tambah Baris'));
    expect(screen.getByLabelText('Kode barang baris 6')).toBeTruthy();
    type('Tanggal Mulai', '2026-05-01');
    expect(val('Tanggal Selesai').min).toBe('2026-05-01');
  });

  it('shows sisa kuota with unit for a filled row', async () => {
    await renderForm();
    fillRow(1, 'B', 'N', '1500', 'kg');
    expect(screen.getAllByText('1.500 kg').length).toBe(1);
    expect(screen.getAllByText('0 kg').length).toBe(1);
  });
});


describe('permissions', () => {
  it('a view-only user keeps the screen but not the actions', async () => {
    installFakeApi({ 'GET /api/v1/tracking/spk': spk });
    render(withUser(<BuatDokubah />, ['dokubah.view']));
    await screen.findByText(/Anda tidak punya izin|Simpan Draft/);
    expect(screen.getByText(/Anda tidak punya izin/)).toBeTruthy();
    expect(screen.queryByText('Simpan Draft')).toBeNull();
  });

  it.each([
    ['holds the permission', ['dokubah.create'], false],
    ['is a superadmin', [], true],
  ])('a user who %s sees the actions', async (_label, perms, isSuperadmin) => {
    installFakeApi({ 'GET /api/v1/tracking/spk': spk });
    render(withUser(<BuatDokubah />, perms, isSuperadmin));
    await screen.findByText(/Anda tidak punya izin|Simpan Draft/);
    expect(screen.getByText('Simpan Draft')).toBeTruthy();
  });
});
