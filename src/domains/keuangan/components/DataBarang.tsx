"use client";

import { useState } from 'react';
import { downloadCsv } from '@/shared/lib/csv';
import { ExportExcellButton } from '@/shared/components/Tombol';
import TableFooter from '@/shared/components/TableFooter';
import SelectionBanner from '@/shared/components/SelectionBanner';
import { printItemLabels } from '@/domains/inventory/label-print';
import BarangFilterPanel, { countActiveFilters } from '@/domains/inventory/components/BarangFilterPanel';
import { useDataBarang } from '@/domains/inventory/components/data-barang/useDataBarang';
import DataBarangTable, { type BarangColumn, HargaCell, KategoriBadge, StokCell } from '@/domains/inventory/components/data-barang/DataBarangTable';
import DataBarangToolbar, { FilterToggle } from '@/domains/inventory/components/data-barang/DataBarangToolbar';

export default function DataBarangGudang() {
  const d = useDataBarang();
  const { dataBarang, total, selected, clearSelection, supplierName, locationCode } = d;
  const [printError, setPrintError] = useState("");

  // only items with a code have a label to print
  const selectedPrintable = [...selected.values()].filter((it) => it.code);
  const printSelected = async () => setPrintError(await printItemLabels(selectedPrintable) ?? "");

  // Semua barang sesuai pencarian/filter aktif sudah dimuat, jadi export mencakup seluruhnya.
  const handleExportExcel = () => {
    setPrintError("");
    try {
      const rows: unknown[][] = [['No', 'Kode Barang', 'Nama Barang', 'Supplier', 'Jumlah Stok', 'Satuan', 'Kategori', 'Harga', 'Lokasi']];
      dataBarang.forEach((item, index) => rows.push([index + 1, item.code ?? '-', item.name, supplierName(item.supplierId), item.stock, item.unit, item.category, item.price, locationCode(item.locationId)]));
      downloadCsv('Data_Barang_Keuangan.csv', rows);
    } catch (err) {
      setPrintError(err instanceof Error ? err.message : "Gagal export data barang.");
    }
  };

  const columns: BarangColumn[] = [
    { label: 'Kode Barang', tdClassName: 'px-6 py-4 font-mono text-xs text-gray-500', cell: (item) => item.code ?? '-' },
    { label: 'Informasi Barang', sortKey: 'name', tdClassName: 'px-6 py-4 font-bold text-gray-900', cell: (item) => item.name },
    { label: 'Stok', sortKey: 'stock', cell: (item) => <StokCell stock={item.stock} /> },
    { label: 'Satuan', tdClassName: 'px-6 py-4 text-gray-600', cell: (item) => item.unit },
    { label: 'Kategori', sortKey: 'category', cell: (item) => <KategoriBadge category={item.category} /> },
    { label: 'Harga Terbaru', sortKey: 'price', align: 'right', tdClassName: 'px-6 py-4 text-gray-700', cell: (item) => <HargaCell price={item.price} updatedAt={item.priceUpdatedAt} /> },
    { label: 'Lokasi', sortKey: 'locationCode', cell: (item) => (
      <span className="inline-flex items-center gap-1 text-gray-600 font-medium">
        <div className="w-1.5 h-1.5 rounded-full bg-[#FF8A00]"></div>
        {locationCode(item.locationId)}
      </span>
    ) },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">Data Barang</h1>
          <p className="text-gray-500 text-sm">Kelola master data barang dan lokasi inventaris gudang.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <DataBarangToolbar
          searchValue={d.searchQuery}
          onSearchChange={d.setSearchQuery}
          bulkActions={<>
            <button
              type="button"
              onClick={printSelected}
              disabled={selectedPrintable.length === 0}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
            </button>
            <ExportExcellButton onClick={handleExportExcel} disabled={d.loading || dataBarang.length === 0} />
          </>}
          filter={<FilterToggle open={d.showFilter} count={countActiveFilters(d.filters)} onToggle={() => d.setShowFilter((v) => !v)} />}
        />

        {d.showFilter && (
          <BarangFilterPanel
            value={d.filters}
            onChange={d.setFilters}
            categories={d.categories}
            units={d.units}
            suppliers={d.suppliers}
            locations={d.locations}
          />
        )}

        <SelectionBanner count={selected.size} onClear={clearSelection} />

        {(d.error || printError) && (
          <div className="mx-5 mt-5 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{d.error || printError}</div>
        )}

        <DataBarangTable
          rows={dataBarang}
          loading={d.loading}
          columns={columns}
          sort={d.sort}
          onSort={d.toggle}
          photo={{ canUpload: false }}
          selection={{
            selected,
            allSelected: d.allSelected,
            onToggleRow: d.toggleRow,
            onToggleAll: d.toggleAll,
            disableAllWhenEmpty: true,
          }}
          rowClassName={() => 'hover:bg-[#FF8A00]/5 transition-colors group'}
          tbodyClassName="divide-y divide-gray-50"
        />

        <TableFooter total={total} unit="barang" />
      </div>
    </div>
  );
}
