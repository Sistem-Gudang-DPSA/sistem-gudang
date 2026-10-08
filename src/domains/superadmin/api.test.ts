import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeApi } from '@/test/fake-api';
import * as api from './api';

afterEach(() => vi.unstubAllGlobals());

// [exported name, args, "METHOD /path", query, body]
type Row = [keyof typeof api, unknown[], string, Record<string, string>, unknown];
const rows: Row[] = [
  ['listRoles', [], 'GET /api/v1/superadmin/roles', {}, undefined],
  ['listUsers', [{ page: 1, search: 'x' }], 'GET /api/v1/superadmin/users', { page: '1', search: 'x' }, undefined],
  ['createUser', [{ username: 'u' }], 'POST /api/v1/superadmin/users', {}, { username: 'u' }],
  ['updateUser', [5, { username: 'v' }], 'PUT /api/v1/superadmin/users/5', {}, { username: 'v' }],
  ['deleteUser', [5], 'DELETE /api/v1/superadmin/users/5', {}, undefined],
];
// ponytail: the import* helpers POST to Next routes through fetch, not apiClient, so the fake API does not cover them
const FETCH_ONLY = ['importMasterData', 'importLocationData'];

describe('superadmin api', () => {
  it('covers every export', () => {
    expect(rows.map((r) => r[0]).sort()).toEqual(Object.keys(api).filter((k) => typeof (api as Record<string, unknown>)[k] === 'function' && !FETCH_ONLY.includes(k)).sort());
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
