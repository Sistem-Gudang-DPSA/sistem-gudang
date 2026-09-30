"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Search, Calendar, Plus, Download } from 'lucide-react';
import { createInbound, createInboundReturn, listInbound } from '@/domains/gudang/api';
import type { InboundRow, StatusQc } from '@/domains/gudang/types';
import { listItems } from '@/domains/inventory/api';
import type { Item } from '@/domains/inventory/types';
import { listSuppliers } from '@/domains/purchasing/api';
import type { Supplier } from '@/domains/purchasing/types';
import { displayDate, todayIso, toDateRange } from '@/domains/gudang/date';
import { ApiError } from '@/shared/lib/api-client';

const emptyBaru = { itemId: "", supplierId: "", tanggal: todayIso(), jumlahKedatangan: "", jumlahRekap: "", statusQc: "PASS" as StatusQc };
const emptyKembali = { itemId: "", tanggal: todayIso(), jumlah: "", clientName: "", spk: "" };

export default function BarangMasukGudang() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const [rows, setRows] = useState<InboundRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState(emptyBaru);
  const [isModalKembaliOpen, setIsModalKembaliOpen] = useState(false);
  const [modalKembaliData, setModalKembaliData] = useState(emptyKembali);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // ponytail: loads first 100 rows only, add real pagination when the list outgrows it
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listInbound({
        pageSize: 100,
        search: searchQuery || undefined,
        ...toDateRange(filterDay, filterMonth, filterYear),
      });
      setRows(res.rows);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat data barang masuk.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterDay, filterMonth, filterYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    listItems({ pageSize: 100 }).then((res) => setItems(res.rows)).catch(() => {});
    listSuppliers({ pageSize: 100 }).then((res) => setSuppliers(res.rows)).catch(() => {});
  }, []);

  const openModal = () => { setModalData({ ...emptyBaru, tanggal: todayIso() }); setModalError(""); setIsModalOpen(true); };
  const openModalKembali = () => { setModalKembaliData({ ...emptyKembali, tanggal: todayIso() }); setModalError(""); setIsModalKembaliOpen(true); };

  const handleSimpan = async () => {
    const { itemId, supplierId, tanggal, jumlahKedatangan, jumlahRekap, statusQc } = modalData;
    if (!itemId || !supplierId || !tanggal || !jumlahKedatangan || jumlahRekap === "") {
      setModalError("Lengkapi semua isian.");
      return;
    }
    setSaving(true);
    setModalError("");
    try {
      await createInbound({
        itemId: Number(itemId),
        supplierId: Number(supplierId),
        date: tanggal,
        qtyArrived: Number(jumlahKedatangan),
        qtyPurchased: Number(jumlahRekap),
        statusQc,
      });
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Gagal menyimpan barang masuk.");
    } finally {
      setSaving(false);
    }
  };

  const handleSimpanKembali = async () => {
    const { itemId, tanggal, jumlah, clientName, spk } = modalKembaliData;
    if (!itemId || !tanggal || !jumlah) {
      setModalError("Barang, tanggal, dan jumlah wajib diisi.");
      return;
    }
    setSaving(true);
    setModalError("");
    try {
      await createInboundReturn({
        itemId: Number(itemId),
        date: tanggal,
        qty: Number(jumlah),
        clientName: clientName || undefined,
        spk: spk || undefined,
      });
      setIsModalKembaliOpen(false);
      await loadData();
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all shadow-sm"
                placeholder="Cari kode, nama barang, atau supplier..." 
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={filterDay}
                  onChange={(e) => setFilterDay(e.target.value)}
                  className="appearance-none w-[70px] border border-gray-200 rounded-xl py-2.5 pl-3 pr-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] text-sm text-gray-700 bg-white transition-all duration-200 cursor-pointer"
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

          <div className="flex gap-2 w-full lg:w-auto">
            <button 
              onClick={openModal}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Barang Baru</span>
            </button>
            <button 
              onClick={openModalKembali}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Barang Kembali</span>
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-6 py-4">No</th>
                <th scope="col" className="px-6 py-4">Tanggal</th>
                <th scope="col" className="px-6 py-4">Informasi Barang</th>
                <th scope="col" className="px-6 py-4">Supplier</th>
                <th scope="col" className="px-6 py-4 text-center">Jml Kedatangan</th>
                <th scope="col" className="px-6 py-4 text-center">Jml Rekap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-red-500">{error}</td></tr>
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

                  <td className="px-6 py-4 text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                        {(item.supplierName ?? item.clientName ?? '-').charAt(0)}
                      </div>
                      <span>{item.supplierName ?? (item.source === 'KLIEN' ? `Retur${item.clientName ? ` - ${item.clientName}` : ''}` : '-')}</span>
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

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div>
            Menampilkan <span className="font-semibold text-gray-900">{rows.length}</span> dari <span className="font-semibold text-gray-900">{total}</span> data
          </div>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-white text-gray-400 cursor-not-allowed">Sec</button>
            <button className="px-3 py-1 bg-[#FF8A00] text-white rounded-md font-medium shadow-sm shadow-orange-500/20">1</button>
            <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-white text-gray-600 hover:text-[#FF8A00] font-medium transition-colors">2</button>
            <span className="px-2 py-1 text-gray-400">...</span>
            <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-white text-gray-600 hover:text-[#FF8A00] font-medium transition-colors">Selanjutnya</button>
          </div>
        </div>
      </div>

      {/* Simpan/Download Button Outside */}
      <div className="flex justify-end mt-6">
        <button className="flex items-center gap-2 px-8 py-2.5 bg-[#FF8A00] text-white font-bold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm tracking-wide">
          <Download className="w-4 h-4" />
          Download
        </button>
      </div>

      {/* Modal Form Barang Masuk */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md transition-opacity duration-300 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[750px] p-8 border border-white/20 relative animate-in zoom-in-95 duration-200">
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
                    value={items.find((it) => String(it.id) === modalData.itemId)?.code ?? ''}
                    className="w-full border border-gray-300 rounded-md py-3 px-4 focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-700 placeholder-gray-400 bg-[#f8f9fa] text-sm"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Nama Barang</label>
                  <select
                    value={modalData.itemId}
                    onChange={(e) => setModalData({...modalData, itemId: e.target.value})}
                    className="w-full border border-gray-300 rounded-md py-3 px-4 text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-sm"
                  >
                    <option value="" disabled>Pilih barang</option>
                    {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Supplier</label>
                  <select 
                    className="w-full border border-gray-300 rounded-md py-3 px-4 text-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-400 appearance-none bg-white text-sm"
                    style={{ backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%20%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%23374151%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')", backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center", backgroundSize: "1.2em" }}
                    value={modalData.supplierId}
                    onChange={(e) => setModalData({...modalData, supplierId: e.target.value})}
                  >
                    <option value="" disabled>Sesuaikan supplier</option>
                    {suppliers.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                  </select>
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Tanggal</label>
                  <div className="relative">
                    <input 
                      type="date"
                      value={modalData.tanggal}
                      onChange={(e) => setModalData({...modalData, tanggal: e.target.value})}
                      className="w-full border border-gray-300 rounded-md py-3 pl-4 pr-10 focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-700 placeholder-gray-400 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Jumlah Sesuai Kedatangan</label>
                  <input 
                    type="number"
                    placeholder="0"
                    value={modalData.jumlahKedatangan}
                    onChange={(e) => setModalData({...modalData, jumlahKedatangan: e.target.value})}
                    className="w-full border border-gray-200 bg-gray-50/50 rounded-lg py-3 px-4 text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Jumlah Sesuai Rekap Pembelian</label>
                  <input 
                    type="number"
                    placeholder="0"
                    value={modalData.jumlahRekap}
                    onChange={(e) => setModalData({...modalData, jumlahRekap: e.target.value})}
                    className="w-full border border-gray-200 bg-gray-50/50 rounded-lg py-3 px-4 text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* Row 4 */}
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Status QC</label>
                  <select
                    value={modalData.statusQc}
                    onChange={(e) => setModalData({...modalData, statusQc: e.target.value as StatusQc})}
                    className="w-full border border-gray-300 rounded-md py-3 px-4 text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-sm"
                  >
                    <option value="PASS">Pass (IPM)</option>
                    <option value="PARTIAL_RETUR">Part (Retur)</option>
                  </select>
                </div>
                <div className="flex-1" />
              </div>
            </div>

            {modalError && <p className="text-sm text-red-500 mb-2 text-right">{modalError}</p>}
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[750px] p-8 border border-white/20 relative animate-in zoom-in-95 duration-200">
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
                    value={items.find((it) => String(it.id) === modalKembaliData.itemId)?.code ?? ''}
                    className="w-full border border-gray-300 rounded-md py-3 px-4 focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-700 placeholder-gray-400 bg-[#f8f9fa] text-sm"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Nama Barang</label>
                  <select
                    value={modalKembaliData.itemId}
                    onChange={(e) => setModalKembaliData({...modalKembaliData, itemId: e.target.value})}
                    className="w-full border border-gray-300 rounded-md py-3 px-4 text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-sm"
                  >
                    <option value="" disabled>Pilih barang</option>
                    {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                  </select>
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
                      onChange={(e) => setModalKembaliData({...modalKembaliData, tanggal: e.target.value})}
                      className="w-full border border-gray-300 rounded-md py-3 pl-4 pr-10 focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-700 placeholder-gray-400 text-sm"
                    />
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Jumlah</label>
                  <input 
                    type="number"
                    placeholder="0"
                    value={modalKembaliData.jumlah}
                    onChange={(e) => setModalKembaliData({...modalKembaliData, jumlah: e.target.value})}
                    className="w-full border border-gray-300 rounded-md py-3 px-4 focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-700 placeholder-gray-400 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">Nama Klien (opsional)</label>
                  <input
                    type="text"
                    value={modalKembaliData.clientName}
                    onChange={(e) => setModalKembaliData({...modalKembaliData, clientName: e.target.value})}
                    className="w-full border border-gray-300 rounded-md py-3 px-4 text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-sm"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[15px] font-medium text-gray-900">SPK (opsional)</label>
                  <input
                    type="text"
                    value={modalKembaliData.spk}
                    onChange={(e) => setModalKembaliData({...modalKembaliData, spk: e.target.value})}
                    className="w-full border border-gray-300 rounded-md py-3 px-4 text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            {modalError && <p className="text-sm text-red-500 mb-2 text-right">{modalError}</p>}
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
