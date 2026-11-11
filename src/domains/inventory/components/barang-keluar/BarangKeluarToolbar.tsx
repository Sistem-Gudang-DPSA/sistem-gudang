import { FileUp, Filter, Plus, Printer, Search } from "lucide-react";
import DateFilter from "@/shared/components/DateFilter";
import { orangeButtonClass } from "./styles";
import type { ModeKeluar } from "./types";

type Props = {
  searchQuery: string;
  onSearch: (value: string) => void;
  printing: boolean;
  printDisabled: boolean;
  onPrint: () => void;
  canCreate: boolean;
  onOpenForm: (mode: ModeKeluar) => void;
  canExport: boolean;
  downloading: boolean;
  exportDisabled: boolean;
  onExport: () => void;
  showFilter: boolean;
  onToggleFilter: () => void;
  day: string;
  month: string;
  year: string;
  onDayChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onResetFilter: () => void;
};

export default function BarangKeluarToolbar(p: Props) {
  const activeDateFilters = [p.day, p.month, p.year].filter(Boolean).length;
  return (
    <>
      <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative w-full max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            id="barang-keluar-cari"
            type="text"
            value={p.searchQuery}
            maxLength={100}
            onChange={(e) => p.onSearch(e.target.value)}
            placeholder="Silahkan cari data"
            aria-label="Cari barang keluar"
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all shadow-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto lg:justify-end">
          <button type="button" onClick={p.onPrint} disabled={p.printDisabled} className={orangeButtonClass}>
            <Printer className="w-4 h-4" />
            <span>{p.printing ? "Menyiapkan cetak..." : "Print"}</span>
          </button>
          {p.canCreate && (
            <>
              <button type="button" onClick={() => p.onOpenForm("spk")} className={orangeButtonClass}>
                <Plus className="w-4 h-4" />
                <span>Barang Keluar SPK</span>
              </button>

              <button type="button" onClick={() => p.onOpenForm("stok")} className={orangeButtonClass}>
                <Plus className="w-4 h-4" />
                <span>Barang Keluar Stok / Internal</span>
              </button>
            </>
          )}

          {p.canExport && (
            <button type="button" onClick={p.onExport} disabled={p.exportDisabled} className={orangeButtonClass}>
              <FileUp className="h-4 w-4" />
              <span>{p.downloading ? "Mengekspor..." : "Export"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={p.onToggleFilter}
            aria-expanded={p.showFilter}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-colors text-sm font-semibold ${p.showFilter || activeDateFilters > 0
              ? "bg-orange-50 border-orange-300 text-orange-700"
              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filter{activeDateFilters > 0 ? ` (${activeDateFilters})` : ""}</span>
          </button>
        </div>
      </div>

      {p.showFilter && (
        <DateFilter
          day={p.day}
          month={p.month}
          year={p.year}
          onDayChange={p.onDayChange}
          onMonthChange={p.onMonthChange}
          onYearChange={p.onYearChange}
          onReset={p.onResetFilter}
        />
      )}
    </>
  );
}
