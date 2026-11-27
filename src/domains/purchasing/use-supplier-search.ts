import { useState } from 'react';
import { listSuppliers } from '@/domains/purchasing/api';
import { useApiData } from '@/shared/lib/use-api-data';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';
import { fetchAllPages } from '@/shared/lib/fetch-all';

// Pilihan supplier untuk dropdown yang dicari di server (jeda 300 ms), bukan satu kali muat 100 supplier.
// loadAll memuat seluruh halaman untuk dropdown berkelompok dengan pencarian lokal.
// suppliers hanya hasil pencarian terakhir: supplier yang sudah dipilih harus disimpan pemanggil sendiri.
export function useSupplierSearch({ loadAll = false }: { loadAll?: boolean } = {}) {
  const [input, setInput] = useState('');
  const query = useDebouncedValue(input.trim() || undefined);
  const { data, error, loading } = useApiData(
    () => loadAll
      ? fetchAllPages((page, pageSize) => listSuppliers({ search: query, page, pageSize }))
      : listSuppliers({ search: query, pageSize: 50 }).then((result) => result.rows),
    `supplier-search|${loadAll ? 'all|' : ''}${query ?? ''}`, 'Gagal memuat daftar supplier.',
  );
  return { suppliers: data ?? [], onSearch: setInput, error, pending: input.trim() !== (query ?? '') || loading };
}
