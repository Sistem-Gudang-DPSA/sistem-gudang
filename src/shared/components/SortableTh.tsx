"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export type Sort = { by: string; dir: "asc" | "desc" } | null;

// Klik header: naik, lalu turun, lalu kembali ke urutan bawaan.
export function useSort(initial: Sort = null) {
  const [sort, setSort] = useState<Sort>(initial);
  const toggle = (by: string) =>
    setSort((s) => (s?.by !== by ? { by, dir: "asc" } : s.dir === "asc" ? { by, dir: "desc" } : null));
  return { sort, toggle, reset: () => setSort(null), params: sort ? { sortBy: sort.by, sortDir: sort.dir } : {} };
}

type Props = { label: string; sortKey: string; sort: Sort; onSort: (by: string) => void; className?: string; align?: "left" | "right" | "center" };

export default function SortableTh({ label, sortKey, sort, onSort, className = "px-6 py-4", align = "left" }: Props) {
  const active = sort?.by === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  const justify = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  return (
    <th scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={className}>
      <button type="button" onClick={() => onSort(sortKey)} className={`flex w-full items-center gap-1.5 text-left font-[inherit] hover:text-gray-900 ${justify}`}>
        <span>{label}</span>
        <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-orange-500" : "text-gray-300"}`} strokeWidth={2.5} aria-hidden />
      </button>
    </th>
  );
}
