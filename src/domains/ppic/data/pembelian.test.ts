import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeApi, paged } from '@/test/fake-api';
import { AKSI_LABEL, fetchPermintaan, fetchPermintaanList, lihatPermintaanPath, revisiPath } from './pembelian';

afterEach(() => vi.unstubAllGlobals());

const req = (over: Record<string, unknown> = {}) => ({
  id: 1, type: 'purchase-request', requestedBy: 1, requestedByDomainId: 1, currentStepOrder: 1, cycle: 1,
  status: 'pending', createdAt: '2026-02-03T08:00:00Z',
  payload: { bagian: 'Produksi', namaPemohon: 'Budi', jabatan: 'Kepala', tanggalPengajuan: '2026-02-10', notes: 'Urgent', items: [{ namaBarang: 'Triplex', qty: 2, satuan: 'lbr', proyek: 'P', noSpk: 'S1' }] },
  ...over,
});

describe('ppic pembelian', () => {
  it('lists with purchase-request filter and maps fields', async () => {
    const api = installFakeApi({ 'GET /api/v1/approvals': paged([req()]) });
    const [p] = await fetchPermintaanList();
    expect(Object.fromEntries(api.calls('GET /api/v1/approvals')[0].query)).toEqual({ pageSize: '100', type: 'purchase-request' });
    expect(p).toMatchObject({ id: 1, tanggal: '2026-02-10', permintaan: 'Urgent', status: 'Belum Disetujui', statusApi: 'pending', bagian: 'Produksi', nama: 'Budi', jabatan: 'Kepala', catatan: 'Urgent' });
    expect(p.barang).toHaveLength(1);
  });

  it.each([
    ['pending', 'Belum Disetujui'], ['approved', 'Disetujui'], ['revision_requested', 'Perlu Revisi'], ['rejected', 'Ditolak'],
  ])('status %s -> %s', async (s, label) => {
    installFakeApi({ 'GET /api/v1/approvals': paged([req({ status: s })]) });
    expect((await fetchPermintaanList())[0].status).toBe(label);
  });

  it('falls back to createdAt, generated title and dashes when payload is thin', async () => {
    installFakeApi({ 'GET /api/v1/approvals': paged([req({ payload: { bagian: 'Gudang', items: [{}, {}] } }), req({ id: 2, payload: null })]) });
    const [a, b] = await fetchPermintaanList();
    expect(a.tanggal).toBe('2026-02-03');
    expect(a.permintaan).toBe('Gudang - 2 barang');
    expect(a.nama).toBe('-');
    expect(a.catatan).toBeUndefined();
    expect(b).toMatchObject({ bagian: '-', jabatan: '-', barang: [], permintaan: '- - 0 barang' });
  });

  it('fetchPermintaan adds riwayat', async () => {
    const actions = [{ id: 1, approvalRequestId: 1, action: 'approved' }];
    const api = installFakeApi({ 'GET /api/v1/approvals/7': { request: req({ id: 7, status: 'approved' }), actions } });
    const p = await fetchPermintaan('7');
    expect(api.calls('GET /api/v1/approvals/7')).toHaveLength(1);
    expect(p.riwayat).toEqual(actions);
    expect(p.status).toBe('Disetujui');
  });

  it('paths and labels', () => {
    expect(lihatPermintaanPath(2)).toBe('/dashboard/ppic/laporan/rekap-pembelian/permintaan-pembelian/2');
    expect(revisiPath(2)).toBe('/dashboard/ppic/transaksi/permintaan-pembelian/2/revisi');
    expect(AKSI_LABEL.revision_requested).toBe('Minta Revisi');
  });
});
