"use client";

import React, { useState } from 'react';
import Link from 'next/link';

import { Search, FileUp, Download, Eye, Square } from 'lucide-react';

export default function RekapPermintaan(){
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterSumber, setFilterSumber] = useState<string>('ALL');
    const [startDate, setStartDate] = useState<string>('2026-09-01');
    const [endDate, setEndDate] = useState<string>('2026-09-26');

    return(
        <div className='animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10'>
            <div className='flex flex-col justify-start mb-8 gap-2'>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">REKAP PERMINTAAN</h1>
                <p className="text-gray-500 text-sm">Kelola pengajuan permintaan pengeluaran bahan & barang dari gudang.</p>
            </div>

            <div className="flex flex-wrap justify-between items-center bg-white p-4 border border-gray-200 rounded-lg shadow-sm gap-4 mt-5">
                <div className="flex flex-wrap gap-3 items-center">
                    <div>
                        <label className="block text-xs text-black mb-1">Cari Permintaan</label>
                        <span className="relative flex items-center w-100">
                            <input
                            type="text"
                            placeholder="Cari SPK, Proyek, Tukang" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="border border-gray-300 rounded-md pl-3 pr-10 py-1.5 text-sm w-full bg-white text-black placeholder:text-gray focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button className="absolute right-2 flex items-center justify-center">
                            <Search className="text-black w-4 h-4" />
                            </button>
                        </span>
                    </div> 

                    <div>
                        <label className="block text-xs text-black mb-1">Status Permintaan</label>
                        <select
                        value={filterSumber}
                        onChange={(e) => setFilterSumber(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500c text-black"
                        >
                        <option value="ALL" className='text-black'>Semua Status</option>
                        <option value="SELESAI" className='text-black'>Selesai</option>
                        <option value="PROSES" className='text-black'>Menunggu Proses</option>
                        <option value="PENDING" className='text-black'>Menunggu PPIC</option>
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
                </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-sm mt-5">
                <div className="flex gap-2 items-end justify-between">
                    <div className="flex gap-2 items-end m-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase m-2">Tabel Rekap Permintaan Barang</p>
                    </div>
                    <div className="flex gap-2 items-end m-2">
                        <button 
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm shrink-0"
                        >
                        <FileUp className='h-4 w-4'></FileUp>
                        <span>Export Excel</span>
                        </button>
                        <button 
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm shrink-0"
                        >
                        <Download className='h-4 w-4'></Download>
                        <span>Cetak PDF</span>
                        </button>
                    </div>
                </div>
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-100 font-semibold text-gray-700">
                        <tr>
                        <th className="px-4 py-3 text-center w-12">No</th>
                        <th className="px-4 py-3 text-left">Tgl Permintaan</th>
                        <th className="px-4 py-3 text-left">SPK</th>
                        <th className="px-4 py-3 text-left">Nama Klien</th>
                        <th className="px-4 py-3 text-right">Item Produksi</th>
                        <th className="px-4 py-3 text-center">Group Tukang</th>
                        <th className="px-4 py-3 text-center">Aksi</th>
                        <th className="flex px-4 py-3 text-center">
                            Pilih<Square className='h-5 w-5 ml-2 mt-auto'></Square>
                        </th>                        
                        </tr>
                    </thead>
                    <tbody>
                        
                    </tbody>
                </table>
            </div>
        </div>
    )
}