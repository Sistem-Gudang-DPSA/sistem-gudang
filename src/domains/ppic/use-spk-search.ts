import { useEffect, useState } from 'react';
import { getTrackingSpk, listTrackingClients, listTrackingSpk } from '@/domains/ppic/api';
import type { TrackingSpk } from '@/domains/ppic/types';
import { useApiData } from '@/shared/lib/use-api-data';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';

// Pilihan SPK dari tracking untuk dropdown yang dicari di server (jeda 300 ms, lihat useDebouncedValue).
// SPK yang dipilih selalu ada di options, walau di luar hasil pencarian terakhir, dengan client-nya.
// client: undefined = every SPK; a name = only that client's SPKs; '' = no client picked yet, so none.
export function useSpkSearch(selected: string, client?: string) {
  const [input, setInput] = useState('');
  const query = useDebouncedValue(input.trim() || undefined);
  const { data: response, error } = useApiData(async () => ({
    client,
    rows: client === '' ? [] : await listTrackingSpk(query, 50, client),
  }), `spk-search|${client === undefined ? 'all' : `client:${client}`}|${query ?? ''}`, 'Gagal memuat daftar SPK.');
  // useApiData retains the previous response while loading; never show another client's SPKs.
  const hasil = response?.client === client
    ? response?.rows.filter((spk) => client === undefined || spk.client === client) ?? []
    : [];

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
    ...(selected && !adaDiHasil && client !== '' && (client === undefined || (terpilih?.noSpk === selected && terpilih.client === client))
      ? [terpilih && terpilih.noSpk === selected ? terpilih : { noSpk: selected, client: '' }] : []),
  ];
  return { options, onSearch: setInput, error };
}

// Pilihan client dari tracking, dicari di server (jeda 300 ms, lihat useDebouncedValue).
export function useClientSearch() {
  const [input, setInput] = useState('');
  const query = useDebouncedValue(input.trim() || undefined);
  const { data } = useApiData(() => listTrackingClients(query, 50), `client-search|${query ?? ''}`, 'Gagal memuat daftar client.');
  return { options: data ?? [], onSearch: setInput };
}
