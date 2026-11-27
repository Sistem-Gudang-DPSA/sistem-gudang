import type { ReactNode } from 'react';
import SortableTh, { type Sort } from '@/shared/components/SortableTh';
import ScrollableTable, { STICKY_HEAD_CLASS } from '@/shared/components/ScrollableTable';
import SelectAllCheckbox from '@/shared/components/SelectAllCheckbox';
import ItemPhoto from '@/domains/inventory/components/ItemPhoto';
import { displayDate } from '@/domains/inventory/date';
import type { ItemListRow } from '@/domains/inventory/types';

export type BarangColumn = {
  label: string;
  hidden?: boolean;
  sortKey?: string;
  align?: 'left' | 'right' | 'center';
  tdClassName?: string;
  // tanpa cell hanya kepala kolom
  cell?: (item: ItemListRow, index: number) => ReactNode;
};

export type BarangSelection = {
  selected: Map<number, ItemListRow>;
  allSelected: boolean;
  onToggleRow: (item: ItemListRow) => void;
  onToggleAll: () => void;
  checkboxClassName?: string;
  disableAllWhenEmpty?: boolean;
};

type Props = {
  rows: ItemListRow[];
  loading: boolean;
  columns: BarangColumn[];
  sort: Sort;
  onSort: (by: string) => void;
  photo: { canUpload: boolean; onUploaded?: () => void };
  selection?: BarangSelection;
  rowActions?: (item: ItemListRow) => ReactNode;
  // Klik baris untuk membuka detail; kontrol dan overlay di dalam baris tidak memicu navigasi.
  onRowClick?: (item: ItemListRow) => void;
  rowClassName: (item: ItemListRow, index: number) => string;
  tbodyClassName?: string;
};

// Tabel Data Barang: kolom No, Foto, kolom per peran, dan Aksi. Kolom centang hanya bila `selection` diisi.
export default function DataBarangTable({ rows, loading, columns, sort, onSort, photo, selection, rowActions, onRowClick, rowClassName, tbodyClassName }: Props) {
  const visibleColumns = columns.filter((column) => !column.hidden);
  const colSpan = visibleColumns.length + 2 + Number(!!selection) + Number(!!rowActions);
  return (
    <ScrollableTable ariaLabel="Tabel Data Barang">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className={`${STICKY_HEAD_CLASS} bg-gray-50 text-gray-600 font-semibold border-b border-gray-100`}>
          <tr>
            {selection && (
              <th scope="col" className="px-4 py-3">
                <SelectAllCheckbox
                  ariaLabel="Pilih semua barang"
                  checked={selection.allSelected}
                  indeterminate={rows.some((item) => selection.selected.has(item.id))}
                  disabled={!!selection.disableAllWhenEmpty && rows.length === 0}
                  onChange={selection.onToggleAll}
                  className={selection.checkboxClassName}
                />
              </th>
            )}
            <th scope="col" className="px-6 py-3">No</th>
            <th scope="col" className="px-6 py-3">Foto</th>
            {visibleColumns.map((col) => col.sortKey ? (
              <SortableTh key={col.label} label={col.label} sortKey={col.sortKey} sort={sort} onSort={onSort} align={col.align} />
            ) : (
              <th key={col.label} scope="col" className="px-6 py-3">{col.label}</th>
            ))}
            {rowActions && <th scope="col" className="px-6 py-3 text-center">Aksi</th>}
          </tr>
        </thead>
        <tbody className={tbodyClassName}>
          {loading && (
            <tr><td colSpan={colSpan} className="px-6 py-6 text-center text-gray-400">Memuat data...</td></tr>
          )}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={colSpan} className="px-6 py-6 text-center text-gray-400">Belum ada data barang.</td></tr>
          )}
          {!loading && rows.map((item, index) => (
            <tr
              key={item.id}
              className={rowClassName(item, index)}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? (event) => {
                if ((event.target as Element).closest('button, a, input, select, textarea, label, [data-row-click-ignore]')) return;
                onRowClick(item);
              } : undefined}
              onKeyDown={onRowClick ? (event) => {
                if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
                event.preventDefault();
                onRowClick(item);
              } : undefined}
            >
              {selection && (
                <td className="px-4 py-3">
                  <input type="checkbox" aria-label={`Pilih ${item.name}`} checked={selection.selected.has(item.id)} onChange={() => selection.onToggleRow(item)} className={selection.checkboxClassName} />
                </td>
              )}
              <td className="px-6 py-3 text-gray-500">{index + 1}</td>
              <td className="px-6 py-3">
                <ItemPhoto item={item} canUpload={photo.canUpload} onUploaded={photo.onUploaded} />
              </td>
              {visibleColumns.map((col) => col.cell && (
                <td key={col.label} className={col.tdClassName ?? 'px-6 py-3'}>{col.cell(item, index)}</td>
              ))}
              {rowActions && <td className="px-6 py-3 text-center">{rowActions(item)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollableTable>
  );
}

export function getCategoryColor(kategori: string) {
  if (!kategori) return 'bg-gray-100 text-gray-700 border-gray-200/50';
  switch (kategori.toLowerCase()) {
    case 'lembaran': return 'bg-blue-100 text-blue-700 border-blue-200/50';
    case 'kayu solid': return 'bg-amber-100 text-amber-700 border-amber-200/50';
    case 'logam': return 'bg-slate-100 text-slate-700 border-slate-200/50';
    case 'finishing': return 'bg-teal-100 text-teal-700 border-teal-200/50';
    case 'aksesoris': return 'bg-pink-100 text-pink-700 border-pink-200/50';
    default: return 'bg-purple-100 text-purple-700 border-purple-200/50';
  }
}

export function KategoriBadge({ category }: { category: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(category)}`}>
      {category || '-'}
    </span>
  );
}

export function StokCell({ stock }: { stock: number }) {
  return (
    <span className={`font-bold ${stock < 20 ? 'text-red-600' : stock < 50 ? 'text-amber-600' : 'text-gray-800'}`}>
      {stock}
    </span>
  );
}

export function SupplierCell({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-600">
      <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
        {name.charAt(0)}
      </div>
      <span>{name}</span>
    </div>
  );
}

// Harga terbaru, dengan tanggal harga menempel di baris kedua bila backend mengirimnya.
export function HargaCell({ price, updatedAt }: { price: number; updatedAt?: string | null }) {
  return (
    <div className="flex flex-col">
      <span>{price.toLocaleString('id-ID')}</span>
      {updatedAt && <span className="text-xs text-gray-400">per {displayDate(updatedAt)}</span>}
    </div>
  );
}
