"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, AlertCircle, Download, Filter } from 'lucide-react';
import { getStockCard } from '@/domains/inventory/api';
import { buildKartu } from '@/domains/inventory/components/KartuStok';
import { exportKartuExcel, printKartuPdf } from '@/shared/components/ExportStok';
import { displayDate, todayIso } from '@/domains/inventory/date';
import { useApiData } from '@/shared/lib/use-api-data';
import { ExportExcellButton } from '@/shared/components/Tombol';

const monthStart = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

const fmt = (n: number) => n.toLocaleString('id-ID');

export default function KartuStokDetail() {
    const params = useParams<{ id: string }>();
    const itemId = Number(params.id);
    const { data, loading, error, reload } = useApiData(() => getStockCard(itemId), `kartu-stok-${itemId}`, 'Gagal memuat kartu stok.');

    const [startDate, setStartDate] = useState<string>(monthStart());
    const [endDate, setEndDate] = useState<string>(todayIso());
    const [showFilter, setShowFilter] = useState(false);
    const activeDateFilters = [startDate, endDate].filter(Boolean).length;
    const rentangTerbalik = !!startDate && !!endDate && startDate > endDate;

    const filtered = useMemo(() => {
        if (!data) return null;
        if (rentangTerbalik) return data;
        const sebelum = startDate ? data.entries.filter((e) => e.date < startDate) : [];
        const opening = data.openingBalance + sebelum.reduce((s, e) => s + e.qtyIn - e.qtyOut, 0);
        return {
            ...data,
            openingBalance: opening,
            entries: data.entries.filter((e) => (!startDate || e.date >= startDate) && (!endDate || e.date <= endDate)),
        };
    }, [data, startDate, endDate, rentangTerbalik]);
    const kartu = filtered ? buildKartu(filtered) : null;
    const sampaiSekarang = !endDate || endDate >= todayIso();
    const tidakSinkron = data && kartu && sampaiSekarang ? kartu.saldoAkhir !== data.item.stock : false;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <Link href="/dashboard/gudang/laporan/kartu-stok" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
                <ArrowLeft className="w-4 h-4" /> Kembali ke daftar
            </Link>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Kartu Stok{data ? ` · ${data.item.name}` : ''}</h1>
                        {data && (
                            <p className="text-sm text-gray-500 mt-0.5">
                                Kode <span className="font-mono">{data.item.code ?? '-'}</span> · Satuan {data.item.unit} · Stok saat ini{' '}
                                <span className="font-bold text-gray-800">{fmt(data.item.stock)}</span>
                            </p>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowFilter((v) => !v)}
                            aria-expanded={showFilter}
                            className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors text-sm font-medium ${showFilter || activeDateFilters > 0
                                    ? 'bg-orange-50 border-orange-300 text-orange-700'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <Filter className="w-4 h-4" />
                            <span>Filter{activeDateFilters > 0 ? ` (${activeDateFilters})` : ''}</span>
                        </button>
                        <ExportExcellButton onClick={() => filtered && exportKartuExcel(filtered)} disabled={!filtered} />
                        <button
                            type="button"
                            onClick={() => filtered && printKartuPdf(filtered)}
                            disabled={!filtered}
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Print PDF</span>
                        </button>
                        <button type="button" onClick={reload} className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                            Muat ulang
                        </button>
                    </div>
                </div>

                {showFilter && (
                    <div className="flex flex-wrap items-end gap-3 px-5 py-3 border-b border-gray-100 bg-white">
                        <div>
                            <label htmlFor="ks-mulai" className="block text-xs text-gray-600 mb-1">Dari tanggal</label>
                            <input id="ks-mulai" type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                        </div>
                        <span className="pb-2.5 text-xs text-gray-500 font-medium">s/d</span>
                        <div>
                            <label htmlFor="ks-akhir" className="block text-xs text-gray-600 mb-1">Sampai tanggal</label>
                            <input id="ks-akhir" type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                        </div>
                        {activeDateFilters > 0 && (
                            <button type="button" onClick={() => { setStartDate(''); setEndDate(''); }} className="pb-2.5 text-xs text-orange-600 font-bold hover:underline">
                                Reset
                            </button>
                        )}
                    </div>
                )}

                {rentangTerbalik && (
                    <p role="alert" className="mx-5 mt-5 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                        Tanggal mulai tidak boleh setelah tanggal akhir. Filter diabaikan sampai diperbaiki.
                    </p>
                )}

                {tidakSinkron && kartu && data && (
                    <div className="mx-5 mt-5 flex items-start gap-2 p-3 bg-amber-50 text-amber-800 text-sm rounded-lg">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>
                            Saldo akhir kartu ({fmt(kartu.saldoAkhir)}) berbeda dari stok barang ({fmt(data.item.stock)}). Ada perubahan stok yang belum tercatat sebagai mutasi.
                        </span>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
                            <tr>
                                <th rowSpan={2} scope="col" className="px-6 py-4 w-16 align-middle">No</th>
                                <th rowSpan={2} scope="col" className="px-6 py-4 align-middle">Tanggal</th>
                                <th colSpan={2} scope="colgroup" className="px-6 py-3 text-center border-b border-gray-200">Informasi Mutasi</th>
                                <th rowSpan={2} scope="col" className="px-6 py-4 text-right align-middle">Masuk</th>
                                <th rowSpan={2} scope="col" className="px-6 py-4 text-right align-middle">Keluar</th>
                                <th rowSpan={2} scope="col" className="px-6 py-4 text-right align-middle">Saldo</th>
                                <th rowSpan={2} scope="col" className="px-6 py-4 align-middle">Keterangan</th>
                            </tr>
                            <tr>
                                <th scope="col" className="px-6 py-3">Nama Proyek</th>
                                <th scope="col" className="px-6 py-3">Penggunaan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading && <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400">Memuat data...</td></tr>}
                            {!loading && error && <tr><td colSpan={8} className="px-6 py-10 text-center text-red-500">{error}</td></tr>}
                            {!loading && !error && data && kartu && (
                                <>
                                    <tr className="bg-gray-50/60">
                                        <td colSpan={4} className="px-6 py-3 font-semibold text-gray-700">Saldo awal</td>
                                        <td className="px-6 py-3" />
                                        <td className="px-6 py-3" />
                                        <td className="px-6 py-3 text-right font-bold text-gray-800">{fmt(data.openingBalance)}</td>
                                        <td className="px-6 py-3" />
                                    </tr>

                                    {kartu.rows.map((r, i) => (
                                        <tr key={r.id} className="hover:bg-[#FF8A00]/5 transition-colors">
                                            <td className="px-6 py-4 text-gray-500">{i + 1}</td>
                                            <td className="px-6 py-4 text-gray-600">{displayDate(r.date)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">{r.project ?? '-'}</span>
                                                    {(r.spk) && (
                                                        <span className="text-xs text-gray-500">{[r.spk && `${r.spk}`]}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{r.client || '-'}</td>
                                            <td className="px-6 py-4 text-right font-semibold text-green-600">{r.qtyIn ? fmt(r.qtyIn) : ''}</td>
                                            <td className="px-6 py-4 text-right font-semibold text-red-600">{r.qtyOut ? fmt(r.qtyOut) : ''}</td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900">{fmt(r.saldo)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">{r.noTransaksi ?? r.note ?? '-'}</span>
                                                    {(r.usage) && (
                                                        <span className="text-xs text-gray-500">{[r.usage && `${r.usage}`]}</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {kartu.rows.length === 0 && (
                                        <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400 italic">Belum ada mutasi untuk barang ini.</td></tr>
                                    )}

                                    <tr className="bg-gray-50/60 border-t border-gray-200">
                                        <td colSpan={4} className="px-6 py-3 font-semibold text-gray-700">Total / Saldo akhir</td>
                                        <td className="px-6 py-3 text-right font-bold text-green-600">{fmt(kartu.totalIn)}</td>
                                        <td className="px-6 py-3 text-right font-bold text-red-600">{fmt(kartu.totalOut)}</td>
                                        <td className="px-6 py-3 text-right font-bold text-gray-900">{fmt(kartu.saldoAkhir)}</td>
                                        <td className="px-6 py-3" />
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}