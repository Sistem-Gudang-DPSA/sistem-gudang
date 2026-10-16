import { useEffect, useState } from 'react';
import { getTrackingSpk, listTrackingSpk } from '@/domains/ppic/api';
import type { TrackingSpk } from '@/domains/ppic/types';
import { useApiData } from '@/shared/lib/use-api-data';

// Pilihan SPK dari tracking untuk dropdown yang dicari di server (jeda 300 ms).
// SPK yang dipilih selalu ada di options, walau di luar hasil pencarian terakhir, dengan client-nya.
export function useSpkSearch(selected: string) {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState<string | undefined>(undefined);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim() || undefined), 300);
    return () => clearTimeout(timer);
  }, [input]);
  const { data: hasil, error } = useApiData(() => listTrackingSpk(query, 50), `spk-search|${query ?? ''}`, 'Gagal memuat daftar SPK.');

  // SPK terpilih di luar hasil (mis. Edit dengan SPK lama) diambil dulu supaya client-nya diketahui
  const adaDiHasil = !!selected && !!hasil?.some((t) => t.noSpk === selected);
  const [terpilih, setTerpilih] = useState<TrackingSpk | null>(null);
  useEffect(() => {
    if (!selected || adaDiHasil || terpilih?.noSpk === selected) return;
    let batal = false;
    getTrackingSpk(selected)
      .then((d) => !batal && setTerpilih({ noSpk: d.noSpk, client: d.client }))
      .catch(() => {});
    return () => { batal = true; };
  }, [selected, adaDiHasil, terpilih?.noSpk]);

  const options: TrackingSpk[] = [
    ...(hasil ?? []),
    ...(selected && !adaDiHasil ? [terpilih && terpilih.noSpk === selected ? terpilih : { noSpk: selected, client: '' }] : []),
  ];
  return { options, onSearch: setInput, error };
}
