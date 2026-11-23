import { useCallback, useMemo, useState } from 'react';
// Pilihan hidup selama layar ter-mount. resetKey opsional untuk konteks yang
// memang harus mulai kosong (mis. izin lihat berubah); layar tabel memakai key stabil.
export function useSelection<T extends { id: number }>(resetKey = '') {
  const [state, setState] = useState(() => ({ key: resetKey, map: new Map<number, T>() }));
  const selected = useMemo(() => (state.key === resetKey ? state.map : new Map<number, T>()), [state, resetKey]);
  const update = useCallback((fn: (map: Map<number, T>) => void) => setState((prev) => {
    const next = new Map(prev.key === resetKey ? prev.map : []);
    fn(next);
    return { key: resetKey, map: next };
  }), [resetKey]);
  const toggle = useCallback((row: T) => update((next) => {
    if (next.has(row.id)) next.delete(row.id); else next.set(row.id, row);
  }), [update]);
  const toggleMany = useCallback((rows: T[]) => update((next) => {
    const all = rows.length > 0 && rows.every((r) => next.has(r.id));
    rows.forEach((r) => (all ? next.delete(r.id) : next.set(r.id, r)));
  }), [update]);
  const clear = useCallback(() => update((next) => next.clear()), [update]);
  // Ganti seluruh pilihan sekaligus; dipakai layar yang butuh Map utuh, bukan toggle per baris.
  const setMap = useCallback((next: Map<number, T> | ((prev: Map<number, T>) => Map<number, T>)) => setState((prev) => {
    const base = prev.key === resetKey ? new Map(prev.map) : new Map<number, T>();
    return { key: resetKey, map: typeof next === 'function' ? next(base) : new Map(next) };
  }), [resetKey]);
  const rows = useMemo(() => [...selected.values()], [selected]);
  const allSelected = (list: T[]) => list.length > 0 && list.every((r) => selected.has(r.id));
  return { map: selected, setMap, rows, size: selected.size, isSelected: (id: number) => selected.has(id), allSelected, toggle, toggleMany, clear };
}
