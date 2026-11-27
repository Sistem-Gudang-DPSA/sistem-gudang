import type { Item, ItemListRow, ItemSupplier } from '@/domains/inventory/types';
import type { Sort } from '@/shared/components/SortableTh';
import { getItem, replaceItemSuppliers } from '@/domains/inventory/api';
import { invalidateApiData } from '@/shared/lib/use-api-data';

export const isSupplierAmount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export function materialSuppliers(item: Pick<Item, 'suppliers' | 'supplierId'> & { supplierName?: string | null }): ItemSupplier[] {
  return item.suppliers ?? (item.supplierId === null ? [] : [{ id: item.supplierId, name: item.supplierName || `Supplier #${item.supplierId}` }]);
}

export async function addMaterialSupplier(itemId: number, supplier: Pick<ItemSupplier, 'id' | 'name'>): Promise<ItemSupplier[]> {
  const item = await getItem(itemId);
  const current = materialSuppliers({ ...item, supplierId: item.supplierId ?? null });
  if (current.some((mapped) => mapped.id === supplier.id)) {
    invalidateApiData();
    return current;
  }
  const supplierIds = [...new Set([...current.map((mapped) => mapped.id), supplier.id])];
  const saved = await replaceItemSuppliers(itemId, supplierIds);
  invalidateApiData();
  return saved.suppliers ?? [...current, { id: supplier.id, name: supplier.name }];
}

export function supplierPriceSummary(suppliers: ItemSupplier[]): { total: number | null; average: number | null } {
  if (suppliers.length === 0 || suppliers.some((supplier) => !isSupplierAmount(supplier.price))) {
    return { total: null, average: null };
  }
  const total = suppliers.reduce((sum, supplier) => sum + supplier.price!, 0);
  return Number.isFinite(total) ? { total, average: total / suppliers.length } : { total: null, average: null };
}

export const formatSupplierAmount = (value: number | null | undefined): string =>
  isSupplierAmount(value) ? value.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '-';

export function sortBySupplierAverage(items: ItemListRow[], sort: Sort): ItemListRow[] {
  if (sort?.by !== 'averagePrice') return items;
  const averages = new Map(items.map((item) => [item.id, supplierPriceSummary(materialSuppliers(item)).average]));
  return [...items].sort((a, b) => {
    const left = averages.get(a.id) ?? null;
    const right = averages.get(b.id) ?? null;
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    return (left - right) * (sort.dir === 'asc' ? 1 : -1);
  });
}
