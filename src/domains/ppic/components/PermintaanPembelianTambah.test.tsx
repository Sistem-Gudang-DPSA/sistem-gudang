import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { fail, installFakeApi, paged } from '@/test/fake-api';
import Form from './PermintaanPembelianTambah';
import type { PermintaanPembelian } from '../data/pembelian';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back: vi.fn() }) }));
const basePath = '/dashboard/gudang/transaksi/permintaan-pembelian';
const existing: PermintaanPembelian = {
  id: 7, tanggal: '2026-11-09', permintaan: 'Bahan', status: 'Belum Disetujui', statusApi: 'pending', bagian: 'Gudang', nama: 'Fauzi', jabatan: 'Staff', periode: 'November 2026', catatan: 'Penting',
  barang: [{ namaBarang: 'Paku', qty: 5, satuan: 'Kg', proyek: 'Hotel', noSpk: 'SPK-1', supplier: 'PT Bahan', tanggal: '2026-11-09', keterangan: 'Segera', deadlineTanggal: '2026-11-20' }],
};
const routes = {
  'GET /api/v1/items': paged([]),
  'GET /api/v1/tracking/clients': [{ client: 'Client' }],
  'GET /api/v1/tracking/spk': [{ noSpk: 'SPK-1', client: 'Client' }],
  'GET /api/v1/tracking/spk/SPK-1': { noSpk: 'SPK-1', client: 'Client', products: [{ name: 'Hotel' }] },
};
const change = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } });
beforeEach(() => push.mockReset());

describe('purchase request form', () => {
  it('submits the photo fields in a new request, omitting blank rows', async () => {
    const api = installFakeApi({ ...routes, 'POST /api/v1/approvals': { id: 8 } });
    render(<Form basePath={basePath} />);
    change('Bagian / Sub Bagian', 'Gudang');
    change('Nama pemohon', 'Fauzi');
    change('Jabatan', 'Staff');
    change('Tanggal Pengajuan', '2026-11-09');
    change('Periode', 'November 2026');
    change('Nama Barang baris 1', 'Paku');
    change('QTY baris 1', '5');
    change('Satuan baris 1', 'Kg');
    change('Tanggal baris 1', '2026-11-09');
    change('Supplier baris 1', 'PT Bahan');
    change('Proyek baris 1', 'Hotel');
    change('Keterangan baris 1', 'Segera');
    change('Deadline baris 1', '2026-11-20');
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['No', 'Tanggal', 'Supplier', 'Nama Barang', 'QTY', 'SAT', 'Proyek', 'Keterangan', 'Deadline Tanggal']);
    expect(screen.queryByRole('button', { name: 'Client' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'No SPK' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ajukan Permintaan Pembelian' }));
    await waitFor(() => expect(api.calls('POST /api/v1/approvals')).toHaveLength(1));
    expect(api.calls('POST /api/v1/approvals')[0].body).toEqual({ type: 'purchase-request', payload: {
      bagian: 'Gudang', namaPemohon: 'Fauzi', jabatan: 'Staff', tanggalPengajuan: '2026-11-09', periode: 'November 2026', items: existing.barang.map((item) => ({ ...item, noSpk: '' })),
    } });
    await waitFor(() => expect(push).toHaveBeenCalledWith(basePath));
  });

  it('edits the same request, preserves fields, and returns to the Gudang list', async () => {
    const api = installFakeApi({ ...routes, 'PUT /api/v1/approvals/7': null });
    render(<Form permintaan={existing} basePath={basePath} editing />);
    change('Keterangan baris 1', 'Tambahan');
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    await waitFor(() => expect(api.calls('PUT /api/v1/approvals/7')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/approvals/7')[0].body).toMatchObject({ payload: { periode: 'November 2026', notes: 'Penting', items: [{ ...existing.barang[0], keterangan: 'Tambahan' }] } });
    expect(api.calls('POST /api/v1/approvals')).toHaveLength(0);
    await waitFor(() => expect(push).toHaveBeenCalledWith(basePath));
  });

  it('removes an item from the edited request without submitting its cleared fields', async () => {
    const api = installFakeApi({ ...routes, 'PUT /api/v1/approvals/7': null });
    render(<Form permintaan={{ ...existing, barang: [...existing.barang, { ...existing.barang[0], namaBarang: 'Lem' }] }} basePath={basePath} editing />);
    fireEvent.click(screen.getByRole('button', { name: 'Hapus baris 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    await waitFor(() => expect(api.calls('PUT /api/v1/approvals/7')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/approvals/7')[0].body).toMatchObject({ payload: { items: [{ namaBarang: 'Lem' }] } });
  });

  it('retains changes and displays the server error when saving fails', async () => {
    installFakeApi({ ...routes, 'PUT /api/v1/approvals/7': fail(400, 'Permintaan sudah disetujui') });
    render(<Form permintaan={existing} basePath={basePath} editing />);
    change('Supplier baris 1', 'Supplier baru');
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    expect(await screen.findByText('Permintaan sudah disetujui')).toBeTruthy();
    expect((screen.getByLabelText('Supplier baris 1') as HTMLInputElement).value).toBe('Supplier baru');
    expect(push).not.toHaveBeenCalled();
  });
});
