import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeApi, paged } from '@/test/fake-api';
import * as api from './api';

afterEach(() => vi.unstubAllGlobals());

// [exported name, args, "METHOD /path", query, body]
type Row = [keyof typeof api, unknown[], string, Record<string, string>, unknown];
const rows: Row[] = [
  ['listDokubah', [{ page: 1, status: 'PENDING' }], 'GET /api/v1/dokubah', { page: '1', status: 'PENDING' }, undefined],
  ['listDokubahRows', [{ page: 2 }], 'GET /api/v1/dokubah', { page: '2' }, undefined],
  ['listTrackingSpk', ['spk'], 'GET /api/v1/tracking/spk', { search: 'spk' }, undefined],
  ['listTrackingSpk', [], 'GET /api/v1/tracking/spk', {}, undefined],
  ['getDokubah', [3], 'GET /api/v1/dokubah/3', {}, undefined],
  ['createDokubah', [{ noSpk: 'S' }], 'POST /api/v1/dokubah', {}, { noSpk: 'S' }],
  ['replaceDokubahMaterials', [3, [{ kodeBarang: 'K' }]], 'PUT /api/v1/dokubah/3/materials', {}, { bahan: [{ kodeBarang: 'K' }] }],
  ['submitDokubah', [3], 'POST /api/v1/dokubah/3/submit', {}, undefined],
  ['approveDokubah', [3], 'POST /api/v1/dokubah/3/approve', {}, undefined],
  ['rejectDokubah', [3, 'rusak'], 'POST /api/v1/dokubah/3/reject', {}, { note: 'rusak' }],
  ['listSpkInternal', [{ page: 1 }], 'GET /api/v1/spk-internal', { page: '1' }, undefined],
  ['createSpkInternal', [{ x: 1 }], 'POST /api/v1/spk-internal', {}, { x: 1 }],
  ['allocateSpkInternal', [6, 10], 'POST /api/v1/spk-internal/6/allocate', {}, { jumlah: 10 }],
  ['listTrackingPic', [], 'GET /api/v1/tracking/pic', {}, undefined],
  ['listMutations', [{ page: 1 }], 'GET /api/v1/reports/mutations', { page: '1' }, undefined],
  ['getStockOpnameSummary', [{ month: 3, year: 2026 }], 'GET /api/v1/reports/stock-opname-summary', { month: '3', year: '2026' }, undefined],
  ['listApprovals', [{ type: 'purchase-request', pageSize: 100 }], 'GET /api/v1/approvals', { type: 'purchase-request', pageSize: '100' }, undefined],
  ['createPurchaseRequest', [{ notes: 'n' }], 'POST /api/v1/approvals', {}, { type: 'purchase-request', payload: { notes: 'n' } }],
  ['getApprovalDetail', ['8'], 'GET /api/v1/approvals/8', {}, undefined],
  ['resubmitApproval', [8, { notes: 'n' }], 'POST /api/v1/approvals/8/resubmit', {}, { payload: { notes: 'n' } }],
  ['approveApproval', [8], 'POST /api/v1/approvals/8/approve', {}, {}],
  ['approveApproval', [8, 'ok'], 'POST /api/v1/approvals/8/approve', {}, { note: 'ok' }],
  ['rejectApproval', [8, 'no'], 'POST /api/v1/approvals/8/reject', {}, { note: 'no' }],
  ['requestApprovalRevision', [8, 'fix'], 'POST /api/v1/approvals/8/request-revision', {}, { note: 'fix' }],
  ['listPenawaran', [{ status: 'DRAFT', page: 1 }], 'GET /api/v1/penawaran-harga', { status: 'DRAFT', page: '1' }, undefined],
  ['createPenawaran', [{ namaClient: 'C' }], 'POST /api/v1/penawaran-harga', {}, { namaClient: 'C' }],
  ['getPenawaran', ['2'], 'GET /api/v1/penawaran-harga/2', {}, undefined],
  ['updatePenawaran', [2, { namaClient: 'D' }], 'PUT /api/v1/penawaran-harga/2', {}, { namaClient: 'D' }],
  ['publishPenawaran', [2], 'POST /api/v1/penawaran-harga/2/publish', {}, undefined],
];

describe('ppic api', () => {
  it('covers every export', () => {
    expect([...new Set(rows.map((r) => r[0]))].sort()).toEqual(Object.keys(api).filter((k) => typeof (api as Record<string, unknown>)[k] === 'function' && k !== 'statusToApi').sort());
  });
  it.each(rows)('%s', async (name, args, key, query, body) => {
    const fake = installFakeApi();
    await (api[name] as (...a: unknown[]) => Promise<unknown>)(...args).catch(() => {});
    const calls = fake.calls(key);
    expect(calls).toHaveLength(1);
    expect(Object.fromEntries(calls[0].query)).toEqual(query);
    expect(calls[0].body).toEqual(body);
  });
});

describe('ppic dokubah mapping', () => {
  it('status maps', () => {
    expect(api.STATUS_TO_UI.PENDING).toBe('Pending');
    expect(api.statusToApi('Approved')).toBe('APPROVED');
  });
  it('listDokubah maps rows with empty bahan and optional fields', async () => {
    installFakeApi({ 'GET /api/v1/dokubah': paged([{ id: 1, noSpk: 'S', client: 'C', tanggalMulai: 'a', tanggalSelesai: 'b', status: 'DRAFT', fileDokubah: null, penanggungJawab: null, totalAnggaran: 5 }]) });
    const res = await api.listDokubah();
    expect(res.total).toBe(1);
    expect(res.rows[0]).toMatchObject({ status: 'Draft', fileDokubah: undefined, penanggungJawab: undefined, bahan: [] });
  });
  it('getDokubah keeps bahan from detail', async () => {
    installFakeApi({ 'GET /api/v1/dokubah/1': { id: 1, noSpk: 'S', client: 'C', tanggalMulai: 'a', tanggalSelesai: 'b', status: 'APPROVED', totalAnggaran: 5, bahan: [{ kodeBarang: 'K' }] } });
    const d = await api.getDokubah(1);
    expect(d.status).toBe('Approved');
    expect(d.bahan).toEqual([{ kodeBarang: 'K' }]);
    expect(d.riwayat).toEqual([]);
  });
  it('maps riwayat and the submit/approve/reject responses', async () => {
    const riwayat = [{ aksi: 'REJECTED', catatan: 'x', actorName: 'A', createdAt: 't' }];
    const row = { id: 1, status: 'REJECTED', bahan: [], riwayat };
    installFakeApi({ 'GET /api/v1/dokubah/1': row, 'POST /api/v1/dokubah/1/submit': row, 'POST /api/v1/dokubah/1/approve': row, 'POST /api/v1/dokubah/1/reject': row });
    for (const d of [await api.getDokubah(1), await api.submitDokubah(1), await api.approveDokubah(1), await api.rejectDokubah(1, 'x')]) {
      expect(d).toMatchObject({ status: 'Rejected', riwayat });
    }
  });
});
