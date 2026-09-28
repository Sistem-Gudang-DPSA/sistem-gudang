"use client";

import React, { useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TambahStockOpnameGudang() {
  const router = useRouter();

  const [data, setData] = useState([
    { no: "1.", namaBarang: "Triplex 3mm", satuan: "Lembar", kategori: "Lembaran", jumlah: "", harga: "", keterangan: "" },
    { no: "2.", namaBarang: "Triplex 3mm", satuan: "Lembar", kategori: "Lembaran", jumlah: "", harga: "", keterangan: "" },
    { no: "", namaBarang: "", satuan: "", kategori: "", jumlah: "", harga: "", keterangan: "" },
    { no: "", namaBarang: "", satuan: "", kategori: "", jumlah: "", harga: "", keterangan: "" },
    { no: "", namaBarang: "", satuan: "", kategori: "", jumlah: "", harga: "", keterangan: "" },
    { no: "", namaBarang: "", satuan: "", kategori: "", jumlah: "", harga: "", keterangan: "" },
    { no: "", namaBarang: "", satuan: "", kategori: "", jumlah: "", harga: "", keterangan: "" },
  ]);

  const handleChange = (index: number, field: string, value: string) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: value };
    setData(newData);
  };

  const handleAddRow = () => {
    setData([...data, { no: "", namaBarang: "", satuan: "", kategori: "", jumlah: "", harga: "", keterangan: "" }]);
  };

  return (
    <div className="flex flex-col bg-white min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="text-gray-800 hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
        </button>
        <h1 className="text-[19px] font-extrabold text-black tracking-wide">
          Tambah Stok Opname Maret 2026
        </h1>
      </div>

      <div className="max-w-5xl">
        <div className="relative">
          {/* Table Wrapper */}
          <div className="overflow-hidden w-full bg-white rounded-xl shadow-sm border border-gray-200/80">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                  <tr>
                    <th rowSpan={2} className="border-r border-b border-gray-200 px-6 py-4 align-top w-12 whitespace-nowrap text-center">No</th>
                    <th rowSpan={2} className="border-r border-b border-gray-200 px-6 py-4 align-top whitespace-nowrap">Nama Barang</th>
                    <th rowSpan={2} className="border-r border-b border-gray-200 px-6 py-4 align-top whitespace-nowrap">Satuan</th>
                    <th rowSpan={2} className="border-r border-b border-gray-200 px-6 py-4 align-top whitespace-nowrap">Kategori</th>
                    <th colSpan={2} className="border-r border-b border-gray-200 px-6 py-2.5 text-center whitespace-nowrap">Fisik</th>
                    <th rowSpan={2} className="border-b border-gray-200 px-6 py-4 align-top whitespace-nowrap">Keterangan</th>
                  </tr>
                  <tr>
                    <th className="border-r border-b border-gray-200 px-6 py-2.5 font-semibold whitespace-nowrap text-center">Jumlah</th>
                    <th className="border-r border-b border-gray-200 px-6 py-2.5 font-semibold whitespace-nowrap text-center">Harga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((item, index) => (
                    <tr key={index} className="bg-white hover:bg-orange-50/10 transition-colors duration-150">
                      <td className="border-r border-b border-gray-100/50 h-[48px] text-gray-400 font-medium text-center text-xs">{item.no || index + 1}</td>
                      <td className="border-r border-b border-gray-100/50 p-0">
                        <input type="text" value={item.namaBarang} placeholder="Masukkan nama barang" onChange={(e) => handleChange(index, 'namaBarang', e.target.value)} className="w-full h-full min-h-[48px] px-6 py-2 bg-transparent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500/50 text-gray-700 text-sm transition-all placeholder-gray-300" />
                      </td>
                      <td className="border-r border-b border-gray-100/50 p-0 w-24">
                        <input type="text" value={item.satuan} placeholder="Unit" onChange={(e) => handleChange(index, 'satuan', e.target.value)} className="w-full h-full min-h-[48px] px-4 py-2 bg-transparent text-center focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500/50 text-gray-700 text-sm transition-all placeholder-gray-300" />
                      </td>
                      <td className="border-r border-b border-gray-100/50 p-0 w-32">
                        <input type="text" value={item.kategori} placeholder="Kategori" onChange={(e) => handleChange(index, 'kategori', e.target.value)} className="w-full h-full min-h-[48px] px-4 py-2 bg-transparent text-center focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500/50 text-gray-700 text-sm transition-all placeholder-gray-300" />
                      </td>
                      <td className="border-r border-b border-gray-100/50 p-0 w-28">
                        <input type="number" value={item.jumlah} placeholder="0" onChange={(e) => handleChange(index, 'jumlah', e.target.value)} className="w-full h-full min-h-[48px] px-4 py-2 bg-transparent text-center focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500/50 text-gray-700 text-sm transition-all placeholder-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      </td>
                      <td className="border-r border-b border-gray-100/50 p-0 w-36">
                        <input type="number" value={item.harga} placeholder="0" onChange={(e) => handleChange(index, 'harga', e.target.value)} className="w-full h-full min-h-[48px] px-4 py-2 bg-transparent text-center focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500/50 text-gray-700 text-sm transition-all placeholder-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      </td>
                      <td className="border-b border-gray-100/50 p-0">
                        <input type="text" value={item.keterangan} placeholder="Tambahkan catatan..." onChange={(e) => handleChange(index, 'keterangan', e.target.value)} className="w-full h-full min-h-[48px] px-6 py-2 bg-transparent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500/50 text-gray-700 text-sm transition-all placeholder-gray-300 italic" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* The Float (+) Button right on the bottom-left border */}
          <button 
            onClick={handleAddRow}
            className="absolute -left-[14px] -bottom-[14px] w-[34px] h-[34px] rounded-lg border-2 border-[#ff8a00] flex items-center justify-center text-[#ff8a00] bg-white hover:bg-orange-50 hover:shadow-md hover:-translate-y-0.5 z-10 shadow-sm leading-none transition-all duration-200"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Simpan Button underneath */}
        <div className="flex justify-end mt-6">
           <button className="px-8 py-2.5 bg-[#ff8a00] text-white rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:bg-[#eb7d00] transition-all duration-200 font-semibold text-sm">
             Simpan
           </button>
        </div>
      </div>
    </div>
  );
}
