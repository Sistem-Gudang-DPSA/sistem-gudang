"use client";

import { useCan } from '@/domains/auth/user-context';
import React, { useEffect, useState } from 'react';
import { Search, Plus, Filter, Edit2 } from 'lucide-react';
import { adjustItemStock, assignItemLocation, listItems, listLocations, suggestItemCode } from '@/domains/inventory/api';
import type { ItemListRow, Location } from '@/domains/inventory/types';
import { listSuppliers } from '@/domains/purchasing/api';
import type { Supplier } from '@/domains/purchasing/types';
import { ApiError } from '@/shared/lib/api-client';
import Pagination from '@/shared/components/Pagination';
import { useApiData } from '@/shared/lib/use-api-data';
import { ExportExcellButton } from '@/shared/components/Tombol';
import { ImportExcelButton } from '@/shared/components/ImportExcelButton';
import { importMasterData } from '../api';
import { DataTable, type Column, CategoryBadge, StockCell } from '@/shared/components/DataTable';

const PAGE_SIZE = 20;

export type MasterDataImportRow = {
  InformasiBarang: string;
  Supplier: string;
  Stok: number;
  Satuan: string;
  Kategori: string;   // 'YYYY-MM-DD'
  Lokasi: string;
};

export const mstrDataTemplateHeaders = ['Informasi Barang', 'Supplier', 'Stok', 'Satuan', 'Kategori', 'Lokasi'];
export const mstrDataTemplateExample = ['BB 18', 'PT Makmur', 100, 'lembar', 'Lembaran', 'A01'];


export function MasterData(r: Record<string, unknown>, rowNumber: number): MasterDataImportRow {
  const InformasiBarang = String(r['Informasi Barang'] ?? '').trim();
  const Supplier = String(r['Supplier'] ?? '').trim();
  const stokRaw = r['Stok'];
  const Stok = stokRaw === '' || stokRaw == null ? NaN : Number(stokRaw);
  const Satuan = String(r['Satuan'] ?? '').trim();
  const Kategori = String(r['Kategori'] ?? '').trim();
  const Lokasi = String(r['Lokasi'] ?? '').trim();

  if (!InformasiBarang) throw new Error(`Baris ${rowNumber}: Informasi Barang wajib diisi`);
  if (!Supplier) throw new Error(`Baris ${rowNumber}: Supplier wajib diisi`);
  if (Number.isNaN(Stok) || Stok < 0) throw new Error(`Baris ${rowNumber}: Stok tidak valid`);
  if (!Satuan) throw new Error(`Baris ${rowNumber}: Satuan wajib diisi`);
  if (!Kategori) throw new Error(`Baris ${rowNumber}: Kategori wajib diisi`);
  if (!Lokasi) throw new Error(`Baris ${rowNumber}: Lokasi wajib diisi`);

  return { InformasiBarang, Supplier, Stok, Satuan, Kategori, Lokasi };
}

