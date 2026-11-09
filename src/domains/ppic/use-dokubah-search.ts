import { useState } from 'react';
import { listDokubah } from '@/domains/ppic/api';
import { useApiData } from '@/shared/lib/use-api-data';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';

// Pilihan Dokubah (SPK Klien) untuk dropdown yang dicari di server (jeda 300 ms), bukan satu kali muat 100 data.
// rows hanya hasil pencarian terakhir: pilihan yang sudah dipilih harus disimpan pemanggil sendiri.
export function useDokubahSearch() {
  const [input, setInput] = useState('');
  const query = useDebouncedValue(input.trim() || undefined);
  const { data, error, loading } = useApiData(() => listDokubah({ search: query, pageSize: 50 }), `dokubah-search|${query ?? ''}`, 'Gagal memuat daftar SPK Klien.');
  return { rows: data?.rows ?? [], onSearch: setInput, error, pending: input.trim() !== (query ?? '') || loading };
}
