// shared/components/DataTable.tsx
import React from 'react';

const COLORS: Record<string, string> = {
  'lembaran': 'bg-blue-100 text-blue-700 border-blue-200/50',
  'supplier': 'bg-amber-100 text-amber-700 border-amber-200/50',
  'perabotan': 'bg-slate-100 text-slate-700 border-slate-200/50',
  'finishing': 'bg-teal-100 text-teal-700 border-teal-200/50',
  'packing': 'bg-pink-100 text-pink-700 border-pink-200/50',
};

const DEFAULT = 'bg-purple-100 text-purple-700 border-purple-200/50';
const EMPTY = 'bg-gray-100 text-gray-700 border-gray-200/50';

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  render: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string; // kelas tambahan untuk sel
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  error?: string;
  emptyText?: string;
  rowClassName?: (row: T) => string;
};

const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' };

export function StockCell({ stock, unit }: { stock: number; unit: string }) {
  const color = stock < 20 ? 'text-red-600' : stock < 50 ? 'text-amber-600' : 'text-gray-800';
  return (
    <div className="flex items-center gap-2">
      <span className={`font-bold ${color}`}>{stock}</span>
      <span className="text-gray-500 text-xs bg-gray-100 px-2 py-0.5 rounded-md">{unit}</span>
    </div>
  );
}

export function CategoryBadge({ category }: { category: string | null }) {
  const color = category ? COLORS[category.toLowerCase()] ?? DEFAULT : EMPTY;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
      {category || '-'}
    </span>
  );
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  emptyText = 'Data tidak ditemukan.',
  rowClassName,
}: Props<T>) {
  const span = columns.length;
  const message = loading ? 'Memuat data...' : error ? error : rows.length === 0 ? emptyText : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`px-6 py-4 ${alignClass[c.align ?? 'left']}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {message && (
            <tr>
              <td
                colSpan={span}
                className={`px-6 py-6 text-center ${error && !loading ? 'text-red-500' : 'text-gray-400'}`}
              >
                {message}
              </td>
            </tr>
          )}
          {!loading &&
            !error &&
            rows.map((row, index) => (
              <tr
                key={rowKey(row)}
                className={`hover:bg-[#FF8A00]/5 transition-colors group ${rowClassName?.(row) ?? ''}`}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-6 py-4 ${alignClass[c.align ?? 'left']} ${c.className ?? ''}`}>
                    {c.render(row, index)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}