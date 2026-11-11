"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { formatRupiah } from '@/domains/ppic/data/dokubah';
import {
    loadAllItems, loadItemSpk, loadRincianPerItem, loadRincianSpk, realisasiSpkPath, statusRealisasi,
    type RincianRow,
} from '@/domains/inventory/components/RealisasiSPK';
import { exportRincianExcel, openPrintWindow, printRincianPdf } from '@/shared/components/ExportRealisasi';
import { useApiData } from '@/shared/lib/use-api-data';
import SearchableSelect from '@/shared/components/SearchableSelect';
import { ExportExcellButton, PrintPdfButton } from '@/shared/components/Tombol';

const SEMUA = '__semua__';
const SUMBER_DATA_NOTICE =
    'Total SPK dihitung dari dokubah, sedangkan biaya per item dihitung dari transaksi barang keluar. Angka keduanya bisa berbeda.';
const th = 'px-4 py-3';
const selectClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white ' +
    'focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors';

type Mode = 'biaya' | 'material';

// Route: /dashboard/gudang/laporan/realisasi-spk/[id], id = ID dokubah dari daftar.
// key={id} membuat ulang komponen saat pindah SPK, sehingga filter mulai dari awal.
export default function DetailRealisasiSPKPage() {
    const { id: rawId } = useParams<{ id: string }>();
    const noSpk = decodeURIComponent(rawId ?? '');
    return <RincianSpkDetail key={noSpk} noSpk={noSpk} mode="biaya" backHref={realisasiSpkPath} />;
}

