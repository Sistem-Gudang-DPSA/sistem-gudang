import type { ReactNode } from 'react';
import SortableTh, { type Sort } from '@/shared/components/SortableTh';
import ItemPhoto from '@/domains/inventory/components/ItemPhoto';
import type { ItemListRow } from '@/domains/inventory/types';

export type BarangColumn = {
  label: string;
  sortKey?: string;
  align?: 'left' | 'right' | 'center';
  tdClassName?: string;
  // tanpa cell hanya kepala kolom; dipakai PPIC untuk header "Stok & Satuan" yang tidak punya sel
  cell?: (item: ItemListRow, index: number) => ReactNode;
};

export type BarangSelection = {
  selected: Map<number, ItemListRow>;
  allOnPage: boolean;
  onToggleRow: (item: ItemListRow) => void;
  onToggleAll: () => void;
  checkboxClassName?: string;
  disableAllWhenEmpty?: boolean;
};

type Props = {
  rows: ItemListRow[];
  loading: boolean;
  colSpan: number;
  columns: BarangColumn[];
  sort: Sort;
  onSort: (by: string) => void;
  numberOffset?: number;
  photo: { canUpload: boolean; onUploaded?: () => void };
  selection?: BarangSelection;
  rowActions?: (item: ItemListRow) => ReactNode;
  rowClassName: (item: ItemListRow, index: number) => string;
  tbodyClassName?: string;
};

// Tabel Data Barang: kolom No, Foto, kolom per peran, dan Aksi. Kolom centang hanya bila `selection` diisi.
export default function DataBarangTable({ rows, loading, colSpan, columns, sort, onSort, numberOffset = 0, photo, selection, rowActions, rowClassName, tbodyClassName }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
          <tr>
            {selection && (
              <th scope="col" className="px-4 py-4">
                <input type="checkbox" aria-label="Pilih semua barang di halaman ini" checked={selection.allOnPage} disabled={!!selection.disableAllWhenEmpty && rows.length === 0} onChange={selection.onToggleAll} className={selection.checkboxClassName} />
              </th>
            )}
            <th scope="col" className="px-6 py-4">No</th>
            <th scope="col" className="px-6 py-4">Foto</th>
            {columns.map((col) => col.sortKey ? (
              <SortableTh key={col.label} label={col.label} sortKey={col.sortKey} sort={sort} onSort={onSort} align={col.align} />
            ) : (
              <th key={col.label} scope="col" className="px-6 py-4">{col.label}</th>
            ))}
            {rowActions && <th scope="col" className="px-6 py-4 text-center">Aksi</th>}
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
            <tr key={item.id} className={rowClassName(item, index)}>
              {selection && (
                <td className="px-4 py-4">
                  <input type="checkbox" aria-label={`Pilih ${item.name}`} checked={selection.selected.has(item.id)} onChange={() => selection.onToggleRow(item)} className={selection.checkboxClassName} />
                </td>
              )}
              <td className="px-6 py-4 text-gray-500">{numberOffset + index + 1}</td>
              <td className="px-6 py-4">
                <ItemPhoto item={item} canUpload={photo.canUpload} onUploaded={photo.onUploaded} />
              </td>
              {columns.map((col) => col.cell && (
                <td key={col.label} className={col.tdClassName ?? 'px-6 py-4'}>{col.cell(item, index)}</td>
              ))}
              {rowActions && <td className="px-6 py-4 text-center">{rowActions(item)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
