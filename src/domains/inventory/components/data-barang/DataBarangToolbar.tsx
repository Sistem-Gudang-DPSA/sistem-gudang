import type { ReactNode } from 'react';
import { Search, Filter } from 'lucide-react';

const SEARCH_INPUT_CLASS = "block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all";

type Props = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchInputClassName?: string;
  // tombol aksi massal dan ekspor, di kiri tombol filter
  bulkActions?: ReactNode;
  filter?: ReactNode;
  // tombol di kanan tombol filter (tambah data)
  trailing?: ReactNode;
};

export default function DataBarangToolbar({ searchValue, onSearchChange, searchInputClassName = SEARCH_INPUT_CLASS, bulkActions, filter, trailing }: Props) {
  return (
    <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="relative max-w-md w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchValue}
          maxLength={100}
          onChange={(e) => onSearchChange(e.target.value)}
          className={searchInputClassName}
          placeholder="Cari kode atau nama barang..."
        />
      </div>
      <div className="flex items-center gap-2">
        {bulkActions}
        {filter}
        {trailing}
      </div>
    </div>
  );
}

// Tombol Filter yang membuka panel filter (Gudang dan Superadmin); jumlah filter aktif ditampilkan di label.
export function FilterToggle({ open, count, onToggle }: { open: boolean; count: number; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors text-sm font-medium ${open || count > 0 ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
    >
      <Filter className="w-4 h-4" />
      <span>Filter{count > 0 ? ` (${count})` : ''}</span>
    </button>
  );
}
