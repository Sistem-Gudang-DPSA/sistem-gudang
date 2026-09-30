"use client";

import React, { useState, useEffect } from 'react';
import { Search, Eye, Download, FileUp, Printer, Loader2, AlertCircle } from 'lucide-react';
import type { Item, Location } from '@/domains/inventory/types';
import * as XLSX from 'xlsx';
import { getLaporanBarangMasuk } from '../api';
import type { BarangMasukItems } from '../types';
import { ApiError } from '@/shared/lib/api-client';


export default function LaporanBarangMasuk() {
    const [filterSumber, setFilterSumber] = useState<string>('ALL');
    const [startDate, setStartDate] = useState<string>('2026-09-01');
    const [endDate, setEndDate] = useState<string>('2026-09-26');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedDetail, setSelectedDetail] = useState<BarangMasukItems | null>(null);
    const [data, setData] = useState<BarangMasukItems[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        async function fetchLaporan() {
            try {
                setIsLoading(true);
                setErrorMessage(null);
                const res = await getLaporanBarangMasuk({
                    startDate,
                    endDate,
                    sumber: filterSumber,
                    search: searchQuery,
                });
                if (isMounted) {
                    const items = Array.isArray(res) ? res : res?.rows ?? [];
                    setData(items);
                }
            } catch (err: any) {
                if (isMounted) {
                    setErrorMessage(err?.message || 'Gagal memuat data laporan barang masuk dari server');
                    setData([]);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        fetchLaporan();
        return () => {
            isMounted = false;
        };
    }, [startDate, endDate, filterSumber, searchQuery]);

    const filteredData = data;

    const totalInboundUnit = filteredData.reduce((acc, curr) => acc + curr.totalVolumeQty, 0);
    const totalSupplierUnit = filteredData
      .filter((d) => d.sumberInbound === 'SUPPLIER')
      .reduce((acc, curr) => acc + curr.totalVolumeQty, 0);
    const totalProduksiUnit = filteredData
      .filter((d) => d.sumberInbound === 'PRODUKSI')
      .reduce((acc, curr) => acc + curr.totalVolumeQty, 0);
    
    const handleExportCSV = () => {
      const exportData = filteredData.map((item, index) => ({
        'No': index + 1,
        'Tgl & Jam Penerimaan': item.tanggalJam,
        'No. Referensi / PO': item.noReferensi,
        'No. Surat Jalan': item.noSuratJalanSupplier || '-',
        'Pemasok / Sumber': item.namaPemasok,
        'Jenis Inbound': item.sumberInbound === 'SUPPLIER' ? 'Supplier External' : 'Produksi Internal',
        'Total Volume (Qty)': item.totalVolumeQty,
        'Satuan': item.satuan,
        'Status QC': item.statusQc,
        'Lokasi Gudang': item.location,
        'Catatan': item.catatan || '-'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Barang Masuk');

      XLSX.writeFile(workbook, `Laporan_Barang_Masuk_${startDate}_to_${endDate}.xlsx`);
    };

    const handlePrintPDF = () => {
      window.print();
    };
    
    return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        <div className="flex flex-col justify-start mb-8 gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">REKAP BARANG MASUK</h1>
            <p className="text-gray-500 text-sm">Arsip pencatatan riwayat penerimaan fisik barang dari supplier dan hasil produksi.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Total Inbound Bulan Ini</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
                {totalInboundUnit.toLocaleString('id-ID')} Qty / {filteredData.length} Transaksi
            </p>
            </div>
            <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Penerimaan Supplier (PO)</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
                {totalSupplierUnit.toLocaleString('id-ID')} Qty ({filteredData.filter((d) => d.sumberInbound === 'SUPPLIER').length} Transaksi)
            </p>
            </div>
            <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Barang Jadi Produksi (QC Pass)</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
                {totalProduksiUnit.toLocaleString('id-ID')} Qty ({filteredData.filter((d) => d.sumberInbound === 'PRODUKSI').length} Transaksi)
            </p>
            </div>
        </div>

        <div className="flex flex-wrap justify-between items-center bg-white p-4 border border-gray-200 rounded-lg shadow-sm gap-4 mt-5">
            <div className="flex flex-wrap gap-3 items-center print:hidden">
            <div>
                <label className="block text-xs text-black mb-1">Sumber Inbound</label>
                <select
                value={filterSumber}
                onChange={(e) => setFilterSumber(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500c text-black"
                >
                <option value="ALL" className='text-black'>Semua Sumber (Supplier / Produksi)</option>
                <option value="SUPPLIER" className='text-black'>Supplier (PO)</option>
                <option value="PRODUKSI" className='text-black'>Barang Jadi Produksi</option>
                <option value="KLIEN" className='text-black'>Barang Kembali</option>
                </select>
            </div>

            <div>
                <label className="block text-xs text-black mb-1">Periode Tanggal</label>
                <div className="flex gap-2 items-center">
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white text-black"
                />
                <span className="text-xs text-black font-medium">s/d</span>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white text-black"
                />
                </div>
            </div>

            <div>
                <label className="block text-xs text-black mb-1">Pencarian</label>
                <span className="relative flex items-center w-60">
                  <input
                    type="text"
                    placeholder="Cari No. PO / SJ / SKU..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border border-gray-300 rounded-md pl-3 pr-10 py-1.5 text-sm w-full bg-white text-black placeholder:text-gray focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button className="absolute right-2 flex items-center justify-center">
                    <Search className="text-black w-4 h-4" />
                  </button>
                </span>
            </div>         
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-sm mt-5 ">
        <div className="flex gap-2 items-end justify-between">
            <div className="flex gap-2 items-end m-2">
                <p className="text-xs font-semibold text-gray-500 uppercase m-2">Tabel Rekap Barang Masuk</p>
            </div>
            <div className="flex gap-2 items-end m-2 print:hidden">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                title="Export Data ke CSV"
              >
                <FileUp className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={handlePrintPDF}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                title="Print Data ke PDF"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Print PDF</span>
              </button>
            </div>
        </div>
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-100 font-semibold text-gray-700">
            <tr>
              <th className="px-4 py-3 text-center w-12">No</th>
              <th className="px-4 py-3 text-left">Tgl &amp; Jam Penerimaan</th>
              <th className="px-4 py-3 text-left">No. Referensi / PO</th>
              <th className="px-4 py-3 text-left">Sumber / Pemasok</th>
              <th className="px-4 py-3 text-right">Total Volume Item (Qty)</th>
              <th className="px-4 py-3 text-center">Status QC</th>
              <th className="px-4 py-3 text-center">Lokasi</th> 
              <th className="px-4 py-3 text-center print:hidden">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span>Memuat data laporan barang masuk...</span>
                  </div>
                </td>
              </tr>
            ) : errorMessage ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-red-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                    <span className="font-semibold">{errorMessage}</span>
                    <span className="text-xs text-gray-400">Pastikan server backend sudah menyala dan endpoint laporan sudah tersedia.</span>
                  </div>
                </td>
              </tr>
              ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Tidak ada data penerimaan barang masuk ditemukan.
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-center text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{item.tanggalJam}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-blue-600">
                    {item.noReferensi}
                    {item.noSuratJalanSupplier && (
                      <span className="block text-xs font-normal text-gray-500">
                        (SJ: {item.noSuratJalanSupplier})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{item.namaPemasok}</span>
                    <span className="block text-xs text-gray-500">
                      ({item.sumberInbound === 'SUPPLIER' ? 'Supplier External' : 'Produksi Internal'})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">
                    {item.totalVolumeQty} {item.satuan}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.statusQc === 'PASS' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                        Pass (IPM) 
                      </span>
                    )}
                    {item.statusQc === 'PARTIAL_RETUR' && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                        Part (Retur)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-medium text-gray-900">{item.location}</span>
                  </td>
                  <td className="px-4 py-3 text-center print:hidden">
                    <button
                      onClick={() => setSelectedDetail(item)}
                      className="flex-1 lg:flex-none flex items-center justify-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded border border-blue-200 transition-colors"
                    >
                      <Eye className='h-4 w-4'></Eye>
                      <span>View Detail</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            {/* <div>
              Menampilkan <span className="font-semibold text-gray-900">1</span> sampai <span className="font-semibold text-gray-900">{filteredData.filter(i=>i.no).length}</span> dari <span className="font-semibold text-gray-900">{filteredData.filter(i=>i.no).length}</span> data
            </div> */}
            <div className="flex gap-1">
              <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-white text-gray-400 cursor-not-allowed">Sec</button>
              <button className="px-3 py-1 bg-[#FF8A00] text-white rounded-md font-medium shadow-sm shadow-orange-500/20">1</button>
              <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-white text-gray-600 hover:text-[#FF8A00] font-medium transition-colors">2</button>
              <span className="px-2 py-1 text-gray-400">...</span>
              <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-white text-gray-600 hover:text-[#FF8A00] font-medium transition-colors">Selanjutnya</button>
            </div>
        </div>
      </div>

      

      {selectedDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Detail Penerimaan Barang</h3>
              <button
                onClick={() => setSelectedDetail(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">No. Referensi / PO</span>
                <span className="font-mono font-bold text-blue-600">{selectedDetail.noReferensi}</span>
              </div>
              {selectedDetail.noSuratJalanSupplier && (
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-500">No. Surat Jalan</span>
                  <span className="font-mono font-medium text-gray-800">{selectedDetail.noSuratJalanSupplier}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Tgl & Jam</span>
                <span className="font-medium text-gray-800">{selectedDetail.tanggalJam}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Sumber / Pemasok</span>
                <span className="font-medium text-gray-800">{selectedDetail.namaPemasok}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Total Volume</span>
                <span className="font-bold text-gray-900">{selectedDetail.totalVolumeQty} {selectedDetail.satuan}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Status QC</span>
                <span className="font-semibold text-gray-800">{selectedDetail.statusQc}</span>
              </div>
              {selectedDetail.catatan && (
                <div className="py-1">
                  <span className="text-gray-500 block mb-1">Catatan:</span>
                  <p className="bg-gray-50 p-2.5 rounded border border-gray-100 text-xs text-gray-700">{selectedDetail.catatan}</p>
                </div>
              )}
            </div>
            <div className="mt-6 text-right">
              <button
                onClick={() => setSelectedDetail(null)}
                className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    )
}