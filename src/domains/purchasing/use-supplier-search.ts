import { useState } from 'react';
import { listSuppliers } from '@/domains/purchasing/api';
import { useApiData } from '@/shared/lib/use-api-data';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';

// Pilihan supplier untuk dropdown yang dicari di server (jeda 300 ms), bukan satu kali muat 100 supplier.
// suppliers hanya hasil pencarian terakhir: supplier yang sudah dipilih harus disimpan pemanggil sendiri.
export function useSupplierSearch() {
  const [input, setInput] = useState('');
  const query = useDebouncedValue(input.trim() || undefined);
  const { data, error, loading } = useApiData(() => listSuppliers({ search: query, pageSize: 50 }), `supplier-search|${query ?? ''}`, 'Gagal memuat daftar supplier.');
  return { suppliers: data?.rows ?? [], onSearch: setInput, error, pending: input.trim() !== (query ?? '') || loading };
}
