"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { formatRupiah } from '@/domains/ppic/data/dokubah';
import type { ItemListRow } from '@/domains/inventory/types';
import { SUMBER_DATA_NOTICE, loadAllItems, loadRincianSpk, realisasiSpkPath, statusRealisasi } from '@/domains/inventory/components/RealisasiSPK';
import { exportRincianExcel, openPrintWindow, printRincianPdf } from '@/shared/components/ExportRealisasi';
import { useApiData } from '@/shared/lib/use-api-data';
import SearchableSelect from '@/shared/components/SearchableSelect';
import { ExportExcellButton, PrintPdfButton } from '@/shared/components/Tombol';
import { listMaterialRequests } from '@/domains/inventory/api';

type Mode = 'biaya' | 'material';
const th = 'px-4 py-3';
const selectClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white ' +
    'focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors';

// Route entry for /dashboard/gudang/laporan/realisasi-spk/[id]. key={id} remounts the
// detail when moving to another SPK, so its filters start fresh.
export default function DetailRealisasiSPKPage() {
    const { id } = useParams<{ id: string }>();
    const noSpk = decodeURIComponent(id);
    return <RincianSpkDetail key={noSpk} id={noSpk} mode="biaya" backHref={realisasiSpkPath} />;
}

export function RincianSpkDetail({ id, mode, backHref }: {
    id: string;                        // No. SPK
    mode: Mode;
    backHref: string;                  // halaman daftar
}) {
    const [hanyaTerpakai, setHanyaTerpakai] = useState(true);
    const [produkDipilih, setProdukDipilih] = useState('');

    // Harga barang hanya dibutuhkan untuk rincian biaya
    const { data: items, loading: loadingItems, error: errItems } = useApiData(
        () => (mode === 'biaya' ? loadAllItems() : Promise.resolve([] as ItemListRow[])),
        `rincian-items|${mode}`,
        'Gagal memuat harga barang.',
    );
    const { data: rincian, loading, error } = useApiData(
        () => (items ? loadRincianSpk(id, items) : Promise.resolve(null)),
        `rincian|${id}|${items ? 'ok' : 'tunggu'}`,
        'Gagal memuat rincian SPK.',
    );

    const { data: permintaan } = useApiData(
        () => listMaterialRequests({ page: 1, pageSize: 100 }),
        'rincian-produk-spk',
        'Gagal memuat daftar produk SPK.',
    );

    const produkOptions = useMemo(() => {
        const produk = (permintaan?.rows ?? [])
            .filter((r) => r.spk === rincian?.noSpk);

        return Array.from(
            new Set(produk.map((r) => r.productionItem).filter(Boolean))
        ).map((nama) => ({
            value: nama,
            label: nama,
        }));
    }, [permintaan, rincian]);



    const rows = useMemo(
        () =>
            (rincian?.rows ?? []).filter((r) => {
                const sesuaiPemakaian = !hanyaTerpakai || r.qty > 0;
                const sesuaiBarang = !produkDipilih || r.kode === produkDipilih;

                return sesuaiPemakaian && sesuaiBarang;
            }),
        [rincian, hanyaTerpakai, produkDipilih]
    );
    const memuat = loadingItems || loading || (!rincian && !error && !errItems);
    const galat = errItems || error;
    // anggaran null selama data dari barang keluar: sisa dan status belum bisa dihitung
    const sisa = rincian && rincian.anggaran !== null ? rincian.anggaran - rincian.totalBiaya : null;
    const status = rincian && rincian.anggaran !== null ? statusRealisasi(rincian.anggaran, rincian.totalBiaya) : null;
    const melebihi = rincian ? rincian.rows.filter((r) => r.qty > r.kuota).length : 0;

    const handleExcel = () => rincian && exportRincianExcel(mode, rincian, rows);
    const handlePdf = () => {
        const win = openPrintWindow();
        if (win && rincian) printRincianPdf(win, mode, rincian, rows);
    };

    const info: [string, React.ReactNode][] = rincian
        ? mode === 'biaya'
            ? [
                ['Client', rincian.client],
                ['Anggaran', rincian.anggaran === null ? '-' : formatRupiah(rincian.anggaran)],
                ['Realisasi', formatRupiah(rincian.totalBiaya)],
                ['Sisa Anggaran', sisa === null ? '-' : <span key="s" className={sisa < 0 ? 'text-red-600' : ''}>{formatRupiah(sisa)}</span>],
                ['Status', status === null ? '-' : <span key="st" className={status === 'Rugi' ? 'text-red-600' : 'text-green-700'}>{status}</span>],
            ]
            : [
                ['Client', rincian.client],
                ['Material terpakai', `${rincian.rows.filter((r) => r.qty > 0).length} dari ${rincian.rows.length}`],
                ['Melebihi kuota', <span key="m" className={melebihi > 0 ? 'text-red-600' : ''}>{melebihi} material</span>],
            ]
        : [];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
                <ArrowLeft className="w-4 h-4" /> Kembali ke daftar
            </Link>

            <p role="note" className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg">{SUMBER_DATA_NOTICE}</p>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                    <div className="w-full lg:w-96">
                        <label className="block text-xs text-gray-600 mb-1">
                            Pilih Item Barang
                        </label>

                        <SearchableSelect
                            value={produkDipilih}
                            onChange={setProdukDipilih}
                            options={produkOptions}
                            placeholder="Pilih Item Barang"
                            emptyText="Barang tidak ditemukan"
                            aria-label="Pilih Item Barang"
                            className={selectClass}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                            <input type="checkbox" checked={hanyaTerpakai} onChange={(e) => setHanyaTerpakai(e.target.checked)} className="w-4 h-4 accent-[#FF8A00]" />
                            Hanya yang terpakai
                        </label>
                        <ExportExcellButton onClick={handleExcel} disabled={memuat || !rincian} />
                        <PrintPdfButton onClick={handlePdf} disabled={memuat || !rincian} />
                    </div>
                </div>

                {rincian && (
                    <dl className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-3 px-5 py-4 border-b border-gray-100 text-sm">
                        {info.map(([k, v]) => (
                            <div key={k} className="flex flex-col">
                                <dt className="text-gray-500">{k}</dt>
                                <dd className="font-semibold text-gray-900">{v}</dd>
                            </div>
                        ))}
                    </dl>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
                            <tr>
                                <th className={`${th} w-14`}>No</th>
                                <th className={th}>Kode Barang</th>
                                <th className={th}>{mode === 'biaya' ? 'Nama Barang' : 'Nama Bahan'}</th>
                                <th className={th}>Satuan</th>
                                {mode === 'biaya' ? (
                                    <>
                                        <th className={`${th} text-right`}>Harga Satuan</th>
                                        <th className={`${th} text-right`}>Jumlah</th>
                                        <th className={`${th} text-right`}>Biaya</th>
                                    </>
                                ) : (
                                    <>
                                        <th className={`${th} text-right`}>Kuota</th>
                                        <th className={`${th} text-right`}>Terpakai</th>
                                        <th className={`${th} text-right`}>Sisa Kuota</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {(memuat || galat || rows.length === 0) && (
                                <tr>
                                    <td colSpan={7} className={`px-6 py-10 text-center ${galat ? 'text-red-500' : 'text-gray-400'} ${!memuat && !galat ? 'italic' : ''}`}>
                                        {memuat ? 'Memuat data...' : galat || 'Tidak ada barang untuk SPK ini.'}
                                    </td>
                                </tr>
                            )}
                            {!memuat && !galat && rows.map((r, i) => (
                                <tr key={`${r.kode}-${i}`} className="hover:bg-[#FF8A00]/5 transition-colors">
                                    <td className={`${th} text-gray-500`}>{i + 1}</td>
                                    <td className={`${th} font-mono text-xs text-gray-600`}>{r.kode}</td>
                                    <td className={`${th} font-medium text-gray-900`}>{r.nama}</td>
                                    <td className={`${th} text-gray-600`}>{r.satuan}</td>
                                    {mode === 'biaya' ? (
                                        <>
                                            <td className={`${th} text-right tabular-nums`}>{formatRupiah(r.harga)}</td>
                                            <td className={`${th} text-right tabular-nums`}>{r.qty.toLocaleString('id-ID')}</td>
                                            <td className={`${th} text-right tabular-nums font-semibold text-gray-900`}>{formatRupiah(r.biaya)}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td className={`${th} text-right tabular-nums`}>{r.kuota.toLocaleString('id-ID')}</td>
                                            <td className={`${th} text-right tabular-nums font-semibold`}>{r.qty.toLocaleString('id-ID')}</td>
                                            <td className={`${th} text-right tabular-nums ${r.kuota - r.qty < 0 ? 'text-red-600 font-semibold' : ''}`}>{(r.kuota - r.qty).toLocaleString('id-ID')}</td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                        {mode === 'biaya' && !memuat && !galat && rincian && rows.length > 0 && (
                            <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold text-gray-900">
                                <tr>
                                    <td colSpan={6} className={th}>Total biaya</td>
                                    <td className={`${th} text-right tabular-nums`}>{formatRupiah(rincian.totalBiaya)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}