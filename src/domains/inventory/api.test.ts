import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeApi } from '@/test/fake-api';
import * as api from './api';

afterEach(() => vi.unstubAllGlobals());

// [exported name, args, "METHOD /path", query, body]
type Row = [keyof typeof api, unknown[], string, Record<string, string>, unknown];
const rows: Row[] = [
  ['listItems', [{ page: 2, search: 'tri' }], 'GET /api/v1/items', { page: '2', search: 'tri' }, undefined],
  ['getItem', [1], 'GET /api/v1/items/1', {}, undefined],
  ['createItem', [{ name: 'I' }], 'POST /api/v1/items', {}, { name: 'I' }],
  ['updateItem', [1, { name: 'J' }], 'PUT /api/v1/items/1', {}, { name: 'J' }],
  ['deleteItem', [1], 'DELETE /api/v1/items/1', {}, undefined],
  ['listUnassignedItems', [], 'GET /api/v1/items/unassigned', {}, undefined],
  ['suggestItemCode', [1, 9], 'GET /api/v1/items/1/suggest-code', { locationId: '9' }, undefined],
  ['assignItemLocation', [1, { code: 'A1', locationId: 9 }], 'PUT /api/v1/items/1/assign-location', {}, { code: 'A1', locationId: 9 }],
  ['adjustItemStock', [1, { delta: -2, reason: 'rusak' }], 'PATCH /api/v1/items/1/stock', {}, { delta: -2, reason: 'rusak' }],
  ['listLocations', [{ page: 1 }], 'GET /api/v1/locations', { page: '1' }, undefined],
  ['createLocation', [{ name: 'L' }], 'POST /api/v1/locations', {}, { name: 'L' }],
  ['deleteLocation', [7], 'DELETE /api/v1/locations/7', {}, undefined],
];

describe('inventory api', () => {
  it('covers every export', () => {
    expect(rows.map((r) => r[0]).sort()).toEqual(Object.keys(api).filter((k) => typeof (api as Record<string, unknown>)[k] === 'function').sort());
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
