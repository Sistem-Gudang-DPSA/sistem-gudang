import { useState } from 'react';
import { listItems } from '@/domains/inventory/api';
import { useApiData } from '@/shared/lib/use-api-data';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';

// Pilihan barang untuk dropdown/datalist yang dicari di server (jeda 300 ms), bukan satu kali muat 100 barang.
// items hanya hasil pencarian terakhir: barang yang sudah terpilih harus disimpan pemanggil sendiri.
export function useItemSearch(supplierId?: number) {
  const [input, setInput] = useState('');
  const query = useDebouncedValue(input.trim() || undefined);
  const { data, error, loading } = useApiData(() => listItems({ search: query, supplierId, pageSize: 50 }), `item-search|${supplierId ?? ''}|${query ?? ''}`, 'Gagal memuat daftar barang.');
  return { items: data?.rows ?? [], onSearch: setInput, error, pending: input.trim() !== (query ?? '') || loading };
}
