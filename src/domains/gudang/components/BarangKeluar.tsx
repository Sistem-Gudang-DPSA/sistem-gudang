"use client";

import { useCan } from '@/domains/auth/user-context';
import React, { useEffect, useState } from 'react';
import { Search, Calendar, Plus, AlertCircle } from 'lucide-react';
import { createOutbound, listOutbound } from '@/domains/gudang/api';
import type { RecipientType, WarehouseType } from '@/domains/gudang/types';
import { listItems } from '@/domains/inventory/api';
import type { ItemListRow } from '@/domains/inventory/types';
import { displayDate, todayIso, toDateRange } from '@/domains/gudang/date';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import Pagination from '@/shared/components/Pagination';
import { INTEGER_INPUT, digitsOnly } from '@/shared/lib/input';

const emptyLine = { itemId: "", qty: "", pic: "" };
const emptyForm = {
  namaClient: "",
  spk: "",
  namaItem: "",
  tanggal: todayIso(),
  warehouseType: "" as WarehouseType | "",
  recipientType: "" as RecipientType | "",
};

export default function BarangKeluarGudang() {
  const canCreate = useCan('outbound.create');
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const [items, setItems] = useState<ItemListRow[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState(emptyForm);
  const [lines, setLines] = useState([emptyLine, emptyLine, emptyLine]);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const dateRange = toDateRange(filterDay, filterMonth, filterYear);

  const filterKey = JSON.stringify([searchQuery, dateRange]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });
  const { data: result, loading, error, reload } = useApiData(
    () => listOutbound({ page, pageSize: 20, search: searchQuery || undefined, ...dateRange }),
    `${filterKey}|${page}`,
    'Gagal memuat data barang keluar.',
  );
  const rows = result?.rows ?? [];
  const total = result?.total ?? 0;

  useEffect(() => {
    listItems({ pageSize: 100 }).then((res) => setItems(res.rows)).catch(() => {});
  }, []);

  // The table shows one row per item line, the API returns one row per transaction.
  const tableRows = rows.flatMap((trx) => trx.lines.map((line) => ({ trx, line })));

  const openModal = () => {
    setModalData({ ...emptyForm, tanggal: todayIso() });
    setLines([emptyLine, emptyLine, emptyLine]);
    setModalError("");
    setIsModalOpen(true);
  };

  const updateLine = (index: number, patch: Partial<typeof emptyLine>) =>
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const handleSimpan = async () => {
    const filled = lines.filter((l) => l.itemId || l.qty || l.pic);
    const { namaClient, spk, namaItem, tanggal, warehouseType, recipientType } = modalData;
    if (!namaClient || !spk || !namaItem || !tanggal || !warehouseType || !recipientType) {
      setModalError("Lengkapi data client, SPK, item, tanggal, asal gudang, dan penerima.");
      return;
    }
    if (filled.length === 0 || filled.some((l) => !l.itemId || !l.qty || !l.pic)) {
      setModalError("Isi barang, jumlah, dan PIC di setiap baris yang dipakai.");
      return;
    }
    setSaving(true);
    setModalError("");
    try {
      await createOutbound({
        date: tanggal,
        clientName: namaClient,
        spk,
        itemName: namaItem,
        warehouseType,
        recipientType,
        lines: filled.map((l) => ({ itemId: Number(l.itemId), qty: Number(l.qty), pic: l.pic })),
      });
      setIsModalOpen(false);
      reload();
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Gagal menyimpan barang keluar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col justify-start mb-8 gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">DATA BARANG KELUAR</h1>
        <p className="text-gray-500 text-sm">Monitor dan kelola pengeluaran barang untuk client dan projek.</p>
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
                placeholder="Cari client, spk, atau barang..." 
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={filterDay}
                  onChange={(e) => setFilterDay(e.target.value)}
                  className="appearance-none w-[70px] border border-gray-200 rounded-xl py-2.5 pl-3 pr-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-orange-500 text-sm text-gray-700 bg-white transition-all duration-200 cursor-pointer"
                >
                  <option value="">Tgl</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{(i + 1).toString().padStart(2, '0')}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="relative">
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="appearance-none w-[110px] border border-gray-200 rounded-xl py-2.5 pl-3 pr-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-orange-500 text-sm text-gray-700 bg-white transition-all duration-200 cursor-pointer"
                >
                  <option value="">Bulan</option>
                  {[
                    { v: '01', l: 'Januari' }, { v: '02', l: 'Februari' }, { v: '03', l: 'Maret' },
                    { v: '04', l: 'April' }, { v: '05', l: 'Mei' }, { v: '06', l: 'Juni' },
                    { v: '07', l: 'Juli' }, { v: '08', l: 'Agustus' }, { v: '09', l: 'September' },
                    { v: '10', l: 'Oktober' }, { v: '11', l: 'November' }, { v: '12', l: 'Desember' }
                  ].map(m => (
                    <option key={m.v} value={m.v}>{m.l}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="relative">
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="appearance-none w-[90px] border border-gray-200 rounded-xl py-2.5 pl-3 pr-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-orange-500 text-sm text-gray-700 bg-white transition-all duration-200 cursor-pointer"
                >
                  <option value="">Tahun</option>
                  {["2024", "2025", "2026"].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              {(filterDay || filterMonth || filterYear) && (
                <button 
                  onClick={() => { setFilterDay(""); setFilterMonth(""); setFilterYear(""); }}
                  className="text-xs text-orange-600 font-bold hover:underline ml-1"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {canCreate && <button 
            onClick={openModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm shrink-0 w-full lg:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Data</span>
          </button>}
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-6 py-4">No</th>
                <th scope="col" className="px-6 py-4">Informasi Barang</th>
                <th scope="col" className="px-6 py-4">Client</th>
                <th scope="col" className="px-6 py-4 text-center">SPK</th>
                <th scope="col" className="px-6 py-4 text-center">Tanggal</th>
                <th scope="col" className="px-6 py-4 text-center">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-red-500">{error}</td></tr>
              )}
              {!loading && !error && tableRows.map(({ trx, line }, index) => (
                <tr key={`${trx.id}-${index}`} className="hover:bg-[#FF8A00]/5 transition-colors group">
                  <td className="px-6 py-4 text-gray-500 text-center">{index + 1}.</td>

                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{line.itemName}</span>
                      <span className="text-xs font-mono text-gray-500 mt-0.5">{line.itemCode ?? '-'}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    <div className="flex flex-col">
                       <span className="font-semibold text-gray-800">{trx.clientName}</span>
                       <span className="text-[11px] text-gray-400">{trx.itemName}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center text-gray-600 font-medium">
                    {trx.spk}
                  </td>

                  <td className="px-6 py-4 text-center text-gray-500">
                    {displayDate(trx.date)}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-orange-50 text-orange-700 border border-orange-100">
                      {line.qty}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && !error && tableRows.length === 0 && (
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

      {/* Modal Form Barang Keluar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md transition-opacity duration-300 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[800px] p-8 border border-white/20 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-[20px] font-extrabold text-gray-900 mb-8 tracking-wide uppercase">
              FORM BARANG KELUAR
            </h2>

            <div className="flex flex-col gap-6 mb-8">
              {/* Row 1 */}
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Nama Client</label>
                  <input 
                    type="text"
                    placeholder="Isi nama client"
                    value={modalData.namaClient}
                    maxLength={191}
                    onChange={(e) => setModalData({...modalData, namaClient: e.target.value})}
                    className="w-full border border-gray-200 bg-gray-50/50 rounded-lg py-3 px-4 text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white transition-all duration-200"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">SPK</label>
                  <input 
                    type="text"
                    placeholder="Isi Nomor SPK"
                    value={modalData.spk}
                    maxLength={100}
                    onChange={(e) => setModalData({...modalData, spk: e.target.value})}
                    className="w-full border border-gray-200 bg-gray-50/50 rounded-lg py-3 px-4 text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white transition-all duration-200"
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Nama Item/Project</label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Isi Nama Item"
                      value={modalData.namaItem}
                      maxLength={191}
                      onChange={(e) => setModalData({...modalData, namaItem: e.target.value})}
                      className="w-full border border-gray-200 bg-gray-50/50 rounded-lg py-3 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-sm text-gray-700 placeholder-gray-400 transition-all duration-200"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-800" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Tanggal</label>
                  <div className="relative">
                    <input 
                      type="date"
                      value={modalData.tanggal}
                      onChange={(e) => setModalData({...modalData, tanggal: e.target.value})}
                      className="w-full border border-gray-200 bg-gray-50/50 rounded-lg py-3 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-sm text-gray-700 placeholder-gray-400 transition-all duration-200"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Calendar className="h-4 w-4 text-gray-800" strokeWidth={2} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Asal Gudang</label>
                  <select
                    value={modalData.warehouseType}
                    onChange={(e) => setModalData({...modalData, warehouseType: e.target.value as WarehouseType})}
                    className="w-full border border-gray-200 bg-gray-50/50 rounded-lg py-3 px-4 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white transition-all duration-200"
                  >
                    <option value="" disabled>Pilih asal gudang</option>
                    <option value="BAHAN_BAKU">Gudang Bahan Baku</option>
                    <option value="WIP">Gudang WIP</option>
                    <option value="BARANG_JADI">Gudang Barang Jadi</option>
                  </select>
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Tujuan / Penerima</label>
                  <select
                    value={modalData.recipientType}
                    onChange={(e) => setModalData({...modalData, recipientType: e.target.value as RecipientType})}
                    className="w-full border border-gray-200 bg-gray-50/50 rounded-lg py-3 px-4 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white transition-all duration-200"
                  >
                    <option value="" disabled>Pilih penerima</option>
                    <option value="PRODUKSI">Tukang / Produksi</option>
                    <option value="KLIEN">Klien</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sub Table inside Modal */}
            <div className="border border-gray-200/80 rounded-xl overflow-hidden mb-6 relative shadow-sm">
              <table className="w-full text-left text-[14px]">
                <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200 text-sm">
                  <tr>
                    <th className="px-4 py-3.5 border-r border-gray-200 text-center w-16">No</th>
                    <th className="px-4 py-3.5 border-r border-gray-200 text-center w-32">Kode</th>
                    <th className="px-4 py-3.5 border-r border-gray-200 text-center">Nama Barang</th>
                    <th className="px-4 py-3.5 border-r border-gray-200 text-center w-32">Jumlah</th>
                    <th className="px-4 py-3.5 text-center w-32">PIC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lines.map((line, i) => (
                    <tr key={i} className="bg-white hover:bg-orange-50/30 transition-colors duration-150">
                      <td className="border-r border-gray-200 h-[45px] text-center text-gray-500">{i + 1}</td>
                      <td className="border-r border-gray-200 px-2 text-center font-mono text-xs text-gray-500">
                        {items.find((it) => String(it.id) === line.itemId)?.code ?? ''}
                      </td>
                      <td className="border-r border-gray-200">
                        <select
                          value={line.itemId}
                          onChange={(e) => updateLine(i, { itemId: e.target.value })}
                          className="w-full h-full px-2 py-2 bg-transparent text-sm text-gray-700 focus:outline-none"
                        >
                          <option value="">Pilih barang</option>
                          {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                        </select>
                      </td>
                      <td className="border-r border-gray-200">
                        <input
                          {...INTEGER_INPUT}
                          maxLength={9}
                          value={line.qty}
                          onChange={(e) => updateLine(i, { qty: digitsOnly(e.target.value) })}
                          className="w-full h-full px-2 py-2 bg-transparent text-center text-sm text-gray-700 focus:outline-none"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={line.pic}
                          maxLength={191}
                          onChange={(e) => updateLine(i, { pic: e.target.value })}
                          className="w-full h-full px-2 py-2 bg-transparent text-center text-sm text-gray-700 focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {modalError && <p className="text-sm text-red-500 text-right">{modalError}</p>}

            {/* Bottom Section */}
            <div className="flex flex-wrap items-center justify-between gap-4 mt-8">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setLines((prev) => [...prev, emptyLine])} className="flex items-center justify-center w-[36px] h-[36px] rounded-lg border-2 border-[#ff8a00] text-[#ff8a00] hover:bg-orange-50 hover:shadow-sm hover:-translate-y-0.5 transition-all bg-white z-10">
                  <Plus className="w-5 h-5" strokeWidth={2.5} />
                </button>
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl shadow-sm border border-amber-100 text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600" strokeWidth={2.2} />
                  <span className="text-[14px] font-medium tracking-tight">Penulisan nama item tidak boleh disingkat</span>
                </div>
              </div>

              <button 
                onClick={handleSimpan}
                disabled={saving}
                className="px-8 py-2.5 bg-[#ff8a00] text-white rounded-lg shadow-sm hover:shadow-md hover:bg-[#f08000] hover:-translate-y-0.5 transition-all duration-200 font-semibold text-[15px] ml-auto"
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
