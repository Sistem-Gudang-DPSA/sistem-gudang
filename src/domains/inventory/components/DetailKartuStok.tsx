// KartuStokDetail.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, AlertCircle, Download } from 'lucide-react';
import { getStockCard } from '@/domains/inventory/api';
import { buildKartu } from '@/domains/inventory/components/KartuStok';
import { exportKartuExcel, printKartuPdf } from '@/shared/components/ExportStok';
import { displayDate } from '@/domains/inventory/date';
import { useApiData } from '@/shared/lib/use-api-data';
import { ExportExcellButton } from '@/shared/components/Tombol';

const fmt = (n: number) => n.toLocaleString('id-ID');

export default function KartuStokDetail() {
    const params = useParams<{ id: string }>();
    const itemId = Number(params.id);
    const { data, loading, error, reload } = useApiData(() => getStockCard(itemId), `kartu-stok-${itemId}`, 'Gagal memuat kartu stok.');
    const kartu = data ? buildKartu(data) : null;
    const tidakSinkron = data && kartu ? kartu.saldoAkhir !== data.item.stock : false;

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
                    <div className="flex items-center gap-2">
                        <ExportExcellButton onClick={() => data && exportKartuExcel(data)} disabled={!data} />
                        <button
                            type="button"
                            onClick={() => data && printKartuPdf(data)}
                            disabled={!data}
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
                                            <td className="px-6 py-4 font-medium text-gray-900">{r.project ?? '-'}</td>
                                            <td className="px-6 py-4 text-gray-600">{r.usage || '-'}</td>
                                            <td className="px-6 py-4 text-right font-semibold text-green-600">{r.qtyIn ? fmt(r.qtyIn) : ''}</td>
                                            <td className="px-6 py-4 text-right font-semibold text-red-600">{r.qtyOut ? fmt(r.qtyOut) : ''}</td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900">{fmt(r.saldo)}</td>
                                            <td className="px-6 py-4 text-gray-600">{r.note ?? '-'}</td>
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