import { useCallback, useMemo, useState } from 'react';
export function useSelection<T extends { id: number }>() {
  const [selected, setSelected] = useState(() => new Map<number, T>());
  const toggle = useCallback((row: T) => setSelected((prev) => {
    const next = new Map(prev);
    if (next.has(row.id)) next.delete(row.id); else next.set(row.id, row);
    return next;
  }), []);
  const toggleMany = useCallback((rows: T[]) => setSelected((prev) => {
    const next = new Map(prev);
    const all = rows.length > 0 && rows.every((r) => next.has(r.id));
    rows.forEach((r) => (all ? next.delete(r.id) : next.set(r.id, r)));
    return next;
  }), []);
  const clear = useCallback(() => setSelected(new Map()), []);
  const rows = useMemo(() => [...selected.values()], [selected]);
  const allSelected = (list: T[]) => list.length > 0 && list.every((r) => selected.has(r.id));
  return { rows, size: selected.size, isSelected: (id: number) => selected.has(id), allSelected, toggle, toggleMany, clear };
}