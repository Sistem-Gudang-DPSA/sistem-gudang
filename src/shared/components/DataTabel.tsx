import React from 'react';
import SortableTh, { useSort } from '@/shared/components/SortableTh';

type SortState = ReturnType<typeof useSort>['sort'];

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  render: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  hideBelow?: 'md' | 'lg';   
  stickyRight?: boolean;
  sortKey?: string;    
}

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string | number;
  loading?: boolean;
  error?: string;
  emptyText?: string;
  rowClassName?: (row: T) => string;
  bordered?: boolean;  
  dense?: boolean;     
  sort?: SortState;
  onSort?: (key: string) => void;
};

const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' };
const hideClass = { md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' };

// ---------- Sel yang dipakai ulang ----------
const CATEGORY_COLORS: Record<string, string> = {
  'lembaran': 'bg-blue-100 text-blue-700 border-blue-200/50',
  'kayu solid': 'bg-amber-100 text-amber-700 border-amber-200/50',
  'logam': 'bg-slate-100 text-slate-700 border-slate-200/50',
  'finishing': 'bg-teal-100 text-teal-700 border-teal-200/50',
  'aksesoris': 'bg-pink-100 text-pink-700 border-pink-200/50',
};

export function CategoryBadge({ category }: { category: string | null }) {
  const color = !category
    ? 'bg-gray-100 text-gray-700 border-gray-200/50'
    : CATEGORY_COLORS[category.toLowerCase()] ?? 'bg-purple-100 text-purple-700 border-purple-200/50';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
      {category || '-'}
    </span>
  );
}

export function StockCell({ stock, unit }: { stock: number; unit: string }) {
  const color = stock < 20 ? 'text-red-600' : stock < 50 ? 'text-amber-600' : 'text-gray-800';
  return (
    <div className="flex items-center gap-2">
      <span className={`font-bold ${color}`}>{stock}</span>
      <span className="text-gray-500 text-xs bg-gray-100 px-2 py-0.5 rounded-md">{unit}</span>
    </div>
  );
}

// ---------- Tabel ----------
export function DataTable<T>({
  columns, rows, rowKey, loading, error, emptyText = 'Data tidak ditemukan.',
  rowClassName, bordered, dense, sort, onSort,
}: Props<T>) {
  const padX = dense ? 'px-3' : 'px-6';
  const padY = dense ? 'py-2.5' : 'py-4';
  const line = bordered ? 'border-b border-r border-gray-300' : '';

  const cellClass = (c: Column<T>, head: boolean) =>
    [
      padX,
      padY,
      line,
      alignClass[c.align ?? 'left'],
      c.hideBelow ? hideClass[c.hideBelow] : '',
      c.stickyRight
        ? `sticky right-0 z-10 ${head ? (bordered ? 'bg-gray-100' : 'bg-gray-50') : 'bg-white group-hover:bg-orange-50'}`
        : '',
      head ? '' : c.className ?? '',
    ].join(' ');

  const message = loading ? 'Memuat data...' : error ? error : rows.length === 0 ? emptyText : null;

  return (
    <div className={`overflow-x-auto ${bordered ? 'border-t border-l border-gray-300 rounded-sm' : ''}`}>
      <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
        <thead
          className={
            bordered
              ? 'bg-gray-100 text-gray-900 font-semibold text-xs'
              : 'bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100'
          }
        >
          <tr>
            {columns.map((c) =>
            c.sortKey && onSort && sort ? (
                <SortableTh
                key={c.key}
                label={c.header as string}
                sortKey={c.sortKey}
                sort={sort}
                onSort={onSort}
                />
            ) : (
                <th key={c.key} scope="col" className={cellClass(c, true)}>{c.header}</th>
            ),
            )}
          </tr>
        </thead>
        <tbody className={bordered ? 'text-gray-800' : 'divide-y divide-gray-50 text-gray-600'}>
          {message && (
            <tr>
              <td
                colSpan={columns.length}
                className={`${padX} ${line} py-10 text-center ${error && !loading ? 'text-red-500' : 'text-gray-400'}`}
              >
                {message}
              </td>
            </tr>
          )}
          {!loading && !error && rows.map((row, index) => (
            <tr key={rowKey(row, index)} className={`hover:bg-orange-50/20 transition-colors group ${rowClassName?.(row) ?? ''}`}>
              {columns.map((c) => (
                <td key={c.key} className={cellClass(c, false)}>{c.render(row, index)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}