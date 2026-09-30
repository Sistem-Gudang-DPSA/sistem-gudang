"use client";

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createStockOpname } from '@/domains/gudang/api';
import { listItems } from '@/domains/inventory/api';
import type { ItemListRow } from '@/domains/inventory/types';
import { ApiError } from '@/shared/lib/api-client';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const emptyRow = { itemId: "", jumlah: "", keterangan: "" };

export default function TambahStockOpnameGudang() {
  const router = useRouter();

  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [items, setItems] = useState<ItemListRow[]>([]);
  const [data, setData] = useState(Array.from({ length: 7 }, () => emptyRow));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listItems({ pageSize: 100 })
      .then((res) => setItems(res.rows))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat data barang."));
  }, []);

  const handleChange = (index: number, patch: Partial<typeof emptyRow>) => {
    setData((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleAddRow = () => {
    setData((prev) => [...prev, emptyRow]);
  };

  const findItem = (itemId: string) => items.find((it) => String(it.id) === itemId);

  const handleSimpan = async () => {
    const filled = data.filter((row) => row.itemId || row.jumlah || row.keterangan);
    if (filled.length === 0 || filled.some((row) => !row.itemId || row.jumlah === "")) {
      setError("Pilih barang dan isi jumlah fisik di setiap baris yang dipakai.");
      return;
    }
    const ids = filled.map((row) => row.itemId);
    if (new Set(ids).size !== ids.length) {
      setError("Satu barang hanya boleh muncul sekali per stok opname.");
      return;
    }
    // Stock opname overwrites stock with the physical count, so confirm first.
    const changed = filled.filter((row) => Number(row.jumlah) !== findItem(row.itemId)?.stock).length;
    if (!window.confirm(`Stok ${filled.length} barang akan disetel ke jumlah fisik (${changed} berbeda dari stok sistem). Lanjutkan?`)) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createStockOpname({
        month: Number(month),
        year: Number(year),
        lines: filled.map((row) => ({
          itemId: Number(row.itemId),
          physicalQty: Number(row.jumlah),
          note: row.keterangan || undefined,
        })),
      });
      router.push('/dashboard/gudang/transaksi/stock-opname');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan stok opname.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col bg-white min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="text-gray-800 hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
        </button>
        <h1 className="text-[19px] font-extrabold text-black tracking-wide">
          Tambah Stok Opname {BULAN[Number(month) - 1]} {year}
        </h1>
      </div>

      <div className="max-w-5xl">
        <div className="flex gap-3 mb-6">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-200 rounded-xl py-2.5 px-3 shadow-sm text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20"
          >
            {BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="border border-gray-200 rounded-xl py-2.5 px-3 shadow-sm text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20"
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

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
                  {data.map((row, index) => {
                    const item = findItem(row.itemId);
                    return (
                      <tr key={index} className="bg-white hover:bg-orange-50/10 transition-colors duration-150">
                        <td className="border-r border-b border-gray-100/50 h-[48px] text-gray-400 font-medium text-center text-xs">{index + 1}</td>
                        <td className="border-r border-b border-gray-100/50 p-0">
                          <select
                            value={row.itemId}
                            onChange={(e) => handleChange(index, { itemId: e.target.value })}
                            className="w-full h-full min-h-[48px] px-6 py-2 bg-transparent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500/50 text-gray-700 text-sm"
                          >
                            <option value="">Pilih barang</option>
                            {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                          </select>
                          {item && <span className="block px-6 pb-1 text-[11px] text-gray-400">Stok sistem: {item.stock}</span>}
                        </td>
                        <td className="border-r border-b border-gray-100/50 px-4 py-2 w-24 text-center text-gray-600">{item?.unit ?? ''}</td>
                        <td className="border-r border-b border-gray-100/50 px-4 py-2 w-32 text-center text-gray-600">{item?.category ?? ''}</td>
                        <td className="border-r border-b border-gray-100/50 p-0 w-28">
                          <input type="number" min={0} value={row.jumlah} placeholder="0" onChange={(e) => handleChange(index, { jumlah: e.target.value })} className="w-full h-full min-h-[48px] px-4 py-2 bg-transparent text-center focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500/50 text-gray-700 text-sm transition-all placeholder-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        </td>
                        <td className="border-r border-b border-gray-100/50 px-4 py-2 w-36 text-center text-gray-600">
                          {item ? item.price.toLocaleString('id-ID') : ''}
                        </td>
                        <td className="border-b border-gray-100/50 p-0">
                          <input type="text" value={row.keterangan} placeholder="Tambahkan catatan..." onChange={(e) => handleChange(index, { keterangan: e.target.value })} className="w-full h-full min-h-[48px] px-6 py-2 bg-transparent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500/50 text-gray-700 text-sm transition-all placeholder-gray-300 italic" />
                        </td>
                      </tr>
                    );
                  })}
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
        {error && <p className="text-sm text-red-500 text-right mt-4">{error}</p>}
        <div className="flex justify-end mt-6">
           <button
             onClick={handleSimpan}
             disabled={saving}
             className="px-8 py-2.5 bg-[#ff8a00] text-white rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:bg-[#eb7d00] transition-all duration-200 font-semibold text-sm disabled:opacity-60"
           >
             {saving ? 'Menyimpan...' : 'Simpan'}
           </button>
        </div>
      </div>
    </div>
  );
}
