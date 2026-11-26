"use client";

import StockNotificationDetail from '@/domains/inventory/components/data-barang/StockNotificationDetail';

import StokMinimumCell from '@/domains/inventory/components/data-barang/StokMinimumCell';
import { useState } from 'react';
import { downloadCsv } from '@/shared/lib/csv';
import { useCan } from '@/domains/auth/user-context';
import { ExportExcellButton } from '@/shared/components/Tombol';
import TableFooter from '@/shared/components/TableFooter';
import SelectionBanner from '@/shared/components/SelectionBanner';
import BarangFilterPanel, { countActiveFilters } from '@/domains/inventory/components/BarangFilterPanel';
import { useDataBarang } from '@/domains/inventory/components/data-barang/useDataBarang';
import DataBarangTable, { type BarangColumn, HargaCell, KategoriBadge, StokCell, SupplierCell } from '@/domains/inventory/components/data-barang/DataBarangTable';
import DataBarangToolbar, { FilterToggle } from '@/domains/inventory/components/data-barang/DataBarangToolbar';
import BulkSupplierAction, { type SupplierMappingResult } from '@/domains/inventory/components/data-barang/BulkSupplierAction';
import Link from 'next/link';

export default function DataBarangPurchasing() {
  const canView = useCan('item.view');
  // PUT /items/:id menolak perubahan supplierId tanpa item.update + item.set-supplier.
  const canUpdateItem = useCan('item.update');
  const canSetSupplier = useCan('item.set-supplier');
  const canAssignSupplier = canUpdateItem && canSetSupplier;
  const d = useDataBarang();
  const { dataBarang, total, supplierName, locationCode, reload, selected, setSelected, clearSelection, toggleRow, toggleAll, allSelected } = d;

  const [exportError, setExportError] = useState('');
  const [supplierNotice, setSupplierNotice] = useState<{ text: string; failed: boolean } | null>(null);
  const error = d.error || exportError;

  const handleSupplierFinished = (result: SupplierMappingResult) => {
    const failedIds = new Set(result.failed.map((f) => f.id));
    // Barang yang gagal tetap tercentang supaya bisa dicoba ulang.
    setSelected(new Map([...selected.entries()].filter(([id]) => failedIds.has(id))));
    const failedText = result.failed.map((f) => `${f.name}: ${f.reason}`).join('; ');
    setSupplierNotice({
      text: `${result.assigned} barang dipetakan ke ${result.supplierName}.${failedText ? ` Gagal: ${failedText}` : ''}`,
      failed: result.failed.length > 0,
    });
    reload();
  };

  // Semua barang sesuai pencarian/filter aktif sudah dimuat, jadi export mencakup seluruhnya.
  const handleExportCSV = () => {
    setExportError('');
    try {
      const rows: unknown[][] = [['No', 'Kode Barang', 'Nama Barang', 'Supplier', 'Jumlah Stok', 'Satuan', 'Kategori', 'Harga', 'Lokasi']];
      dataBarang.forEach((item, index) => rows.push([index + 1, item.code ?? '-', item.name, supplierName(item.supplierId), item.stock, item.unit, item.category, item.price, locationCode(item.locationId)]));
      downloadCsv('Data_Barang_Purchasing.csv', rows);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Gagal export data barang.');
    }
  };

  const columns: BarangColumn[] = [
    { label: 'Kode Barang', tdClassName: 'px-6 py-4 font-mono text-xs text-gray-500', cell: (item) => item.code ?? '-' },
    { label: 'Informasi Barang', sortKey: 'name', tdClassName: 'px-6 py-4 font-bold text-gray-900', cell: (item) => item.name },
    { label: 'Supplier', hidden: true, sortKey: 'supplierName', cell: (item) => <SupplierCell name={supplierName(item.supplierId)} /> },
    { label: 'Stok', sortKey: 'stock', cell: (item) => <StokCell stock={item.stock} /> },
    // Stok minimum diatur PPIC; Purchasing hanya melihat nilainya.
    { label: 'Stok Minimum', cell: (item) => <StokMinimumCell item={item} onSaved={reload} readOnly /> },
    { label: 'Satuan', tdClassName: 'px-6 py-4 text-gray-600', cell: (item) => item.unit },
    { label: 'Kategori', sortKey: 'category', cell: (item) => <KategoriBadge category={item.category} /> },
    { label: 'Harga Terbaru', sortKey: 'price', tdClassName: 'px-6 py-4 text-gray-700', cell: (item) => <HargaCell price={item.price} updatedAt={item.priceUpdatedAt} /> },
    { label: 'Lokasi', sortKey: 'locationCode', cell: (item) => (
      <span className="inline-flex items-center gap-1 text-gray-600 font-medium">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
        {locationCode(item.locationId)}
      </span>
    ) },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <StockNotificationDetail />
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">Data Barang</h1>
          <p className="text-gray-500 text-sm">Kelola master data barang, material, dan stok inventaris Purchasing.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <DataBarangToolbar
          searchValue={d.searchQuery}
          onSearchChange={d.setSearchQuery}
          searchInputClassName="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 sm:text-sm transition-all"
          bulkActions={<>
            <BulkSupplierAction
              selected={selected}
              suppliers={d.suppliers}
              canAssignSupplier={canAssignSupplier}
              onFinished={handleSupplierFinished}
            />
            <ExportExcellButton onClick={handleExportCSV} disabled={d.loading || dataBarang.length === 0} />
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

        {error && (
          <div className="mx-5 mt-5 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
        )}

        {supplierNotice && (
          <div
            role="status"
            className={`mx-5 mt-5 p-3 text-sm rounded-lg ${supplierNotice.failed ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}
          >
            {supplierNotice.text}
          </div>
        )}

        <DataBarangTable
          rows={dataBarang}
          loading={d.loading}
          columns={columns}
          sort={d.sort}
          onSort={d.toggle}
          photo={{ canUpload: false }}
          selection={canAssignSupplier ? {
            selected,
            allSelected,
            onToggleRow: toggleRow,
            onToggleAll: toggleAll,
            disableAllWhenEmpty: true,
          } : undefined}
          rowActions={canView ? (item) => (
            <Link href={`/dashboard/purchasing/master/data-barang/${item.id}`} aria-label={`Detail supplier ${item.name}`} className="rounded-lg border border-purple-100 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100">
              Detail
            </Link>
          ) : undefined}
          rowClassName={() => 'hover:bg-purple-50/30 transition-colors group'}
          tbodyClassName="divide-y divide-gray-50"
        />
        <TableFooter total={total} unit="barang" />
      </div>

    </div>
  );
}
