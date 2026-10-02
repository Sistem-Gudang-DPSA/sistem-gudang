import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeApi } from '@/test/fake-api';
import * as api from './api';

afterEach(() => vi.unstubAllGlobals());

// [exported name, args, "METHOD /path", query, body]
type Row = [keyof typeof api, unknown[], string, Record<string, string>, unknown];
const rows: Row[] = [
  ['listInbound', [{ page: 1, startDate: '2026-01-01' }], 'GET /api/v1/inbound', { page: '1', startDate: '2026-01-01' }, undefined],
  ['getInbound', [2], 'GET /api/v1/inbound/2', {}, undefined],
  ['createInbound', [{ a: 1 }], 'POST /api/v1/inbound', {}, { a: 1 }],
  ['createInboundReturn', [{ b: 1 }], 'POST /api/v1/inbound/returns', {}, { b: 1 }],
  ['getInboundReport', [{ q: 'x', page: 2 }], 'GET /api/v1/reports/inbound', { q: 'x', page: '2' }, undefined],
  ['exportInboundReport', [{ q: 'x' }], 'GET /api/v1/reports/inbound/export', { q: 'x' }, undefined],
  ['listOutbound', [{ page: 3 }], 'GET /api/v1/outbound', { page: '3' }, undefined],
  ['createOutbound', [{ c: 1 }], 'POST /api/v1/outbound', {}, { c: 1 }],
  ['getOutboundReport', [{ q: 'y' }], 'GET /api/v1/reports/outbound', { q: 'y' }, undefined],
  ['exportOutboundReport', [{ q: 'y' }], 'GET /api/v1/reports/outbound/export', { q: 'y' }, undefined],
  ['listStockOpname', [{ page: 1 }], 'GET /api/v1/stock-opname', { page: '1' }, undefined],
  ['getStockOpname', [4], 'GET /api/v1/stock-opname/4', {}, undefined],
  ['createStockOpname', [{ d: 1 }], 'POST /api/v1/stock-opname', {}, { d: 1 }],
  ['getRequestsReport', [{ q: 'z' }], 'GET /api/v1/reports/requests', { q: 'z' }, undefined],
  ['getMaterialRequest', [5], 'GET /api/v1/material-requests/5', {}, undefined],
  ['exportRequestsReport', [{ q: 'z', ids: [1, 2] }], 'GET /api/v1/reports/requests/export', { q: 'z', ids: '1,2' }, undefined],
];

describe('gudang api', () => {
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