export default function DataBarangGudang() {
  const canCreate = useCan('item.create');
  const canAssign = useCan('item.assign-location');
  const canAdjust = useCan('item.adjust-stock');
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<ItemListRow | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [modalData, setModalData] = useState({ locationId: "", code: "" });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockItem, setStockItem] = useState<ItemListRow | null>(null);
  const [stockDelta, setStockDelta] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [stockSaving, setStockSaving] = useState(false);
  const [stockError, setStockError] = useState("");

  const filterKey = JSON.stringify([searchQuery]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });
  const { data: loaded, loading, error, reload } = useApiData(
    () => listItems({ page, pageSize: 20, search: searchQuery || undefined }),
    `${filterKey}|${page}`,
    "Gagal memuat data barang.",
  );
  const dataBarang = loaded?.rows ?? [];
  const total = loaded?.total ?? 0;

  useEffect(() => {
    listLocations().then((res) => setLocations(res.rows)).catch(() => {});
    listSuppliers().then((res) => setSuppliers(res.rows)).catch(() => {});
  }, []);

  const supplierName = (id: number) => suppliers.find((s) => s.id === id)?.name ?? '-';
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

  const openStockModal = (item: ItemListRow) => {
    setStockItem(item);
    setStockDelta("");
    setStockReason("");
    setStockError("");
    setIsStockModalOpen(true);
  };

  const handleSimpanStok = async () => {
    const delta = Number(stockDelta);
    if (!stockItem || !stockDelta || Number.isNaN(delta) || delta === 0 || !stockReason) {
      setStockError("Isi jumlah perubahan (boleh negatif) dan alasan.");
      return;
    }
    setStockSaving(true);
    setStockError("");
    try {
      await adjustItemStock(stockItem.id, { delta, reason: stockReason });
      reload();
      setIsStockModalOpen(false);
    } catch (err) {
      setStockError(err instanceof ApiError ? err.message : "Gagal menyesuaikan stok.");
    } finally {
      setStockSaving(false);
    }
  };

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

  const columns: Column<ItemListRow>[] = [
    {
      key: 'no',
      header: 'No',
      className: 'text-gray-500',
      render: (_, i) => (page - 1) * PAGE_SIZE + i + 1,
    },
    {
      key: 'info',
      header: 'Informasi Barang',
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-900">{item.name}</span>
          <span className="text-xs font-mono text-gray-500 mt-0.5">{item.code ?? '-'}</span>
        </div>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (item) => (
        <div className="flex items-center gap-2 text-gray-600">
          <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
            {supplierName(item.supplierId).charAt(0)}
          </div>
          <span>{supplierName(item.supplierId)}</span>
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Stok & Satuan',
      render: (item) => <StockCell stock={item.stock} unit={item.unit} />,
    },
    {
      key: 'category',
      header: 'Kategori',
      render: (item) => <CategoryBadge category={item.category} />,
    },
    {
      key: 'location',
      header: 'Lokasi',
      render: (item) => (
        <span className="inline-flex items-center gap-1 text-gray-600 font-medium">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FF8A00]" />
          {locationCode(item.locationId)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-2">
          {item.locationId === null && canAssign && (
            <button
              onClick={() => openAssignModal(item)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#FF8A00]/10 text-[#FF8A00] text-xs font-bold rounded-lg hover:bg-[#FF8A00]/20 transition-all duration-200 opacity-90 group-hover:opacity-100"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              Tambah
            </button>
          )}
          {canAdjust && (
            <button
              onClick={() => openStockModal(item)}
              title="Sesuaikan stok"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition-all duration-200 opacity-90 group-hover:opacity-100"
            >
              <Edit2 className="w-3.5 h-3.5" strokeWidth={2.5} />
              Stok
            </button>
          )}
        </div>
      ),
    },
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
            {canCreate && (
                <ImportExcelButton
                    templateHeaders={mstrDataTemplateHeaders}
                    templateExample={mstrDataTemplateExample}
                    templateFilename="Template_Import_Barang.xlsx"
                    parseRow={MasterData}
                    previewColumns={[
                        { header: 'Informasi Barang', value: (r) => r.InformasiBarang },
                        { header: 'Supplier', value: (r) => r.Supplier },
                        { header: 'Stok', value: (r) => r.Stok },
                        { header: 'Satuan', value: (r) => r.Satuan },
                        { header: 'Kategori', value: (r) => r.Kategori },
                        { header: 'Lokasi', value: (r) => r.Lokasi },
                    ]}
                    onSave={importMasterData}
                    onSuccess={() => reload()}
                    />
                )}
            <ExportExcellButton onClick={handleExportExcel} />
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <DataTable 
            columns={columns}
            rows={dataBarang}
            rowKey={(item) => item.id}
            loading={loading}
            error={error}
            emptyText="Belum ada data barang."
          />
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

      {/* Modal Sesuaikan Stok */}
      {isStockModalOpen && stockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
                SESUAIKAN STOK · {stockItem.name}
              </h2>
              <button
                onClick={() => setIsStockModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              Stok saat ini: <span className="font-bold text-gray-800">{stockItem.stock} {stockItem.unit}</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-6 mb-6">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Perubahan Jumlah</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={10}
                  placeholder="Contoh: 10 atau -5"
                  className="w-full border border-gray-200 bg-gray-50/50 rounded-xl py-2.5 px-4 text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200"
                  value={stockDelta}
                  onChange={(e) => setStockDelta(e.target.value.replace(/(?!^-)\D/g, ""))}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Alasan</label>
                <input
                  type="text"
                  placeholder="Contoh: Penerimaan PO-2026-09-001"
                  className="w-full border border-gray-200 bg-gray-50/50 rounded-xl py-2.5 px-4 text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200"
                  value={stockReason}
                  maxLength={255}
                  onChange={(e) => setStockReason(e.target.value)}
                />
              </div>
            </div>

            {stockError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{stockError}</div>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleSimpanStok}
                disabled={stockSaving}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all text-sm disabled:opacity-60"
              >
                {stockSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
