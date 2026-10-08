"use client";

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Search, Download } from 'lucide-react';
import Link from 'next/link';
import { formatAngka } from '@/domains/ppic/data/dokubah';
import { getSupplierPrices, saveSupplierPrices } from '@/domains/purchasing/api';
import type { SupplierPriceChange } from '@/domains/purchasing/types';
import { useCan } from '@/domains/auth/user-context';
import { ApiError } from '@/shared/lib/api-client';
import { INTEGER_INPUT, digitsOnly } from '@/shared/lib/input';
import { useApiData } from '@/shared/lib/use-api-data';

const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const tahunSekarang = new Date().getFullYear();
const daftarTahun = Array.from({ length: 5 }, (_, i) => tahunSekarang + 1 - i);

// Draft edits are keyed by "itemId-bulan"; an empty string means the price was cleared.
const cellKey = (itemId: number, bulan: number) => `${itemId}-${bulan}`;

export default function DetailDataBarang() {
  const { id } = useParams<{ id: string }>();
  const canUpdate = useCan('supplier.update');
  const [tahun, setTahun] = useState(tahunSekarang);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [inputHarga, setInputHarga] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const { data, loading, error, reload } = useApiData(() => getSupplierPrices(id, tahun), `${id}|${tahun}`, 'Gagal memuat harga supplier.');
  // The previous year is only fetched for its average column.
  const { data: sebelumnya, reload: reloadSebelumnya } = useApiData(() => getSupplierPrices(id, tahun - 1), `${id}|${tahun - 1}`, 'Gagal memuat harga tahun sebelumnya.');
  const rataSebelumnya = new Map((sebelumnya?.rows ?? []).map((r) => [r.itemId, r.rataRata]));

  const keyword = searchQuery.trim().toLowerCase();
  const rows = (data?.rows ?? []).filter((r) => !keyword || r.nama.toLowerCase().includes(keyword) || (r.kode ?? '').toLowerCase().includes(keyword));
  const perubahan = Object.keys(drafts).length;

  const nilaiSel = (itemId: number, bulan: number, tersimpan: number | null) => {
    const draft = drafts[cellKey(itemId, bulan)];
    if (draft === undefined) return tersimpan;
    return draft === '' ? null : Number(draft);
  };

  const gantiTahun = (next: number) => {
    setTahun(next);
    setDrafts({});
    setEditingCell(null);
  };

  const simpanSel = (itemId: number, bulan: number, tersimpan: number | null) => {
    const baru = inputHarga === '' ? null : Number(inputHarga);
    setDrafts((prev) => {
      const next = { ...prev };
      const key = cellKey(itemId, bulan);
      if (baru === tersimpan) delete next[key];
      else next[key] = inputHarga;
      return next;
    });
    setEditingCell(null);
  };

  const handleSimpan = async () => {
    const prices: SupplierPriceChange[] = Object.entries(drafts).map(([key, value]) => {
      const [itemId, bulan] = key.split('-').map(Number);
      return { itemId, bulan, harga: value === '' ? null : Number(value) };
    });
    setSaving(true);
    setSaveError('');
    try {
      await saveSupplierPrices(id, tahun, prices);
      setDrafts({});
      setIsConfirmModalOpen(false);
      reload();
      reloadSebelumnya();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Gagal menyimpan harga.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col justify-start mb-8 gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">DETAIL DATA BARANG</h1>
        <p className="text-gray-500 text-sm">
          Kelola daftar harga barang per bulan untuk supplier {data?.supplierName ?? 'terkait'}.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
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
                maxLength={100}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all shadow-sm"
                placeholder="Cari kode atau nama barang..."
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="harga-tahun" className="text-sm text-gray-600">Tahun</label>
              <select
                id="harga-tahun"
                value={tahun}
                onChange={(e) => gantiTahun(Number(e.target.value))}
                className="border border-gray-200 rounded-xl py-2.5 px-3 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20"
              >
                {daftarTahun.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        {error && <div className="mx-5 mt-5 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-[13px] whitespace-nowrap border-collapse">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th rowSpan={2} className="px-4 py-3 border-r border-gray-100 text-center align-middle w-12">No</th>
                <th rowSpan={2} className="px-4 py-3 border-r border-gray-100 align-middle min-w-25">Kode Barang</th>
                <th rowSpan={2} className="px-4 py-3 border-r border-gray-100 align-middle min-w-35 whitespace-normal uppercase font-bold text-gray-900">Nama Barang</th>
                <th rowSpan={2} className="px-4 py-3 border-r border-gray-100 text-center align-middle whitespace-normal w-20">Pajak Vendor</th>
                <th rowSpan={2} className="px-4 py-3 border-r border-gray-100 align-middle w-16 text-center">Satuan</th>
                <th rowSpan={2} className="px-4 py-3 border-r border-gray-100 align-middle w-20 text-center">Kategori</th>
                <th colSpan={12} className="px-4 py-3 border-r border-gray-100 text-center font-bold text-[#FF8A00] bg-orange-50/30">Harga (Belum Termasuk PPN)</th>
                <th rowSpan={2} className="px-4 py-3 border-l border-gray-100 text-center align-middle whitespace-normal w-24 min-w-24 sticky right-24 bg-amber-50/90 text-amber-900 font-bold z-20">
                  Rata-rata {tahun}
                </th>
                <th rowSpan={2} className="px-4 py-3 border-l border-gray-100 text-center align-middle whitespace-normal w-24 min-w-24 sticky right-0 bg-blue-50/90 text-blue-900 font-bold z-20">
                  Rata-rata {tahun - 1}
                </th>
              </tr>
              <tr className="bg-orange-50/10">
                {months.map((m) => (
                  <th key={m} className="px-3 py-2 border-r border-gray-100 font-bold text-center min-w-25 text-[11px] uppercase tracking-wider">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-600">
              {loading && (
                <tr><td colSpan={20} className="px-6 py-6 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && !error && rows.length === 0 && (
                <tr><td colSpan={20} className="px-6 py-6 text-center text-gray-400">Belum ada barang untuk supplier ini.</td></tr>
              )}
              {!loading && rows.map((item, index) => (
                <tr key={item.itemId} className="hover:bg-[#FF8A00]/5 transition-colors group">
                  <td className="px-4 py-4 text-gray-500 text-center font-medium">{index + 1}.</td>
                  <td className="px-4 py-4 text-gray-400 font-mono text-[11px]">{item.kode ?? '-'}</td>
                  <td className="px-4 py-4 font-bold text-gray-900 whitespace-normal">{item.nama}</td>
                  <td className="px-4 py-4 text-center">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">
                      {data?.pajak === 'PKP' ? 'PKP' : 'Non PKP'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center text-gray-500">{item.satuan}</td>
                  <td className="px-4 py-4 text-center">
                    <span className="px-2 py-1 bg-orange-50 text-[#FF8A00] rounded text-[10px] font-bold">{item.kategori}</span>
                  </td>

                  {months.map((month, i) => {
                    const bulan = i + 1;
                    const key = cellKey(item.itemId, bulan);
                    const tersimpan = item.harga[i] ?? null;
                    const nilai = nilaiSel(item.itemId, bulan, tersimpan);
                    const berubah = drafts[key] !== undefined;
                    return (
                      <td key={month} className={`border-r border-gray-100 text-gray-900 cursor-pointer transition-colors group/cell p-0 relative min-w-25 ${berubah ? 'bg-yellow-50' : ''}`}>
                        {editingCell === key ? (
                          <input
                            {...INTEGER_INPUT}
                            autoFocus
                            value={inputHarga}
                            maxLength={9}
                            aria-label={`Harga ${item.nama} bulan ${month}`}
                            onChange={(e) => setInputHarga(digitsOnly(e.target.value))}
                            onBlur={() => simpanSel(item.itemId, bulan, tersimpan)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') simpanSel(item.itemId, bulan, tersimpan);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="w-full h-full min-h-12 px-2 border-2 border-[#FF8A00] font-bold focus:outline-none bg-white z-10 relative text-center text-sm"
                          />
                        ) : (
                          <div
                            onClick={canUpdate ? () => {
                              setEditingCell(key);
                              setInputHarga(nilai === null ? '' : String(nilai));
                            } : undefined}
                            className="w-full h-full min-h-12 flex justify-center items-center px-1 font-bold text-gray-700 hover:bg-[#FF8A00]/10 transition-colors"
                            title={canUpdate ? `Klik untuk edit harga ${month}` : undefined}
                          >
                            {nilai !== null ? (
                              <span className="text-sm">{formatAngka(nilai)}</span>
                            ) : (
                              canUpdate ? <span className="text-gray-300 font-medium text-[10px] italic group-hover/cell:text-[#FF8A00]">+ Input</span> : <span className="text-gray-300">-</span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  <td className="px-4 py-4 font-bold text-amber-600 text-center sticky right-24 bg-amber-50/50 group-hover:bg-amber-100/50 z-10 transition-colors border-l border-gray-100">
                    {item.rataRata === null ? '-' : formatAngka(item.rataRata)}
                  </td>
                  <td className="px-4 py-4 font-bold text-blue-600 text-center sticky right-0 bg-blue-50/50 group-hover:bg-blue-100/50 z-10 transition-colors border-l border-gray-100">
                    {rataSebelumnya.get(item.itemId) == null ? '-' : formatAngka(rataSebelumnya.get(item.itemId) as number)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50 text-sm text-gray-500">
          {data ? `${rows.length} barang` : ''}{perubahan > 0 ? `, ${perubahan} perubahan belum disimpan` : ''}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3 mt-8">
        <button className="flex items-center gap-2 px-6 py-2.5 border-2 border-[#FF8A00] text-[#FF8A00] font-bold rounded-xl hover:bg-orange-50 transition-all text-xs uppercase tracking-wider">
          <Download className="w-4 h-4" />
          Download PDF
        </button>
        <Link href="/dashboard/purchasing/master/data-supplier" className="flex items-center justify-center px-8 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all text-xs uppercase tracking-wider">
          Kembali
        </Link>
        {canUpdate && <button
          disabled={perubahan === 0}
          onClick={() => { setSaveError(''); setIsConfirmModalOpen(true); }}
          className="px-8 py-2.5 bg-[#FF8A00] text-white font-bold rounded-xl hover:bg-orange-600 transition-all text-xs uppercase tracking-wider shadow-sm shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Simpan Perubahan
        </button>}
      </div>

      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-6 mx-auto">
              <Download className="w-8 h-8 text-[#FF8A00] rotate-180" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Konfirmasi Update</h2>
            <p className="text-gray-500 mb-8 text-center leading-relaxed">
              Simpan {perubahan} perubahan harga untuk tahun {tahun}?
            </p>
            {saveError && <p role="alert" className="mb-4 text-sm text-red-600 text-center">{saveError}</p>}
            <div className="flex gap-3">
              <button
                disabled={saving}
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-colors uppercase text-xs tracking-wider disabled:opacity-50"
              >
                Batal
              </button>
              <button
                disabled={saving}
                onClick={handleSimpan}
                className="flex-1 px-6 py-3 bg-[#FF8A00] text-white font-bold rounded-2xl hover:bg-orange-600 shadow-lg shadow-orange-500/30 transition-colors uppercase text-xs tracking-wider disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : 'Ya, Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
