"use client";

import { useCan } from '@/domains/auth/user-context';
import React, { useState } from 'react';
import { Search, Plus, Filter, ScanLine } from 'lucide-react';
import { createInbound, createInboundReturn, listInbound } from '@/domains/inventory/api';
import type { StatusQc } from '@/domains/inventory/types';
import { useItemSearch } from '@/domains/inventory/use-item-search';
import { useSpkSearch } from '@/domains/ppic/use-spk-search';
import { displayDate, todayIso, toDateRange } from '@/domains/inventory/date';
import { toCsv } from '@/shared/lib/csv';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import Pagination from '@/shared/components/Pagination';
import { INTEGER_INPUT, digitsOnly } from '@/shared/lib/input';
import { ExportExcellButton } from '@/shared/components/Tombol';
import { countActiveFilters, emptyBarangFilters } from './BarangFilterPanel';
import SortableTh, { useSort } from '@/shared/components/SortableTh';
import { usePage } from '@/shared/lib/use-page';
import DateFilter from '@/shared/components/DateFilter';
import SearchableSelect from '@/shared/components/SearchableSelect';
import BarangMasukScan from './BarangMasukScan';
import { QC_STATUS } from '@/domains/inventory/status';

type PickedItem = { id: number; name: string; code: string | null };

const emptyBaru = { item: null as PickedItem | null, tanggal: todayIso(), jumlahKedatangan: "", jumlahRekap: "", statusQc: "PASS" as StatusQc };
const emptyKembali = { item: null as PickedItem | null, tanggal: todayIso(), jumlah: "", spk: "" };

