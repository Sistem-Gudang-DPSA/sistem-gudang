import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeApi } from '@/test/fake-api';
import * as api from './api';

afterEach(() => vi.unstubAllGlobals());

// [exported name, args, "METHOD /path", query, body]
type Row = [keyof typeof api, unknown[], string, Record<string, string>, unknown];
const rows: Row[] = [
  ['listSuppliers', [{ page: 2, search: 'a', pageSize: undefined }], 'GET /api/v1/suppliers', { page: '2', search: 'a' }, undefined],
  ['listSuppliers', [], 'GET /api/v1/suppliers', {}, undefined],
  ['createSupplier', [{ name: 'S' }], 'POST /api/v1/suppliers', {}, { name: 'S' }],
  ['updateSupplier', [3, { name: 'S2' }], 'PUT /api/v1/suppliers/3', {}, { name: 'S2' }],
  ['deleteSupplier', [3], 'DELETE /api/v1/suppliers/3', {}, undefined],
  ['getSupplierPrices', ['4', 2026], 'GET /api/v1/suppliers/4/prices', { tahun: '2026' }, undefined],
  ['saveSupplierPrices', [4, 2026, [{ itemId: 1, bulan: 2, harga: null }]], 'PUT /api/v1/suppliers/4/prices', {}, { tahun: 2026, prices: [{ itemId: 1, bulan: 2, harga: null }] }],
  ['createPurchaseOrder', [{ a: 1 }], 'POST /api/v1/purchase-orders', {}, { a: 1 }],
];

describe('purchasing api', () => {
  it('covers every export', () => {
    expect([...new Set(rows.map((r) => r[0]))].sort()).toEqual(Object.keys(api).filter((k) => typeof (api as Record<string, unknown>)[k] === 'function').sort());
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
