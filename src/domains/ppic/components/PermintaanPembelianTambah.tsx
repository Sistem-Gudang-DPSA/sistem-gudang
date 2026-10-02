"use client";

import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createPurchaseRequest, resubmitApproval } from '@/domains/ppic/api';
import type { PermintaanPembelian } from '@/domains/ppic/data/pembelian';
import { todayIso } from '@/domains/gudang/date';
import { ApiError } from '@/shared/lib/api-client';
import { INTEGER_INPUT, digitsOnly } from '@/shared/lib/input';

const emptyRow = { namaBarang: "", qty: "", satuan: "", proyek: "", noSpk: "" };

// Dengan `permintaan`, form dipakai untuk memperbaiki permintaan yang diminta revisi lalu mengirim ulang.
export default function TambahPermintaanPembelianPPIC({ permintaan }: { permintaan?: PermintaanPembelian }) {
  const router = useRouter();

  const [header, setHeader] = useState({
    bagian: permintaan?.bagian ?? "",
    namaPemohon: permintaan?.nama ?? "",
    jabatan: permintaan?.jabatan ?? "",
    tanggalPengajuan: permintaan?.tanggal ?? todayIso(),
  });
  const [tableData, setTableData] = useState(() => {
    const rows = (permintaan?.barang ?? []).map((b) => ({ ...b, qty: String(b.qty) }));
    return [...rows, ...Array.from({ length: Math.max(8 - rows.length, 0) }, () => emptyRow)];
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (index: number, field: keyof typeof emptyRow, value: string) => {
    setTableData((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const handleSubmit = async () => {
    const { bagian, namaPemohon, jabatan, tanggalPengajuan } = header;
    if (!bagian || !namaPemohon || !jabatan || !tanggalPengajuan) {
      setError("Lengkapi bagian, nama, jabatan, dan tanggal pengajuan.");
      return;
    }
    const filled = tableData.filter((row) => Object.values(row).some(Boolean));
    if (filled.length === 0 || filled.some((row) => Object.values(row).some((v) => !v) || Number(row.qty) < 1)) {
      setError("Lengkapi semua kolom di setiap baris barang yang dipakai (QTY minimal 1).");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        bagian,
        namaPemohon,
        jabatan,
        tanggalPengajuan,
        items: filled.map((row) => ({ ...row, qty: Math.trunc(Number(row.qty)) })),
        ...(permintaan?.catatan ? { notes: permintaan.catatan } : {}),
      };
      if (permintaan) await resubmitApproval(permintaan.id, payload);
      else await createPurchaseRequest(payload);
      router.push('/dashboard/ppic/transaksi/permintaan-pembelian');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengirim permintaan pembelian.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-800 hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
        </button>
        <h1 className="text-[18px] font-extrabold text-black tracking-wide">
          {permintaan ? 'Perbaiki Permintaan Pembelian' : 'Permintaan Pembelian'}
        </h1>
      </div>

      <div className="max-w-[70rem] w-full">
        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 px-8 py-10 w-full mb-6 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-amber-300 rounded-t-xl"></div>
          
          <div className="text-center mb-10 w-full">
            <h2 className="text-[18px] font-bold text-gray-900 tracking-wide">Permintaan Pembelian</h2>
          </div>

          {/* Form Inputs Header shrinked left align */}
          <div className="flex flex-col gap-5 mb-10 w-full max-w-lg">
            <div className="flex items-center">
              <span className="w-[180px] text-[15px] font-semibold text-gray-700">Bagian/Sub bagian</span>
              <span className="w-8 text-center text-gray-700 font-semibold">:</span>
              <input type="text" placeholder="Contoh: Divisi Produksi / Maintenance" value={header.bagian} maxLength={100} onChange={(e) => setHeader({...header, bagian: e.target.value})} className="flex-1 border border-gray-200 bg-gray-50/50 rounded-lg py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white text-gray-800 placeholder-gray-400 transition-all duration-200" />
            </div>
            <div className="flex items-center">
              <span className="w-[180px] text-[15px] font-semibold text-gray-700">Nama</span>
              <span className="w-8 text-center text-gray-700 font-semibold">:</span>
              <input type="text" placeholder="Masukkan nama pemohon" value={header.namaPemohon} maxLength={191} onChange={(e) => setHeader({...header, namaPemohon: e.target.value})} className="flex-1 border border-gray-200 bg-gray-50/50 rounded-lg py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white text-gray-800 placeholder-gray-400 transition-all duration-200" />
            </div>
            <div className="flex items-center">
              <span className="w-[180px] text-[15px] font-semibold text-gray-700">Jabatan</span>
              <span className="w-8 text-center text-gray-700 font-semibold">:</span>
              <input type="text" placeholder="Masukkan jabatan pemohon" value={header.jabatan} maxLength={100} onChange={(e) => setHeader({...header, jabatan: e.target.value})} className="flex-1 border border-gray-200 bg-gray-50/50 rounded-lg py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white text-gray-800 placeholder-gray-400 transition-all duration-200" />
            </div>
            <div className="flex items-center">
              <span className="w-[180px] text-[15px] font-semibold text-gray-700">Tanggal Pengajuan</span>
              <span className="w-8 text-center text-gray-700 font-semibold">:</span>
              <input type="date" placeholder="DD/MM/YYYY" value={header.tanggalPengajuan} onChange={(e) => setHeader({...header, tanggalPengajuan: e.target.value})} className="flex-1 border border-gray-200 bg-gray-50/50 rounded-lg py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white text-gray-800 placeholder-gray-400 transition-all duration-200" />
            </div>
          </div>

          {/* Divider Custom */}
          <div className="w-full h-px bg-gray-200 mb-8 mt-2"></div>

          <div className="mb-4 text-left">
            <h3 className="text-[16px] font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-6 bg-[#FF8A00] rounded-full"></span>
              Rincian Daftar Barang
            </h3>
          </div>

          {/* Table List Data */}
          <div className="overflow-hidden w-full border border-gray-200/80 rounded-xl shadow-sm">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-50/80 text-gray-500 tracking-wider text-xs font-bold uppercase">
                  <tr>
                    <th className="border-b border-gray-200 px-6 py-4 text-center w-12">No</th>
                    <th className="border-b border-gray-200 px-6 py-4 text-center">Nama Barang</th>
                    <th className="border-b border-gray-200 px-6 py-4 text-center w-28">QTY</th>
                    <th className="border-b border-gray-200 px-6 py-4 text-center w-32">Satuan</th>
                    <th className="border-b border-gray-200 px-6 py-4 text-center w-40">Proyek</th>
                    <th className="border-b border-gray-200 px-6 py-4 text-center w-40">No SPK</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 italic">
                  {tableData.map((row, i) => (
                    <tr key={i} className="bg-white hover:bg-orange-50/10 transition-colors duration-150">
                      <td className="p-0 text-center text-gray-700 h-[48px] border-r border-gray-100/50">
                        {i + 1}
                      </td>
                      <td className="p-0 border-r border-gray-100/50">
                        <input type="text" value={row.namaBarang} maxLength={191} placeholder="Masukkan nama barang" onChange={(e) => handleChange(i, 'namaBarang', e.target.value)} className="w-full h-full px-4 text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500/50 placeholder-gray-300 not-italic" />
                      </td>
                      <td className="p-0 border-r border-gray-100/50">
                        <input {...INTEGER_INPUT} maxLength={9} value={row.qty} placeholder="0" onChange={(e) => handleChange(i, 'qty', digitsOnly(e.target.value))} className="w-full h-full px-4 text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500/50 placeholder-gray-300 not-italic [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      </td>
                      <td className="p-0 border-r border-gray-100/50">
                        <input type="text" value={row.satuan} maxLength={50} placeholder="Pcs/Unit/Koli" onChange={(e) => handleChange(i, 'satuan', e.target.value)} className="w-full h-full px-4 text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500/50 placeholder-gray-300 not-italic" />
                      </td>
                      <td className="p-0 border-r border-gray-100/50">
                        <input type="text" value={row.proyek} maxLength={191} placeholder="Isi nama proyek" onChange={(e) => handleChange(i, 'proyek', e.target.value)} className="w-full h-full px-4 text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500/50 placeholder-gray-300 not-italic" />
                      </td>
                      <td className="p-0">
                        <input type="text" value={row.noSpk} maxLength={100} placeholder="000/SPK/..." onChange={(e) => handleChange(i, 'noSpk', e.target.value)} className="w-full h-full px-4 text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500/50 placeholder-gray-300 not-italic" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Submit Action */}
        {error && <p className="text-sm text-red-500 text-right mb-3">{error}</p>}
        <div className="flex justify-end w-full">
          <button onClick={handleSubmit} disabled={saving} className="disabled:opacity-60 px-8 py-2.5 bg-[#ff8a00] text-white rounded-lg hover:bg-[#eb7d00] transition-all duration-200 font-semibold text-[14px] shadow-sm hover:shadow-md hover:-translate-y-0.5">
            {saving ? 'Mengirim...' : permintaan ? 'Kirim Ulang' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