export default function BarangMasukGudang() {
  const canCreate = useCan('inbound.create');
  const { sort, toggle, params: sortParams } = useSort();
  const [filters] = useState(emptyBarangFilters);
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState(emptyBaru);
  const [isModalKembaliOpen, setIsModalKembaliOpen] = useState(false);
  const [modalKembaliData, setModalKembaliData] = useState(emptyKembali);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const dateRange = toDateRange(filterDay, filterMonth, filterYear);

  const filterKey = JSON.stringify([searchQuery, filterDay, filterMonth, filterYear, sortParams]);
  const [page, setPage] = usePage(filterKey);
  const { data: result, loading, error, reload } = useApiData(
    () => listInbound({ page, pageSize: 20, search: searchQuery || undefined, ...dateRange, ...sortParams }),
    `${filterKey}|${page}`,
    'Gagal memuat data barang masuk.',
  );
  const rows = result?.rows ?? [];
  const total = result?.total ?? 0;

  const spkKembali = useSpkSearch(modalKembaliData.spk);

  // Barang dicari di server dan dipilih per id; yang terpilih disimpan di state modal (nama belum tentu unik).
  const { items, onSearch: searchItems, pending: itemPending, error: itemError } = useItemSearch();
  const itemBaru = modalData.item;
  const itemKembali = modalKembaliData.item;
  const label = (it: PickedItem) => (it.code ? `${it.name} (${it.code})` : it.name);
  const pilihanBarang = (picked: PickedItem | null) => [
    ...(picked && !items.some((it) => it.id === picked.id) ? [{ value: String(picked.id), label: label(picked) }] : []),
    ...items.map((it) => ({ value: String(it.id), label: label(it) })),
  ];
  const pilihBarang = (id: string, prev: PickedItem | null): PickedItem | null => {
    const it = items.find((x) => String(x.id) === id);
    return it ? { id: it.id, name: it.name, code: it.code } : prev && String(prev.id) === id ? prev : null;
  };

  // Exports the rows currently loaded in the table.
  const handleExportCsv = () => {
    const csv = toCsv([
      ['No', 'Tanggal', 'Kode Barang', 'Nama Barang', 'Supplier', 'Jumlah Kedatangan', 'Jumlah Rekap'],
      ...rows.map((r, i) => [i + 1, displayDate(r.date), r.itemCode ?? '', r.itemName, r.supplierName ?? r.clientName ?? '', r.qtyArrived, r.qtyPurchased ?? '']),
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `Data_Barang_Masuk_halaman-${page}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openModal = () => { searchItems(''); setModalData({ ...emptyBaru, tanggal: todayIso() }); setModalError(""); setIsModalOpen(true); };
  const openModalKembali = () => { searchItems(''); setModalKembaliData({ ...emptyKembali, tanggal: todayIso() }); setModalError(""); setIsModalKembaliOpen(true); };

  const handleSimpan = async () => {
    const itemId = itemBaru?.id;
    const { tanggal, jumlahKedatangan, jumlahRekap, statusQc } = modalData;
    if (!itemId || !tanggal || !jumlahKedatangan || jumlahRekap === "") {
      setModalError("Lengkapi semua isian.");
      return;
    }
    setSaving(true);
    setModalError("");
    try {
      await createInbound({
        itemId,
        date: tanggal,
        qtyArrived: Number(jumlahKedatangan),
        qtyPurchased: Number(jumlahRekap),
        statusQc,
      });
      setIsModalOpen(false);
      reload();
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Gagal menyimpan barang masuk.");
    } finally {
      setSaving(false);
    }
  };

  const handleSimpanKembali = async () => {
    const itemId = itemKembali?.id;
    const { tanggal, jumlah, spk } = modalKembaliData;
    if (!itemId || !tanggal || !jumlah) {
      setModalError("Barang, tanggal, dan jumlah wajib diisi.");
      return;
    }
    setSaving(true);
    setModalError("");
    try {
      await createInboundReturn({
        itemId,
        date: tanggal,
        qty: Number(jumlah),
        spk: spk || undefined,
      });
      setIsModalKembaliOpen(false);
      reload();
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Gagal menyimpan barang kembali.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col justify-start mb-8 gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">DATA BARANG MASUK</h1>
        <p className="text-gray-500 text-sm">Kelola rincian kedatangan barang dan rekap pembelian inventaris.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="relative w-full max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                maxLength={100}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all shadow-sm"
                placeholder="Cari kode, nama barang, atau supplier..."
              />
            </div>
          </div>

          <div className="flex gap-2 w-full lg:w-auto">
            {canCreate && <button
              onClick={openModal}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Barang Baru</span>
            </button>}
            {canCreate && <button
              onClick={() => setIsScanOpen(true)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm shrink-0"
            >
              <ScanLine className="w-4 h-4" />
              <span>Scan Barang</span>
            </button>}
            {canCreate && <button
              onClick={openModalKembali}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Barang Kembali</span>
            </button>}

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
          <DateFilter
            day={filterDay}
            month={filterMonth}
            year={filterYear}
            onDayChange={setFilterDay}
            onMonthChange={setFilterMonth}
            onYearChange={setFilterYear}
            onReset={() => { setFilterDay(''); setFilterMonth(''); setFilterYear(''); }}
          />
        )}


        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-6 py-4">No</th>
                <SortableTh label="Tanggal" sortKey="date" sort={sort} onSort={toggle} />
                <SortableTh label="Informasi Barang" sortKey="itemName" sort={sort} onSort={toggle} />
                <th scope="col" className="px-6 py-4 text-center">Jml Kedatangan</th>
                <th scope="col" className="px-6 py-4 text-center">Jml Rekap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-red-500">{error}</td></tr>
              )}
              {!loading && !error && rows.map((item, index) => (
                <tr key={item.id} className="hover:bg-[#FF8A00]/5 transition-colors group">
                  <td className="px-6 py-4 text-gray-500 text-center">{index + 1}.</td>
                  <td className="px-6 py-4 text-gray-500">{displayDate(item.date)}</td>

                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{item.itemName}</span>
                      <span className="text-xs font-mono text-gray-500 mt-0.5">{item.itemCode ?? '-'}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center font-bold text-gray-800">
                    {item.qtyArrived}
                  </td>

                  <td className="px-6 py-4 text-center font-bold text-[#FF8A00]">
                    {item.qtyPurchased ?? '-'}
                  </td>
                </tr>
              ))}
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400 italic">
                    Data tidak ditemukan untuk filter tersebut.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
      </div>

      {/* Simpan/Download Button Outside */}
      <div className="flex justify-end mt-6">
        <ExportExcellButton onClick={handleExportCsv} />
      </div>

      {isScanOpen && <BarangMasukScan onClose={() => setIsScanOpen(false)} onSaved={reload} />}

      {/* Modal Form Barang Masuk */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md transition-opacity duration-300 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-187.5 p-8 border border-white/20 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-[20px] font-extrabold text-gray-900 mb-8 tracking-wide uppercase">
              FORM BARANG MASUK
            </h2>

            <div className="flex flex-col gap-6 mb-10">
              {/* Row 1 */}
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Kode Barang</label>
                  <input
                    type="text"
                    disabled
                    placeholder="Isi Otomatis"
                    value={itemBaru?.code ?? ''}
                    className="w-full border border-gray-300 rounded-md py-3 px-4 focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-700 placeholder-gray-400 bg-[#f8f9fa] text-sm"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Nama Barang</label>
                  <div className="relative">
                    <SearchableSelect
                      value={itemBaru ? String(itemBaru.id) : ''}
                      onChange={(id) => setModalData((prev) => ({ ...prev, item: pilihBarang(id, prev.item) }))}
                      onSearch={searchItems}
                      pending={itemPending}
                      options={pilihanBarang(itemBaru)}
                      placeholder="Isi Nama Barang"
                      emptyText="Barang tidak ditemukan"
                      aria-label="Nama Barang"
                      className="w-full border border-gray-300 rounded-md py-3 pl-4 pr-3 focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-700 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex flex-col sm:flex-row gap-6 ">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Jumlah Sesuai Kedatangan</label>
                  <input
                    {...INTEGER_INPUT}
                    maxLength={9}
                    placeholder="0"
                    value={modalData.jumlahKedatangan}
                    onChange={(e) => setModalData({ ...modalData, jumlahKedatangan: digitsOnly(e.target.value) })}
                    className="w-full border border-gray-200 bg-gray-50/50 rounded-lg py-3 px-4 text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Jumlah Sesuai Rekap Pembelian</label>
                  <input
                    {...INTEGER_INPUT}
                    maxLength={9}
                    placeholder="0"
                    value={modalData.jumlahRekap}
                    onChange={(e) => setModalData({ ...modalData, jumlahRekap: digitsOnly(e.target.value) })}
                    className="w-full border border-gray-200 bg-gray-50/50 rounded-lg py-3 px-4 text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Tanggal</label>
                  <input
                    type="date"
                    value={modalData.tanggal}
                    onChange={(e) => setModalData({ ...modalData, tanggal: e.target.value })}
                    className="w-full border border-gray-300 rounded-md py-3 px-4 text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-sm"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Status QC</label>
                  <select
                    value={modalData.statusQc}
                    onChange={(e) => setModalData({ ...modalData, statusQc: e.target.value as StatusQc })}
                    className="w-full border border-gray-300 rounded-md py-3 px-4 text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-sm"
                  >
                    <option value="PASS">{QC_STATUS.PASS.label}</option>
                    <option value="PARTIAL_RETUR">{QC_STATUS.PARTIAL_RETUR.label}</option>
                  </select>
                </div>
              </div>
            </div>


            {(modalError || itemError) && <p className="text-sm text-red-500 mb-2 text-right">{modalError || itemError}</p>}
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSimpan}
                disabled={saving}
                className="px-8 py-2.5 bg-[#ff8a00] text-white rounded-md hover:bg-[#e07b00] transition-colors font-medium text-[15px] shadow-sm"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Barang Kembali */}
      {isModalKembaliOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md transition-opacity duration-300 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-187.5 p-8 border border-white/20 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalKembaliOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-[20px] font-extrabold text-gray-900 mb-8 tracking-wide uppercase">
              FORM BARANG KEMBALI
            </h2>

            <div className="flex flex-col gap-6 mb-10">
              {/* Row 1 */}
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Kode Barang</label>
                  <input
                    type="text"
                    disabled
                    placeholder="Isi Otomatis"
                    value={itemKembali?.code ?? ''}
                    className="w-full border border-gray-300 rounded-md py-3 px-4 focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-700 placeholder-gray-400 bg-[#f8f9fa] text-sm"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Nama Barang</label>
                  <div className="relative">
                    <SearchableSelect
                      value={itemKembali ? String(itemKembali.id) : ''}
                      onChange={(id) => setModalKembaliData((prev) => ({ ...prev, item: pilihBarang(id, prev.item) }))}
                      onSearch={searchItems}
                      pending={itemPending}
                      options={pilihanBarang(itemKembali)}
                      placeholder="Isi Nama Barang"
                      emptyText="Barang tidak ditemukan"
                      aria-label="Nama Barang"
                      className="w-full border border-gray-300 rounded-md py-3 pl-4 pr-3 focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-700 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Tanggal</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={modalKembaliData.tanggal}
                      onChange={(e) => setModalKembaliData({ ...modalKembaliData, tanggal: e.target.value })}
                      className="w-full border border-gray-300 rounded-md py-3 pl-4 pr-10 focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-700 placeholder-gray-400 text-sm"
                    />
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Jumlah</label>
                  <input
                    {...INTEGER_INPUT}
                    maxLength={9}
                    placeholder="0"
                    value={modalKembaliData.jumlah}
                    onChange={(e) => setModalKembaliData({ ...modalKembaliData, jumlah: digitsOnly(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md py-3 px-4 focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-700 placeholder-gray-400 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">SPK (opsional)</label>
                  <SearchableSelect
                    value={modalKembaliData.spk}
                    onChange={(spk) => setModalKembaliData({ ...modalKembaliData, spk })}
                    onSearch={spkKembali.onSearch}
                    options={[{ value: '', label: 'Tanpa SPK' }, ...spkKembali.options.map((t) => ({ value: t.noSpk, label: `${t.noSpk} - ${t.client}` }))]}
                    placeholder="Tanpa SPK"
                    aria-label="SPK"
                    className="w-full border border-gray-300 rounded-md py-3 px-4 text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            {(modalError || itemError) && <p className="text-sm text-red-500 mb-2 text-right">{modalError || itemError}</p>}
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSimpanKembali}
                disabled={saving}
                className="px-8 py-2.5 bg-[#ff8a00] text-white rounded-md hover:bg-[#e07b00] transition-colors font-medium text-[15px] shadow-sm"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
