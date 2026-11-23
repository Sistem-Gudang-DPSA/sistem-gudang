"use client";

import { useId } from 'react';

export const VISIBLE_ROWS_OPTIONS = [20, 50, 100] as const;

type Props = {
  value: number;
  onChange: (rows: number) => void;
  label?: string;
  className?: string;
};

// Pengganti "baris per halaman": hanya mengatur berapa baris yang tampak di area scroll.
export default function VisibleRowsSelect({ value, onChange, label = 'Baris terlihat', className = '' }: Props) {
  const id = useId();
  return (
    <div className={`flex items-center gap-2 text-xs text-gray-500 ${className}`}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="px-2 py-1 bg-white border border-gray-200 rounded-md text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
      >
        {VISIBLE_ROWS_OPTIONS.map((rows) => (
          <option key={rows} value={rows}>{rows}</option>
        ))}
      </select>
    </div>
  );
}
