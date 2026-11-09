// domains/inventory/use-item-lookups.ts
import { useEffect, useState } from 'react';
import { listItemCategories, listItemUnits, listLocations } from '@/domains/inventory/api';
import { listSuppliers } from '@/domains/purchasing/api';
import type { Location } from '@/domains/inventory/types';
import type { Supplier } from '@/domains/purchasing/types';

export function useItemLookups() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  useEffect(() => {
    listLocations().then((r) => setLocations(r.rows)).catch(() => {});
    listSuppliers().then((r) => setSuppliers(r.rows)).catch(() => {});
    listItemCategories().then((r) => setCategories(r.map((c) => c.name))).catch(() => {});
    listItemUnits().then((r) => setUnits(r.map((u) => u.name))).catch(() => {});
  }, []);
  const supplierName = (id: number | null) => suppliers.find((s) => s.id === id)?.name ?? '-';
  const locationCode = (id: number | null) => (id === null ? '-' : locations.find((l) => l.id === id)?.code ?? `#${id}`);
  return { locations, suppliers, categories, units, supplierName, locationCode };
}