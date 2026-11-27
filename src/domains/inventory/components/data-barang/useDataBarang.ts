import { useState } from 'react';
import { listItemCategories, listItems, listItemUnits, listLocations } from '@/domains/inventory/api';
import type { ItemListRow } from '@/domains/inventory/types';
import { listSuppliers } from '@/domains/purchasing/api';
import { emptyBarangFilters, toItemFilterParams } from '@/domains/inventory/components/BarangFilterPanel';
import { useSort } from '@/shared/components/SortableTh';
import { useApiData } from '@/shared/lib/use-api-data';
import { fetchAllPages, fetchAllPagesResult } from '@/shared/lib/fetch-all';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';
import { useSelection } from '@/shared/lib/use-selection';

const REFERENCE_CACHE_MS = 60_000;

// Bagian yang sama di layar Data Barang Gudang, PPIC dan Superadmin: data, cari, filter, dan pilihan baris.
// Semua baris terfilter dimuat sekaligus dan dirender dalam satu tabel scroll.
export function useDataBarang({ cacheReferenceLists = false, clientSortKeys = [] }: { cacheReferenceLists?: boolean; clientSortKeys?: readonly string[] } = {}) {
  const { sort, toggle, params } = useSort();
  const sortParams = sort && clientSortKeys.includes(sort.by) ? {} : params;
  const [filters, setFilters] = useState(emptyBarangFilters);
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery);

  const filterKey = JSON.stringify([debouncedSearch, filters, sortParams]);
  const { data: loaded, loading, error, reload } = useApiData(
    () => fetchAllPagesResult((page, pageSize) => listItems({ page, pageSize, search: debouncedSearch || undefined, ...toItemFilterParams(filters), ...sortParams })),
    `${filterKey}|all`,
    'Gagal memuat data barang.',
  );
  const dataBarang = loaded?.rows ?? [];
  const total = loaded?.total ?? 0;

  // Pilihan bertahan lintas pencarian/filter; hilang saat layar ditutup.
  const selection = useSelection<ItemListRow>();
  const selected = selection.map;

  // Urutan pemanggilan sama seperti sebelumnya (lokasi, supplier, kategori, satuan). Hanya kategori dan satuan yang boleh di-cache.
  const cacheMs = cacheReferenceLists ? REFERENCE_CACHE_MS : 0;
  // Lokasi dan supplier berpaginasi: ambil semua halaman agar nama dan pilihan lengkap.
  const { data: locationData, error: locationError } = useApiData(() => fetchAllPages((page, pageSize) => listLocations({ page, pageSize })), 'locations', 'Gagal memuat daftar lokasi.');
  const { data: supplierData, error: supplierError } = useApiData(() => fetchAllPages((page, pageSize) => listSuppliers({ page, pageSize })), 'suppliers', 'Gagal memuat daftar supplier.');
  const { data: categoryData } = useApiData(() => listItemCategories(), 'categories', 'Gagal memuat daftar kategori.', cacheMs);
  const { data: unitData } = useApiData(() => listItemUnits(), 'units', 'Gagal memuat daftar satuan.', cacheMs);
  const locations = locationData ?? [];
  const suppliers = supplierData ?? [];
  const categories = (categoryData ?? []).map((c) => c.name);
  const units = (unitData ?? []).map((u) => u.name);

  const supplierName = (id: number | null) => suppliers.find((s) => s.id === id)?.name ?? '-';
  const locationCode = (id: number | null) => (id === null ? '-' : locations.find((loc) => loc.id === id)?.code ?? `#${id}`);

  return {
    sort, toggle, sortParams,
    filters, setFilters, showFilter, setShowFilter,
    searchQuery, setSearchQuery, debouncedSearch,
    dataBarang, total, loaded, loading, error: error || locationError || supplierError, reload,
    locations, suppliers, categories, units, supplierName, locationCode,
    selected, setSelected: selection.setMap, toggleRow: selection.toggle, toggleAll: () => selection.toggleMany(dataBarang),
    clearSelection: selection.clear,
    allSelected: selection.allSelected(dataBarang), someSelected: dataBarang.some((item) => selected.has(item.id)),
  };
}
