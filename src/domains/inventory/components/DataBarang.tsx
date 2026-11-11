"use client";

import { useState } from 'react';
import { useCan } from '@/domains/auth/user-context';
import { Plus, Edit2, QrCode } from 'lucide-react';
import { assignItemLocation, bulkAssignItemLocation } from '@/domains/inventory/api';
import type { ItemListRow } from '@/domains/inventory/types';
import { ApiError } from '@/shared/lib/api-client';
import Pagination from '@/shared/components/Pagination';
import { ExportExcellButton } from '@/shared/components/Tombol';
import { printItemLabels } from '@/domains/inventory/label-print';
import BarangFilterPanel, { countActiveFilters } from './BarangFilterPanel';
import { useDataBarang } from './data-barang/useDataBarang';
import DataBarangTable, { type BarangColumn, KategoriBadge, StokCell, SupplierCell } from './data-barang/DataBarangTable';
import DataBarangToolbar, { FilterToggle } from './data-barang/DataBarangToolbar';
import { LokasiBulkModal, LokasiModal } from './data-barang/modals/LokasiModal';

export default function DataBarangGudang({
  paginationActiveClass,
}: {
  paginationActiveClass?: string;
}) {
  const canAssign = useCan('item.assign-location');
  const d = useDataBarang();
  const { dataBarang, total, page, pageSize, setPage, selected, setSelected, supplierName, locationCode, reload } = d;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<ItemListRow | null>(null);
  const [modalLocationId, setModalLocationId] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [printError, setPrintError] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLocationId, setBulkLocationId] = useState("");
  const [notice, setNotice] = useState("");

  const openAssignModal = (item: ItemListRow) => {
    setActiveItem(item);
    setModalLocationId("");
    setModalError("");
    setIsModalOpen(true);
  };

  const handleSimpanLokasi = async () => {
    if (!activeItem || !modalLocationId) {
      setModalError("Pilih lokasi.");
      return;
    }
    setSaving(true);
    setModalError("");
    try {
      await assignItemLocation(activeItem.id, { locationId: Number(modalLocationId) });
      reload();
      setIsModalOpen(false);
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Gagal menyimpan lokasi barang.");
    } finally {
      setSaving(false);
    }
  };

  // only items with a code have a label to print
  const selectedItems = [...selected.values()];
  const selectedPrintable = selectedItems.filter((it) => it.code);
  const selectedWithLocation = selectedItems.filter((it) => it.locationId !== null).length;
  const printLabels = async (items: ItemListRow[]) => setPrintError(await printItemLabels(items) ?? "");
  const printSelected = () => printLabels(selectedPrintable);

  const handleBulkAssign = async () => {
    if (!bulkLocationId) {
      setModalError("Pilih lokasi.");
      return;
    }
    setSaving(true);
    setModalError("");
    try {
      const res = await bulkAssignItemLocation({ itemIds: [...selected.keys()], locationId: Number(bulkLocationId) });
      const gagal = res.failed.map((f) => `${selected.get(f.id)?.name ?? `#${f.id}`}: ${f.reason}`).join("; ");
      setNotice(`${res.assigned} barang dipindahkan ke lokasi ${locationCode(Number(bulkLocationId))}${gagal ? `. Gagal: ${gagal}` : ""}`);
      setSelected(new Map());
      setBulkOpen(false);
      reload();
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Gagal menyimpan lokasi barang.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = () => {
    const headers = ['No,Kode Barang,Kode Bawaan,Nama Barang,Supplier,Jumlah Stok,Satuan,Kategori,Lokasi'];
    const csvData = dataBarang.map((item, index) =>
      `${index + 1},${item.code ?? '-'},"${item.externalCode ?? '-'}","${item.name}","${supplierName(item.supplierId)}",${item.stock},${item.unit},${item.category},${locationCode(item.locationId)}`
    );
    const csvString = [...headers, ...csvData].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Data_Barang_Gudang.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: BarangColumn[] = [
    { label: 'Kode Barang', tdClassName: 'px-6 py-4 font-mono text-xs text-gray-500', cell: (item) => item.code ?? '-' },
    { label: 'Informasi Barang', sortKey: 'name', tdClassName: 'px-6 py-4 font-bold text-gray-900', cell: (item) => item.name },
    { label: 'Kode Bawaan', tdClassName: 'px-6 py-4 text-gray-600', cell: (item) => item.externalCode || '-' },
    { label: 'Supplier', sortKey: 'supplierName', cell: (item) => <SupplierCell name={supplierName(item.supplierId)} /> },
    { label: 'Stok', sortKey: 'stock', cell: (item) => <StokCell stock={item.stock} /> },
    { label: 'Satuan', tdClassName: 'px-6 py-4 text-gray-600', cell: (item) => item.unit },
    { label: 'Kategori', sortKey: 'category', cell: (item) => <KategoriBadge category={item.category} /> },
    { label: 'Lokasi', sortKey: 'locationCode', cell: (item) => (
      <span className="inline-flex items-center gap-1 text-gray-600 font-medium">
        <div className="w-1.5 h-1.5 rounded-full bg-[#FF8A00]"></div>
        {locationCode(item.locationId)}
      </span>
    ) },
    { label: 'Keterangan', sortKey: 'detail', tdClassName: 'px-6 py-4 text-gray-600', cell: (item) => item.detail || '-' },
  ];

  const renderRowActions = (item: ItemListRow) => (
    <div className="flex items-center justify-center gap-2">
      {item.locationId === null && canAssign ? (
        <button
          onClick={() => openAssignModal(item)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#FF8A00]/10 text-[#FF8A00] text-xs font-bold rounded-lg hover:bg-[#FF8A00]/20 transition-all duration-200 opacity-90 group-hover:opacity-100"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          Tambah Lokasi
        </button>
      ) : canAssign && (
        <button
          onClick={() => openAssignModal(item)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#FF8A00]/10 text-[#FF8A00] text-xs font-bold rounded-lg hover:bg-[#FF8A00]/20 transition-all duration-200 opacity-90 group-hover:opacity-100"
        >
          <Edit2 className="w-3.5 h-3.5" strokeWidth={2.5} />
          Edit Lokasi
        </button>
      )}
      {item.code && <button
        onClick={() => printLabels([item])}
        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-100 transition-all duration-200 opacity-90 group-hover:opacity-100"
        title="Cetak label QR"
      >
        <QrCode className="w-3.5 h-3.5" strokeWidth={2.5} />
        QR
      </button>}
    </div>
  );

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
              <QrCode className="w-4 h-4" />
              <span>Cetak Label QR{selectedPrintable.length > 0 ? ` (${selectedPrintable.length})` : ''}</span>
            </button>
            {canAssign && (
              <button
                type="button"
                onClick={() => { setBulkLocationId(""); setModalError(""); setBulkOpen(true); }}
                disabled={selected.size === 0}
                className="flex items-center gap-2 px-3 py-2 border border-[#FF8A00] rounded-lg bg-white text-[#FF8A00] hover:bg-orange-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                <span>Atur Lokasi{selected.size > 0 ? ` (${selected.size})` : ''}</span>
              </button>
            )}
            <ExportExcellButton onClick={handleExportExcel} />
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

        {notice && (
          <div className="mx-5 mt-5 p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-start justify-between gap-3">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} aria-label="Tutup notifikasi" className="font-bold leading-none text-green-700 hover:text-green-900">×</button>
          </div>
        )}

        {(d.error || printError) && (
          <div className="mx-5 mt-5 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{d.error || printError}</div>
        )}

        <DataBarangTable
          rows={dataBarang}
          loading={d.loading}
          colSpan={13}
          columns={columns}
          sort={d.sort}
          onSort={d.toggle}
          photo={{ canUpload: false }}
          selection={{
            selected,
            allOnPage: d.pageAllSelected,
            onToggleRow: d.toggleRow,
            onToggleAll: d.togglePage,
            disableAllWhenEmpty: true,
          }}
          rowActions={renderRowActions}
          rowClassName={() => 'hover:bg-[#FF8A00]/5 transition-colors group'}
          tbodyClassName="divide-y divide-gray-50"
        />

        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} activeClass={paginationActiveClass} />
      </div>

      {bulkOpen && (
        <LokasiBulkModal
          count={selected.size}
          withLocation={selectedWithLocation}
          locations={d.locations}
          value={bulkLocationId}
          onChange={setBulkLocationId}
          onSave={handleBulkAssign}
          onClose={() => setBulkOpen(false)}
          saving={saving}
          error={modalError}
        />
      )}

      {isModalOpen && activeItem && (
        <LokasiModal
          itemName={activeItem.name}
          locations={d.locations}
          value={modalLocationId}
          onChange={setModalLocationId}
          onSave={handleSimpanLokasi}
          onClose={() => setIsModalOpen(false)}
          saving={saving}
          error={modalError}
        />
      )}
    </div>
  );
}