export function RincianSpkDetail({ noSpk, mode, backHref }: {
    noSpk: string;
    mode: Mode;
    backHref: string;
}) {
    const [hanyaTerpakai, setHanyaTerpakai] = useState(true);
    const [itemDipilih, setItemDipilih] = useState(SEMUA);

    // Harga barang hanya dibutuhkan untuk rincian biaya
    const { data: items, loading: loadingItems, error: errItems } = useApiData(
        () => (mode === 'biaya' ? loadAllItems() : Promise.resolve([])),
        `rincian-items|${mode}`,
        'Gagal memuat harga barang.',
    );

    const { data: rincian, loading, error } = useApiData(
        () =>
            items
                ? loadRincianSpk(noSpk, items)
                : Promise.resolve(null),
        `rincian|${noSpk}|${items ? 'ok' : 'tunggu'}`,
        'Gagal memuat rincian SPK.',
    );

    // Pengambilan per item, dari transaksi barang keluar SPK ini
    const { data: perItem, loading: loadingPerItem } = useApiData(
        () =>
            mode === 'biaya' && items
                ? loadRincianPerItem(noSpk, items)
                : Promise.resolve(null),
        `per-item|${noSpk}|${items ? 'ok' : 'tunggu'}|${mode}`,
        'Gagal memuat pengambilan per item.',
    );

    const { data: daftarItem } = useApiData(
        () =>
            mode === 'biaya'
                ? loadItemSpk(noSpk)
                : Promise.resolve([]),
        `produk-spk|${noSpk}|${mode}`,
        'Gagal memuat daftar item SPK.',
    );

    const opsiItem = useMemo(() => {
        const mapItem = new Map<string, string>();

        (daftarItem ?? []).forEach((item) => {
            const raw = item.name?.trim();
            if (raw) {
                mapItem.set(raw.toLowerCase(), raw);
            }
        });

        if (perItem) {
            for (const key of perItem.keys()) {
                const raw = key?.trim();
                if (raw && !mapItem.has(raw.toLowerCase())) {
                    mapItem.set(raw.toLowerCase(), raw);
                }
            }
        }

        return [
            { value: SEMUA, label: 'Semua item' },
            ...Array.from(mapItem.values())
                .map((label) => ({
                    value: label,
                    label,
                }))
                .sort((a, b) => a.label.localeCompare(b.label)),
        ];
    }, [daftarItem, perItem]);

    const sumberBaris: RincianRow[] = useMemo(() => {
        if (mode !== 'biaya' || itemDipilih === SEMUA) {
            return rincian?.rows ?? [];
        }
        if (!perItem) return [];

        const target = itemDipilih.trim().toLowerCase();
        const direct = perItem.get(target);
        if (direct) return direct;

        // Exact match case-insensitive
        for (const [k, v] of perItem.entries()) {
            if (k?.trim().toLowerCase() === target) {
                return v;
            }
        }

        // Partial match jika nama di tracking sedikit berbeda dengan transaksi barang keluar
        for (const [k, v] of perItem.entries()) {
            const keyNorm = k?.trim().toLowerCase();
            if (keyNorm && (keyNorm.includes(target) || target.includes(keyNorm))) {
                return v;
            }
        }

        return [];
    }, [mode, itemDipilih, perItem, rincian]);

    const rows = useMemo(
        () => sumberBaris.filter((r) => !hanyaTerpakai || r.qty > 0),
        [sumberBaris, hanyaTerpakai],
    );
    const totalTampil = rows.reduce((s, r) => s + r.biaya, 0);
    const labelItem = itemDipilih === SEMUA ? undefined : itemDipilih;

    const memuat = loadingItems || loading || loadingPerItem || (!rincian && !error && !errItems);
    const galat = errItems || error;

    // Anggaran bisa null; sisa dan status baru dihitung kalau anggaran sudah ada
    const sisa = rincian && rincian.anggaran !== null ? rincian.anggaran - rincian.totalBiaya : null;
    const status = rincian && rincian.anggaran !== null ? statusRealisasi(rincian.anggaran, rincian.totalBiaya) : null;
    const melebihi = rincian ? rincian.rows.filter((r) => r.qty > r.kuota).length : 0;

    const handleExcel = () =>
        rincian && exportRincianExcel(mode, { ...rincian, totalBiaya: totalTampil }, rows, labelItem);
    const handlePdf = () => {
        const win = openPrintWindow();
        if (win && rincian) printRincianPdf(win, mode, { ...rincian, totalBiaya: totalTampil }, rows, labelItem);
    };

    const info: [string, React.ReactNode][] = rincian
        ? mode === 'biaya'
            ? [
                ['No. SPK', rincian.noSpk],
                ['Client', rincian.client],
                ['Anggaran', rincian.anggaran === null ? '-' : formatRupiah(rincian.anggaran)],
                ['Realisasi', formatRupiah(rincian.totalBiaya)],
                ['Sisa Anggaran', sisa === null ? '-' : <span key="s" className={sisa < 0 ? 'text-red-600' : ''}>{formatRupiah(sisa)}</span>],
                ['Status', status === null ? '-' : <span key="st" className={status === 'Rugi' ? 'text-red-600' : 'text-green-700'}>{status}</span>],
            ]
            : [
                ['No. SPK', rincian.noSpk],
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

            {mode === 'biaya' && (
                <p role="note" className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg">
                    {SUMBER_DATA_NOTICE}
                </p>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                    {mode === 'biaya' && (
                        <div className="w-full lg:w-96">
                            <label className="block text-xs text-gray-600 mb-1">Pilih Item Barang</label>
                            <SearchableSelect
                                value={itemDipilih}
                                onChange={(v) => setItemDipilih(v || SEMUA)}
                                options={opsiItem}
                                placeholder="Semua item"
                                emptyText="Item tidak ditemukan"
                                aria-label="Pilih Item Barang"
                                className={selectClass}
                            />
                        </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 ml-auto">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={hanyaTerpakai}
                                onChange={(e) => setHanyaTerpakai(e.target.checked)}
                                className="w-4 h-4 accent-[#FF8A00]"
                            />
                            Hanya yang terpakai
                        </label>
                        <ExportExcellButton onClick={handleExcel} disabled={memuat || !rincian} />
                        <PrintPdfButton onClick={handlePdf} disabled={memuat || !rincian} />
                    </div>
                </div>

                {rincian && (
                    <dl className="grid grid-cols-2 md:grid-cols-6 gap-x-8 gap-y-3 px-5 py-4 border-b border-gray-100 text-sm">
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
                                            <td className={`${th} text-right tabular-nums ${r.kuota - r.qty < 0 ? 'text-red-600 font-semibold' : ''}`}>
                                                {(r.kuota - r.qty).toLocaleString('id-ID')}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                        {mode === 'biaya' && !memuat && !galat && rows.length > 0 && (
                            <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold text-gray-900">
                                <tr>
                                    <td colSpan={6} className={th}>
                                        Total biaya{labelItem ? ` · ${labelItem}` : ''}
                                    </td>
                                    <td className={`${th} text-right tabular-nums`}>{formatRupiah(totalTampil)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}