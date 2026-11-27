import { describe, expect, it } from 'vitest';
import type { ItemListRow, ItemSupplier } from '@/domains/inventory/types';
import { installFakeApi, fail } from '@/test/fake-api';
import { addMaterialSupplier, formatSupplierAmount, materialSuppliers, sortBySupplierAverage, supplierPriceSummary } from './material-suppliers';

const suppliers: ItemSupplier[] = [
  { id: 7, name: 'PT Kayu', remainingStock: 2, price: 10000 },
  { id: 8, name: 'CV Baja', remainingStock: 8, price: 20000 },
];

describe('harga supplier material', () => {
  it('menghitung total dan rata-rata biasa tanpa pembobotan sisa stok', () => {
    expect(supplierPriceSummary(suppliers)).toEqual({ total: 30000, average: 15000 });
  });

  it('tetap menghitung supplier dengan stok nol dan harga nol', () => {
    expect(supplierPriceSummary([{ ...suppliers[0], remainingStock: 0, price: 0 }, suppliers[1]])).toEqual({ total: 20000, average: 10000 });
  });

  it.each([undefined, null, -1, NaN, Infinity])('tidak mengarang total saat satu harga belum valid: %s', (price) => {
    expect(supplierPriceSummary([suppliers[0], { ...suppliers[1], price }])).toEqual({ total: null, average: null });
  });

  it('menampilkan harga kosong saat belum ada supplier, termasuk pemetaan kosong eksplisit', () => {
    expect(supplierPriceSummary([])).toEqual({ total: null, average: null });
    expect(materialSuppliers({ supplierId: 7, suppliers: [] })).toEqual([]);
  });

  it('memakai supplier utama lama tanpa menganggap stok atau harga master sebagai data supplier', () => {
    const rows = materialSuppliers({ supplierId: 7, supplierName: 'PT Kayu' });
    expect(rows).toEqual([{ id: 7, name: 'PT Kayu' }]);
    expect(supplierPriceSummary(rows).average).toBeNull();
    expect(materialSuppliers({ supplierId: null })).toEqual([]);
  });

  it('memformat pecahan harga dan membedakan nol dari data yang belum tersedia', () => {
    expect(formatSupplierAmount(10000 / 3)).toBe('3.333,33');
    expect(formatSupplierAmount(0)).toBe('0');
    expect(formatSupplierAmount(null)).toBe('-');
  });

  it('mengurutkan berdasarkan rata-rata, mempertahankan data kosong di akhir dan tidak mengubah sumber', () => {
    const items = [
      { id: 1, supplierId: 7, suppliers },
      { id: 2, supplierId: 7, suppliers: [{ ...suppliers[0], price: 5000 }] },
      { id: 3, supplierId: null, suppliers: [] },
    ] as ItemListRow[];
    expect(sortBySupplierAverage(items, { by: 'averagePrice', dir: 'asc' }).map((item) => item.id)).toEqual([2, 1, 3]);
    expect(sortBySupplierAverage(items, { by: 'averagePrice', dir: 'desc' }).map((item) => item.id)).toEqual([1, 2, 3]);
    expect(items.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(sortBySupplierAverage(items, { by: 'name', dir: 'asc' })).toBe(items);
  });
});

describe('menambah supplier material dari pilihan PO', () => {
  it('membaca pemetaan terbaru dan mempertahankan semua supplier beserta stok dan harganya', async () => {
    const api = installFakeApi({
      'GET /api/v1/items/3': { id: 3, supplierId: 7, suppliers },
      'PUT /api/v1/items/3/suppliers': { id: 3 },
    });
    const added = { id: 9, name: 'Supplier Baru' };
    expect(await addMaterialSupplier(3, added)).toEqual([...suppliers, added]);
    expect(api.all().map((call) => `${call.method} ${call.path}`)).toEqual(['GET /api/v1/items/3', 'PUT /api/v1/items/3/suppliers']);
    expect(api.calls('PUT /api/v1/items/3/suppliers')[0].body).toEqual({ supplierIds: [7, 8, 9] });
  });

  it('tidak mengirim ulang atau menduplikasi supplier yang sudah dipetakan di server', async () => {
    const api = installFakeApi({ 'GET /api/v1/items/3': { id: 3, supplierId: 7, suppliers } });
    expect(await addMaterialSupplier(3, suppliers[1])).toEqual(suppliers);
    expect(api.calls('PUT /api/v1/items/3/suppliers')).toHaveLength(0);
  });

  it('memakai data stok dan harga dari respons penyimpanan', async () => {
    const saved = [...suppliers, { id: 9, name: 'Supplier Baru', remainingStock: 5, price: 15000 }];
    installFakeApi({
      'GET /api/v1/items/3': { id: 3, supplierId: 7, suppliers },
      'PUT /api/v1/items/3/suppliers': { id: 3, suppliers: saved },
    });
    expect(await addMaterialSupplier(3, saved[2])).toEqual(saved);
  });

  it.each([
    [{ supplierId: 7 }, [7, 9]],
    [{ supplierId: 7, suppliers: [] }, [9]],
  ])('mempertahankan fallback lama dan menghormati pemetaan kosong: %j', async (item, ids) => {
    const api = installFakeApi({ 'GET /api/v1/items/3': item, 'PUT /api/v1/items/3/suppliers': { id: 3 } });
    await addMaterialSupplier(3, { id: 9, name: 'Supplier Baru' });
    expect(api.calls('PUT /api/v1/items/3/suppliers')[0].body).toEqual({ supplierIds: ids });
  });

  it('tidak menimpa pemetaan bila pembacaan terbaru gagal', async () => {
    const api = installFakeApi({ 'GET /api/v1/items/3': fail(500, 'Gagal membaca material') });
    await expect(addMaterialSupplier(3, { id: 9, name: 'Supplier Baru' })).rejects.toThrow('Gagal membaca material');
    expect(api.calls('PUT /api/v1/items/3/suppliers')).toHaveLength(0);
  });

  it('meneruskan kegagalan simpan tanpa menganggap supplier sudah tersimpan', async () => {
    installFakeApi({ 'GET /api/v1/items/3': { supplierId: 7, suppliers }, 'PUT /api/v1/items/3/suppliers': fail(403, 'Tidak diizinkan') });
    await expect(addMaterialSupplier(3, { id: 9, name: 'Supplier Baru' })).rejects.toThrow('Tidak diizinkan');
  });
});
