"use client";

import { useCan } from '@/domains/auth/user-context';
import React, { useEffect, useRef, useState } from 'react';
import { Search, Plus, Filter, Edit2, QrCode } from 'lucide-react';
import { assignItemLocation, listItemCategories, listItems, listItemUnits, listLocations, suggestItemCode } from '@/domains/inventory/api';
import type { ItemListRow, Location } from '@/domains/inventory/types';
import { listSuppliers } from '@/domains/purchasing/api';
import type { Supplier } from '@/domains/purchasing/types';
import { ApiError } from '@/shared/lib/api-client';
import Pagination from '@/shared/components/Pagination';
import { useApiData } from '@/shared/lib/use-api-data';
import { ExportExcellButton } from '@/shared/components/Tombol';
import BarangFilterPanel, { countActiveFilters, emptyBarangFilters, toItemFilterParams } from '@/domains/superadmin/components/BarangFilterPanel';
import SortableTh, { useSort } from '@/shared/components/SortableTh';
import ItemPhoto from './ItemPhoto';
import { printItemLabels } from '@/domains/inventory/label-print';

export default function DataBarangGudang() {
  const canAssign = useCan('item.assign-location');
  const { sort, toggle, params: sortParams } = useSort();
  const seen = useRef(new Map<number, ItemListRow>());
  const [filters, setFilters] = useState(emptyBarangFilters);
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<ItemListRow | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [modalData, setModalData] = useState({ locationId: "", code: "" });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [printError, setPrintError] = useState("");


  const filterKey = JSON.stringify([searchQuery, filters, sortParams]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });
  const { data: loaded, loading, error, reload } = useApiData(
    () => listItems({ page, pageSize: 20, search: searchQuery || undefined, ...toItemFilterParams(filters), ...sortParams }),
    `${filterKey}|${page}`,
    "Gagal memuat data barang.",
  );
  const dataBarang = loaded?.rows ?? [];
  const total = loaded?.total ?? 0;

  useEffect(() => {
    loaded?.rows.forEach((r) => seen.current.set(r.id, r));
  }, [loaded]);

  useEffect(() => {
    listLocations().then((res) => setLocations(res.rows)).catch(() => {});
    listSuppliers().then((res) => setSuppliers(res.rows)).catch(() => {});
    listItemCategories().then((res) => setCategories(res.map((c) => c.name))).catch(() => {});
    listItemUnits().then((res) => setUnits(res.map((u) => u.name))).catch(() => {});
  }, []);

  const supplierName = (id: number | null) => suppliers.find((s) => s.id === id)?.name ?? '-';
  const locationCode = (id: number | null) => (id === null ? '-' : locations.find((loc) => loc.id === id)?.code ?? `#${id}`);

  const openAssignModal = (item: ItemListRow) => {
    setActiveItem(item);
    setModalData({ locationId: "", code: "" });
    setModalError("");
    setIsModalOpen(true);
  };

  const handlePilihLokasi = async (locationId: string) => {
    setModalData({ locationId, code: "" });
    if (!activeItem || !locationId) return;
    try {
      const suggestion = await suggestItemCode(activeItem.id, Number(locationId));
      setModalData({ locationId, code: suggestion.code });
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Gagal mengambil saran kode.");
    }
  };

  const handleSimpanLokasi = async () => {
    if (!activeItem || !modalData.locationId || !modalData.code) {
      setModalError("Pilih lokasi dan pastikan kode terisi.");
      return;
    }
    setSaving(true);
    setModalError("");
    try {
      await assignItemLocation(activeItem.id, {
        code: modalData.code,
        locationId: Number(modalData.locationId),
      });
      reload();
      setIsModalOpen(false);
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Gagal menyimpan lokasi barang.");
    } finally {
      setSaving(false);
    }
  };

  const getCategoryColor = (kategori: string) => {
    if (!kategori) return 'bg-gray-100 text-gray-700 border-gray-200/50';
    switch(kategori.toLowerCase()) {
      case 'lembaran': return 'bg-blue-100 text-blue-700 border-blue-200/50';
      case 'kayu solid': return 'bg-amber-100 text-amber-700 border-amber-200/50';
      case 'logam': return 'bg-slate-100 text-slate-700 border-slate-200/50';
      case 'finishing': return 'bg-teal-100 text-teal-700 border-teal-200/50';
      case 'aksesoris': return 'bg-pink-100 text-pink-700 border-pink-200/50';
      default: return 'bg-purple-100 text-purple-700 border-purple-200/50';
    }
  };

  const toggleSelected = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const printable = dataBarang.filter((it) => it.code);
  const allPageSelected = printable.length > 0 && printable.every((it) => selectedIds.has(it.id));
  const toggleAllOnPage = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const it of printable) { if (allPageSelected) next.delete(it.id); else next.add(it.id); }
      return next;
    });
  // `seen` keeps rows from other pages, so a selection can span pages.
  const printLabels = async (items: ItemListRow[]) => setPrintError(await printItemLabels(items) ?? "");
  const printSelected = () => printLabels([...selectedIds].map((id) => seen.current.get(id)).filter((it): it is ItemListRow => !!it));

  const handleExportExcel = () => {
    const headers = ['No,Kode Barang,Nama Barang,Supplier,Jumlah Stok,Satuan,Kategori,Lokasi'];
    const csvData = dataBarang.map((item, index) =>
      `${index + 1},${item.code ?? '-'},"${item.name}","${supplierName(item.supplierId)}",${item.stock},${item.unit},${item.category},${locationCode(item.locationId)}`
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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">Data Barang</h1>
          <p className="text-gray-500 text-sm">Kelola master data barang dan lokasi inventaris gudang.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              maxLength={100}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all"
              placeholder="Cari kode atau nama barang..."
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={printSelected}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <QrCode className="w-4 h-4" />
              <span>Cetak Label QR{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}</span>
            </button>
            <ExportExcellButton onClick={handleExportExcel} />
            <button
              type="button"
              onClick={() => setShowFilter((v) => !v)}
              aria-expanded={showFilter}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors text-sm font-medium ${showFilter || countActiveFilters(filters) > 0 ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" />
              <span>Filter{countActiveFilters(filters) > 0 ? ` (${countActiveFilters(filters)})` : ''}</span>
            </button>     
          </div>
        </div>

        {showFilter && (
          <BarangFilterPanel
            value={filters}
            onChange={setFilters}
            categories={categories}
            units={units}
            suppliers={suppliers}
            locations={locations}
          />
        )}

        {(error || printError) && (
          <div className="mx-5 mt-5 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error || printError}</div>
        )}

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-4 py-4">
                  <input type="checkbox" aria-label="Pilih semua barang berkode di halaman ini" checked={allPageSelected} disabled={printable.length === 0} onChange={toggleAllOnPage} />
                </th>
                <th scope="col" className="px-6 py-4">No</th>
                <th scope="col" className="px-6 py-4">Foto</th>
                <SortableTh label="Informasi Barang" sortKey="name" sort={sort} onSort={toggle} />
                <SortableTh label="Supplier" sortKey="supplierName" sort={sort} onSort={toggle} />
                <SortableTh label="Stok" sortKey="stock" sort={sort} onSort={toggle} />
                <th scope="col" className="px-6 py-4">Satuan</th>
                <SortableTh label="Kategori" sortKey="category" sort={sort} onSort={toggle} />
                <SortableTh label="Lokasi" sortKey="locationCode" sort={sort} onSort={toggle} />
                <SortableTh label="Keterangan" sortKey="detail" sort={sort} onSort={toggle} />
                <th scope="col" className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={11} className="px-6 py-6 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && dataBarang.length === 0 && (
                <tr><td colSpan={11} className="px-6 py-6 text-center text-gray-400">Belum ada data barang.</td></tr>
              )}
              {!loading && dataBarang.map((item, index) => (
                <tr key={item.id} className="hover:bg-[#FF8A00]/5 transition-colors group">
                  <td className="px-4 py-4">
                    <input type="checkbox" aria-label={`Pilih ${item.name} untuk cetak label`} checked={selectedIds.has(item.id)} disabled={!item.code} title={item.code ? undefined : 'Belum punya kode, tetapkan lokasi dulu'} onChange={() => toggleSelected(item.id)} />
                  </td>
                  <td className="px-6 py-4 text-gray-500">{index + 1}</td>

                  {/* Foto */}
                  <td className="px-6 py-4">
                    <ItemPhoto item={item} />
                  </td>

                  {/* Informasi Barang */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{item.name}</span>
                      <span className="text-xs font-mono text-gray-500 mt-0.5">{item.code ?? '-'}</span>
                    </div>
                  </td>

                  {/* Supplier */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                        {supplierName(item.supplierId).charAt(0)}
                      </div>
                      <span>{supplierName(item.supplierId)}</span>
                    </div>
                  </td>

                  {/* Stok */}
                  <td className="px-6 py-4">
                       <span className={`font-bold ${item.stock < 20 ? 'text-red-600' : item.stock < 50 ? 'text-amber-600' : 'text-gray-800'}`}>
                         {item.stock}
                       </span>
                  </td>

                  {/* Satuan */}
                  <td className="px-6 py-4 text-gray-600">
                    {item.unit}
                  </td>

                  {/* Kategori */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.category)}`}>
                      {item.category || '-'}
                    </span> 
                  </td>

                  {/* Lokasi */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-gray-600 font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FF8A00]"></div>
                      {locationCode(item.locationId)}
                    </span>
                  </td>

                  {/* Keterangan */}
                  <td className="px-6 py-4 text-gray-600">{item.detail || '-'}</td>

                  {/* Aksi */}
                  <td className="px-6 py-4 text-center">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
      </div>

      {/* Modal Tambah Lokasi */}
      {isModalOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
                TAMBAH LOKASI · {activeItem.name}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 mb-6">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Lokasi</label>
                <select
                  className="w-full border border-gray-200 bg-gray-50/50 rounded-xl py-2.5 pl-4 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] focus:bg-white appearance-none text-sm transition-all duration-200"
                  value={modalData.locationId}
                  onChange={(e) => handlePilihLokasi(e.target.value)}
                >
                  <option value="" disabled>Pilih Lokasi</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.code}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Kode Barang</label>
                <input
                  type="text"
                  placeholder="Kode akan disarankan otomatis"
                  className="w-full border border-gray-200 bg-gray-50/50 rounded-xl py-2.5 px-4 text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] focus:bg-white transition-all duration-200"
                  value={modalData.code}
                  maxLength={191}
                  onChange={(e) => setModalData({ ...modalData, code: e.target.value })}
                />
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{modalError}</div>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleSimpanLokasi}
                disabled={saving}
                className="px-6 py-2.5 bg-[#FF8A00] text-white font-medium rounded-xl hover:bg-[#E67A00] shadow-sm shadow-[#FF8A00]/20 transition-all text-sm disabled:opacity-60"
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
