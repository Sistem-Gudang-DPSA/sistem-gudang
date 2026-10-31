import { afterEach, describe, expect, it, vi } from 'vitest';
import { installFakeApi } from '@/test/fake-api';
import * as api from './api';

afterEach(() => vi.unstubAllGlobals());

// [exported name, args, "METHOD /path", query, body]
type Row = [keyof typeof api, unknown[], string, Record<string, string>, unknown];
const rows: Row[] = [
  ['listItems', [{ page: 2, search: 'tri' }], 'GET /api/v1/items', { page: '2', search: 'tri' }, undefined],
  ['getItem', [1], 'GET /api/v1/items/1', {}, undefined],
  ['getItemByCode', ['A1/03'], 'GET /api/v1/items/by-code/A1%2F03', {}, undefined],
  ['createItem', [{ name: 'I' }], 'POST /api/v1/items', {}, { name: 'I' }],
  ['updateItem', [1, { name: 'J' }], 'PUT /api/v1/items/1', {}, { name: 'J' }],
  ['recodeItem', [1], 'POST /api/v1/items/1/recode', {}, undefined],
  ['bulkRecodeItems', [[1, 2]], 'POST /api/v1/items/recode/bulk', {}, { itemIds: [1, 2] }],
  ['deleteItem', [1], 'DELETE /api/v1/items/1', {}, undefined],
  ['listUnassignedItems', [], 'GET /api/v1/items/unassigned', {}, undefined],
  ['bulkAssignItemLocation', [{ itemIds: [1, 2], locationId: 9 }], 'POST /api/v1/items/assign-location/bulk', {}, { itemIds: [1, 2], locationId: 9 }],
  ['assignItemLocation', [1, { locationId: 9 }], 'PUT /api/v1/items/1/assign-location', {}, { locationId: 9 }],
  ['adjustItemStock', [1, { delta: -2, reason: 'rusak' }], 'PATCH /api/v1/items/1/stock', {}, { delta: -2, reason: 'rusak' }],
  // Multipart body (FormData) is not parsed by the fake API; ItemPhoto.test checks its contents.
  ['uploadItemPhoto', [1, new File(['x'], 'a.png', { type: 'image/png' })], 'POST /api/v1/items/1/photo', {}, undefined],
  ['uploadItemPhotosBulk', [[{ itemId: 1, file: new File(['x'], 'a.png', { type: 'image/png' }) }]], 'POST /api/v1/items/photos/bulk', {}, undefined],
  ['listItemCategories', [],'GET /api/v1/items/categories', {}, undefined],
  ['listItemUnits', [], 'GET /api/v1/items/units', {}, undefined],
  ['listItemCategoriesPage', [{ page: 2, pageSize: 20, sortBy: 'name', sortDir: 'desc' }], 'GET /api/v1/items/categories', { page: '2', pageSize: '20', sortBy: 'name', sortDir: 'desc' }, undefined],
  ['listItemUnitsPage', [{ page: 1, pageSize: 20 }], 'GET /api/v1/items/units', { page: '1', pageSize: '20' }, undefined],
  ['createItemCategory', ['Kayu'], 'POST /api/v1/items/categories', {}, { name: 'Kayu' }],
  ['createItemUnit', ['Pcs'], 'POST /api/v1/items/units', {}, { name: 'Pcs' }],
  ['renameItemCategory', [3, 'Kayu2'], 'PUT /api/v1/items/categories/3', {}, { name: 'Kayu2' }],
  ['renameItemUnit', [4, 'Pcs2'], 'PUT /api/v1/items/units/4', {}, { name: 'Pcs2' }],
  ['deleteItemCategory', [3], 'DELETE /api/v1/items/categories/3', {}, undefined],
  ['deleteItemUnit', [4], 'DELETE /api/v1/items/units/4', {}, undefined],
  ['importItems', [{ defaults: {}, items: [{ name: 'I', code: '', price: 1, stock: 2 }] }], 'POST /api/v1/items/bulk', {}, { defaults: {}, items: [{ name: 'I', price: 1, stock: 2 }] }],
  ['listLocations', [{ page: 1 }], 'GET /api/v1/locations', { page: '1' }, undefined],
  ['updateLocation', [3, { rackName: 'B' }], 'PUT /api/v1/locations/3', {}, { rackName: 'B' }],
  ['createLocation', [{ name: 'L' }], 'POST /api/v1/locations', {}, { name: 'L' }],
  ['deleteLocation', [7], 'DELETE /api/v1/locations/7', {}, undefined],
  ['importLocationData', [[{ code: 'A.1.1', NamaRak: 'A', NomorRak: '1.1' }]], 'POST /api/v1/locations/bulk', {}, { rows: [{ code: 'A.1.1', rackName: 'A', rackNumber: '1.1' }] }],
  ['listInbound', [{ page: 1, startDate: '2026-01-01' }], 'GET /api/v1/inbound', { page: '1', startDate: '2026-01-01' }, undefined],
  ['getInbound', [2], 'GET /api/v1/inbound/2', {}, undefined],
  ['createInbound', [{ a: 1 }], 'POST /api/v1/inbound', {}, { a: 1 }],
  ['createInboundReturn', [{ b: 1 }], 'POST /api/v1/inbound/returns', {}, { b: 1 }],
  ['createInboundBatch', [{ lines: [] }, 'key-12345678'], 'POST /api/v1/inbound/batch', {}, { lines: [] }],
  ['createInboundScanBatch', [{ date: '2026-01-01', pass: [], retur: [] }, 'key-12345678'], 'POST /api/v1/inbound/scan-batch', {}, { date: '2026-01-01', pass: [], retur: [] }],
  ['getInboundReport', [{ q: 'x', page: 2 }], 'GET /api/v1/reports/inbound', { q: 'x', page: '2' }, undefined],
  ['exportInboundReport', [{ q: 'x' }], 'GET /api/v1/reports/inbound/export', { q: 'x' }, undefined],
  ['listOutbound', [{ page: 3 }], 'GET /api/v1/outbound', { page: '3' }, undefined],
  ['createOutbound', [{ c: 1 }, 'key-12345678'], 'POST /api/v1/outbound', {}, { c: 1 }],
  ['updateOutbound', [7, { c: 2 }], 'PUT /api/v1/outbound/7', {}, { c: 2 }],
  ['getOutboundReport', [{ q: 'y' }], 'GET /api/v1/reports/outbound', { q: 'y' }, undefined],
  ['exportOutboundReport', [{ q: 'y' }], 'GET /api/v1/reports/outbound/export', { q: 'y' }, undefined],
  ['listStockOpname', [{ page: 1 }], 'GET /api/v1/stock-opname', { page: '1' }, undefined],
  ['getStockOpname', [4], 'GET /api/v1/stock-opname/4', {}, undefined],
  ['createStockOpname', [{ d: 1 }], 'POST /api/v1/stock-opname', {}, { d: 1 }],
  ['getRequestsReport', [{ q: 'z' }], 'GET /api/v1/reports/requests', { q: 'z' }, undefined],
  ['getStockCard', [7], 'GET /api/v1/items/7/stock-card', {}, undefined],
  ['listMaterialRequests', [{ search: 'SPK-1', pageSize: 100 }], 'GET /api/v1/material-requests', { search: 'SPK-1', pageSize: '100' }, undefined],
  ['listChecklistDokubah', [{ page: 2, search: 'a' }], 'GET /api/v1/checklist-dokubah', { page: '2', search: 'a' }, undefined],
  ['getChecklistDokubah', [3], 'GET /api/v1/checklist-dokubah/3', {}, undefined],
  ['saveChecklistDokubah', [3, { kepalaGroup: null }], 'PUT /api/v1/checklist-dokubah/3', {}, { kepalaGroup: null }],
  ['getMaterialRequest', [5], 'GET /api/v1/material-requests/5', {}, undefined],
  ['exportRequestsReport', [{ q: 'z', ids: [1, 2] }], 'GET /api/v1/reports/requests/export', { q: 'z', ids: '1,2' }, undefined],
  ['importOutbound', [new File(['x'], 'a.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })], 'POST /api/v1/outbound/import', {}, undefined],
];

describe('inventory api (items, locations and the Gudang division)', () => {
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
