import { describe, expect, it } from 'vitest';
import type { ItemListRow } from '@/domains/inventory/types';
import { clientsOf, makeRows, usagesOf } from './RealisasiSPK';

const usage = [
  { clientName: 'PT Maju', spk: 'SPK-2', itemId: 1, qty: 3 },
  { clientName: 'PT Maju', spk: 'SPK-1', itemId: 1, qty: 2 },
  { clientName: 'pt maju ', spk: 'SPK-1', itemId: 2, qty: 5 },
  { clientName: 'CV Lain', spk: 'SPK-9', itemId: 3, qty: 7 },
];
const item = (id: number, price: number) => ({ id, code: `K${id}`, name: `Barang ${id}`, price }) as ItemListRow;

describe('Realisasi SPK dari barang keluar', () => {
  it('client list comes from outbound only', () => {
    expect(clientsOf(usage)).toEqual(['CV Lain', 'PT Maju']);
  });

  it('one column per SPK of the client, qty per item, other clients ignored', () => {
    const u = usagesOf(usage, 'PT Maju');
    expect(u.map((x) => x.noSpk)).toEqual(['SPK-1', 'SPK-2']);
    const rows = makeRows([item(1, 100), item(2, 10), item(3, 1)], u);
    expect(rows.map((r) => [r.id, r.totalQty, r.cells.map((c) => c.cost)])).toEqual([
      [1, 5, [200, 300]],
      [2, 5, [50, 0]],
      [3, 0, [0, 0]], // CV Lain's item: filtered out by the page (totalQty 0)
    ]);
  });
});
