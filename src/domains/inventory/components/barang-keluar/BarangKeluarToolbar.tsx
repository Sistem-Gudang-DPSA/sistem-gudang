import Modal from "@/shared/components/Modal";
import { ArrowRight, ClipboardList, FileUp, Filter, Plus, Printer, Search, Warehouse } from "lucide-react";
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
  pilihJenis: boolean;
  onPilihJenis: (open: boolean) => void;
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
  const openForm = (mode: ModeKeluar) => {
    p.onPilihJenis(false);
    p.onOpenForm(mode);
  };
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
            <button type="button" onClick={() => p.onPilihJenis(true)} className={orangeButtonClass}>
              <Plus className="w-4 h-4" />
              <span>Barang Keluar</span>
            </button>
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

      {p.canCreate && p.pilihJenis && (
        <Modal title={<span className="normal-case text-lg tracking-normal">Pilih Jenis Barang Keluar</span>} onClose={() => p.onPilihJenis(false)} size="md">
          <p className="-mt-3 mb-5 text-sm text-gray-500">Pilih jenis transaksi yang ingin dicatat.</p>
          <div className="flex flex-col gap-3">
            <button type="button" aria-label="Barang Keluar SPK" onClick={() => openForm("spk")}
              className="group flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-orange-300 hover:bg-orange-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <ClipboardList aria-hidden="true" className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-gray-900">Barang Keluar SPK</span>
                <span className="mt-1 block text-xs leading-relaxed text-gray-500">Untuk kebutuhan produksi berdasarkan SPK.</span>
              </span>
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-orange-500" />
            </button>
            <button type="button" aria-label="Barang Keluar Stok / Internal" onClick={() => openForm("stok")}
              className="group flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-orange-300 hover:bg-orange-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Warehouse aria-hidden="true" className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-gray-900">Barang Keluar Stok / Internal</span>
                <span className="mt-1 block text-xs leading-relaxed text-gray-500">Untuk stok atau kebutuhan internal.</span>
              </span>
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-orange-500" />
            </button>
          </div>
        </Modal>
      )}

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
