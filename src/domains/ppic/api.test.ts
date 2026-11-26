import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeApi, paged } from '@/test/fake-api';
import { getApprovalDetail, getTrackingSpk, listApprovals, listDokubahBahanBySpk, listTrackingSpk, normalizeApprovalPayload } from './api';

afterEach(() => vi.unstubAllGlobals());

describe('ppic api (tracking SPK)', () => {
  it('listTrackingSpk sends only the search and limit that are given', async () => {
    const fake = installFakeApi({ 'GET /api/v1/tracking/spk': [] });
    await listTrackingSpk();
    await listTrackingSpk('maju', 50);
    const [plain, filtered] = fake.calls('GET /api/v1/tracking/spk');
    expect(Object.fromEntries(plain.query)).toEqual({});
    expect(Object.fromEntries(filtered.query)).toEqual({ search: 'maju', limit: '50' });
  });

  it('getTrackingSpk encodes the SPK number in the path', async () => {
    const fake = installFakeApi({ 'GET /api/v1/tracking/spk/SPK%2F2026%2F01': { noSpk: 'SPK/2026/01', client: 'PT Maju', projectName: 'Lemari', products: [] } });
    const spk = await getTrackingSpk('SPK/2026/01');
    expect(fake.all()[0].path).toBe('/api/v1/tracking/spk/SPK%2F2026%2F01');
    expect(spk.client).toBe('PT Maju');
  });

  it('listDokubahBahanBySpk repeats the spk param', async () => {
    const fake = installFakeApi({ 'GET /api/v1/dokubah/bahan-by-spk': [] });
    await listDokubahBahanBySpk(['A/1', 'B']);
    expect(fake.all()[0].query.getAll('spk')).toEqual(['A/1', 'B']);
  });
});

describe('approval payload stored as a JSON string', () => {
  const payload = { bagian: 'Gudang', namaPemohon: 'Budi', jabatan: 'Staff', tanggalPengajuan: '2026-11-26', items: [{ namaBarang: 'Triplex', qty: 2, satuan: 'lbr', proyek: 'Proyek A' }] };

  it('parses the list row payload', async () => {
    installFakeApi({ 'GET /api/v1/approvals': paged([{ id: 7, type: 'purchase-request', requestedBy: 1, requestedByDomainId: 1, currentStepOrder: 2, cycle: 1, status: 'pending', createdAt: '2026-11-26T00:00:00Z', payload: JSON.stringify(payload) }]) });
    const res = await listApprovals({ type: 'purchase-request' });
    expect(res.rows[0].payload).toEqual(payload);
    expect(res.rows[0].payload?.items?.[0].namaBarang).toBe('Triplex');
  });

  it('parses the detail payload and keeps a broken string null', async () => {
    installFakeApi({
      'GET /api/v1/approvals/7': { request: { id: 7, type: 'purchase-request', requestedBy: 1, requestedByDomainId: 1, currentStepOrder: 2, cycle: 1, status: 'pending', createdAt: '2026-11-26T00:00:00Z', payload: JSON.stringify(payload) }, actions: [] },
      'GET /api/v1/approvals/8': { request: { id: 8, type: 'purchase-request', requestedBy: 1, requestedByDomainId: 1, currentStepOrder: 2, cycle: 1, status: 'pending', createdAt: '2026-11-26T00:00:00Z', payload: '{rusak' }, actions: [] },
    });
    expect((await getApprovalDetail(7)).request.payload?.bagian).toBe('Gudang');
    expect((await getApprovalDetail(8)).request.payload).toBeNull();
    expect(normalizeApprovalPayload('')).toBeNull();
  });
});
