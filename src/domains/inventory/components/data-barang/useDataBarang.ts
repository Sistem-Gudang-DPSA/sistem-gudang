import { useState } from 'react';
import { listItemCategories, listItems, listItemUnits, listLocations } from '@/domains/inventory/api';
import type { ItemListRow } from '@/domains/inventory/types';
import { listSuppliers } from '@/domains/purchasing/api';
import { emptyBarangFilters, toItemFilterParams } from '@/domains/inventory/components/BarangFilterPanel';
import { useSort } from '@/shared/components/SortableTh';
import { useApiData } from '@/shared/lib/use-api-data';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';
import { useClampPage, usePage } from '@/shared/lib/use-page';

const DEFAULT_PAGE_SIZE = 20;
const REFERENCE_CACHE_MS = 60_000;

// Bagian yang sama di layar Data Barang Gudang, PPIC dan Superadmin: data, cari, filter, halaman, dan pilihan baris.
export function useDataBarang({ cacheReferenceLists = false }: { cacheReferenceLists?: boolean } = {}) {
  const { sort, toggle, params: sortParams } = useSort();
  const [filters, setFilters] = useState(emptyBarangFilters);
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const filterKey = JSON.stringify([debouncedSearch, filters, sortParams]);
  const [page, setPage] = usePage(`${filterKey}|${pageSize}`);
  const { data: loaded, loading, error, reload } = useApiData(
    () => listItems({ page, pageSize, search: debouncedSearch || undefined, ...toItemFilterParams(filters), ...sortParams }),
    `${filterKey}|${pageSize}|${page}`,
    'Gagal memuat data barang.',
  );
  const dataBarang = loaded?.rows ?? [];
  const total = loaded?.total ?? 0;
  useClampPage(page, total, pageSize, setPage);

  // Urutan pemanggilan sama seperti sebelumnya (lokasi, supplier, kategori, satuan). Hanya kategori dan satuan yang boleh di-cache.
  const cacheMs = cacheReferenceLists ? REFERENCE_CACHE_MS : 0;
  const { data: locationData } = useApiData(() => listLocations(), 'locations');
  const { data: supplierData } = useApiData(() => listSuppliers(), 'suppliers');
  const { data: categoryData } = useApiData(() => listItemCategories(), 'categories', 'Gagal memuat daftar kategori.', cacheMs);
  const { data: unitData } = useApiData(() => listItemUnits(), 'units', 'Gagal memuat daftar satuan.', cacheMs);
  const locations = locationData?.rows ?? [];
  const suppliers = supplierData?.rows ?? [];
  const categories = (categoryData ?? []).map((c) => c.name);
  const units = (unitData ?? []).map((u) => u.name);

  // Pilihan disimpan per id agar tetap ada saat pindah halaman, cari, atau urutkan.
  const [selected, setSelected] = useState(() => new Map<number, ItemListRow>());
  const toggleRow = (item: ItemListRow) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, item);
      return next;
    });
  const pageAllSelected = dataBarang.length > 0 && dataBarang.every((i) => selected.has(i.id));
  const togglePage = () =>
    setSelected((prev) => {
      const next = new Map(prev);
      for (const i of dataBarang) {
        if (pageAllSelected) next.delete(i.id);
        else next.set(i.id, i);
      }
      return next;
    });

  const supplierName = (id: number | null) => suppliers.find((s) => s.id === id)?.name ?? '-';
  const locationCode = (id: number | null) => (id === null ? '-' : locations.find((loc) => loc.id === id)?.code ?? `#${id}`);

  return {
    sort, toggle, sortParams,
    filters, setFilters, showFilter, setShowFilter,
    searchQuery, setSearchQuery, debouncedSearch,
    pageSize, setPageSize, page, setPage,
    dataBarang, total, loaded, loading, error, reload,
    locations, suppliers, categories, units, supplierName, locationCode,
    selected, setSelected, toggleRow, togglePage, pageAllSelected,
  };
}
