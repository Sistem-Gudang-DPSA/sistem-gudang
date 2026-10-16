import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeApi } from '@/test/fake-api';
import { getTrackingSpk, listTrackingSpk } from './api';

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
});
