"use client";

import StockNotificationDetail from '@/domains/inventory/components/data-barang/StockNotificationDetail';

import StokMinimumCell from '@/domains/inventory/components/data-barang/StokMinimumCell';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { listItems, updateItem } from '@/domains/inventory/api';
import type { ItemListRow } from '@/domains/inventory/types';
import { downloadCsv } from '@/shared/lib/csv';
import { ApiError } from '@/shared/lib/api-client';
import { fetchAllPages } from '@/shared/lib/fetch-all';
import { digitsOnly, INTEGER_INPUT } from '@/shared/lib/input';
import { useCan } from '@/domains/auth/user-context';
import Pagination from '@/shared/components/Pagination';
import { ExportExcellButton } from '@/shared/components/Tombol';
import BarangFilterPanel, { countActiveFilters, toItemFilterParams } from '@/domains/inventory/components/BarangFilterPanel';
import { useDataBarang } from '@/domains/inventory/components/data-barang/useDataBarang';
import DataBarangTable, { type BarangColumn, KategoriBadge, StokCell, SupplierCell } from '@/domains/inventory/components/data-barang/DataBarangTable';
import DataBarangToolbar, { FilterToggle } from '@/domains/inventory/components/data-barang/DataBarangToolbar';
import BulkSupplierAction, { type SupplierMappingResult } from '@/domains/inventory/components/data-barang/BulkSupplierAction';

export default function DataBarangPurchasing() {
  // PUT /items/:id needs item.update, and changing the price also needs item.set-price.
  const canUpdateItem = useCan('item.update');
  const canSetPrice = useCan('item.set-price');
  const canEditPrice = canUpdateItem && canSetPrice;
  const canSetSupplier = useCan('item.set-supplier');
  // PUT /items/:id menolak perubahan supplierId tanpa item.set-supplier.
  const canAssignSupplier = canUpdateItem && canSetSupplier;
  const d = useDataBarang();
  const { dataBarang, supplierName, locationCode, reload, selected, setSelected, toggleRow, togglePage, pageAllSelected } = d;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ supplierId: '', price: '' });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
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

  const handleEdit = (item: ItemListRow) => {
    setEditingId(item.id);
    setFormData({ supplierId: item.supplierId === null ? '' : String(item.supplierId), price: String(item.price) });
    setModalError("");
    setIsModalOpen(true);
  };

  const handleSimpan = async () => {
    if (!editingId || !formData.supplierId || !formData.price) {
      setModalError('Mohon lengkapi semua data!');
      return;
    }
    setSaving(true);
    setModalError("");
    try {
      await updateItem(editingId, {
        price: Number(formData.price),
        supplierId: Number(formData.supplierId),
      });
      reload();
      setIsModalOpen(false);
      setEditingId(null);
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Gagal menyimpan data.");
    } finally {
      setSaving(false);
    }
  };

  // Semua barang sesuai pencarian/filter aktif, bukan hanya halaman yang tampil
  const handleExportCSV = async () => {
    setExportError('');
    try {
      const all = await fetchAllPages((p) => listItems({ page: p, pageSize: 100, search: d.debouncedSearch || undefined, ...toItemFilterParams(d.filters), ...d.sortParams }));
      const rows: unknown[][] = [['No', 'Kode Barang', 'Kode Bawaan', 'Nama Barang', 'Supplier', 'Jumlah Stok', 'Satuan', 'Kategori', 'Harga', 'Lokasi']];
      all.forEach((item, index) => rows.push([index + 1, item.code ?? '-', item.externalCode ?? '-', item.name, supplierName(item.supplierId), item.stock, item.unit, item.category, item.price, locationCode(item.locationId)]));
      downloadCsv('Data_Barang_Purchasing.csv', rows);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Gagal export data barang.');
    }
  };

  const columns: BarangColumn[] = [
    { label: 'Kode Barang', tdClassName: 'px-6 py-4 font-mono text-xs text-gray-500', cell: (item) => item.code ?? '-' },
    { label: 'Informasi Barang', sortKey: 'name', tdClassName: 'px-6 py-4 font-bold text-gray-900', cell: (item) => item.name },
    { label: 'Kode Bawaan', tdClassName: 'px-6 py-4 text-gray-600', cell: (item) => item.externalCode || '-' },
    { label: 'Supplier', sortKey: 'supplierName', cell: (item) => <SupplierCell name={supplierName(item.supplierId)} /> },
    { label: 'Stok', sortKey: 'stock', cell: (item) => <StokCell stock={item.stock} /> },
    // Stok minimum diatur PPIC; Purchasing hanya melihat nilainya.
    { label: 'Stok Minimum', cell: (item) => <StokMinimumCell item={item} onSaved={reload} readOnly /> },
    { label: 'Satuan', tdClassName: 'px-6 py-4 text-gray-600', cell: (item) => item.unit },
    { label: 'Kategori', sortKey: 'category', cell: (item) => <KategoriBadge category={item.category} /> },
    { label: 'Harga (Rp)', sortKey: 'price', align: 'right', tdClassName: 'px-6 py-4 text-right font-mono text-gray-700', cell: (item) => item.price },
    { label: 'Lokasi', sortKey: 'locationCode', cell: (item) => (
      <span className="inline-flex items-center gap-1 text-gray-600 font-medium">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
        {locationCode(item.locationId)}
      </span>
    ) },
    { label: 'Keterangan', sortKey: 'detail', tdClassName: 'px-6 py-4 text-gray-600', cell: (item) => item.detail || '-' },
  ];

  const renderRowActions = (item: ItemListRow) => canEditPrice && (
    <button
      onClick={() => handleEdit(item)}
      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#FF8A00] hover:bg-orange-600 rounded-lg transition-all shadow-sm w-full max-w-27.5 mx-auto"
    >
      <Plus className="w-3.5 h-3.5" />
      Lengkapi
    </button>
  );

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
          colSpan={canAssignSupplier ? 15 : 14}
          columns={columns}
          sort={d.sort}
          onSort={d.toggle}
          photo={{ canUpload: false }}
          selection={canAssignSupplier ? {
            selected,
            allOnPage: pageAllSelected,
            onToggleRow: toggleRow,
            onToggleAll: togglePage,
            disableAllWhenEmpty: true,
          } : undefined}
          rowActions={renderRowActions}
          rowClassName={() => 'hover:bg-purple-50/30 transition-colors group'}
          tbodyClassName="divide-y divide-gray-50"
        />
        <Pagination page={d.page} pageSize={d.pageSize} total={d.total} onPageChange={d.setPage} activeClass="bg-teal-500 text-white border-teal-500" />
      </div>

      {/* Modal Lengkapi Data */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6 uppercase tracking-wide">DATA BARANG</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-[15px] font-medium text-gray-800 mb-2 font-sans">Suplier</label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors font-sans"
                >
                  <option value="" disabled>Pilih supplier</option>
                  {d.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[15px] font-medium text-gray-800 mb-2 font-sans">Harga</label>
                <input
                  {...INTEGER_INPUT}
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: digitsOnly(e.target.value)})}
                  maxLength={9}
                  placeholder="Masukan Jumlah"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors font-sans"
                />
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{modalError}</div>
            )}

            <div className="flex justify-end gap-4 mt-2">
              <button
                onClick={() => { setIsModalOpen(false); setEditingId(null); }}
                className="px-8 py-2.5 border-2 border-[#FF8A00] text-[#FF8A00] font-semibold rounded-lg hover:bg-orange-50 transition-colors font-sans"
              >
                Batal
              </button>
              <button
                onClick={handleSimpan}
                disabled={saving}
                className="px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-lg hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-colors font-sans disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
