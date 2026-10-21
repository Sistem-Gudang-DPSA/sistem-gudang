"use client";

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { formatAngka, formatRupiah, gudang_rekap_dokubah_path } from '@/domains/ppic/data/dokubah';
import { getDokubah } from '@/domains/ppic/api';
import { useApiData } from '@/shared/lib/use-api-data';
import StatusBadge, { type BadgeTone } from '@/shared/components/StatusBadge';

type StatusMaterial = 'Aman' | 'Habis' | 'Overbudget';

const cellClass = 'px-4 py-3 border-b border-r border-gray-300';
const readOnlyFieldClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-gray-50 placeholder:text-gray-400 cursor-default focus:outline-none';
const orangeButtonClass = 'min-w-24 px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm text-center';

const statusTone: Record<StatusMaterial, BadgeTone> = {
  Aman: 'green',
  Habis: 'amber',
  Overbudget: 'red',
};

// Sisa kuota minus berarti pengambilan sudah melebihi kuota dokubah
const getStatusMaterial = (sisaKuota: number): StatusMaterial => {
  if (sisaKuota < 0) return 'Overbudget';
  return sisaKuota === 0 ? 'Habis' : 'Aman';
};

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-48 shrink-0 text-sm font-medium text-gray-800">{label}</label>
      <span className="text-gray-800">:</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export default function DetailRekapDokubahPPIC() {
  const { id } = useParams<{ id: string }>();
  const { data: dokubah, loading, error } = useApiData(() => getDokubah(Number(id)), id, 'Gagal memuat Dokubah.');

  const header = (
    <div className="flex items-center gap-3 mb-6">
      <Link href={gudang_rekap_dokubah_path} aria-label="Kembali ke Rekap Dokubah" className="text-gray-800 hover:opacity-70 transition-opacity">
        <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
      </Link>
      <h1 className="text-[18px] font-extrabold text-black tracking-wide">Detail Rekap Dokubah</h1>
    </div>
  );

  if (!dokubah) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        {header}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-10 text-center text-gray-400 italic">
          {loading ? 'Memuat data...' : error || 'Rekap Dokubah tidak ditemukan.'}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {header}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Info SPK */}
        <div className="flex flex-col gap-3 max-w-lg mb-8">
          <Field id="detail-rekap-spk" label="Rincian Realisasi Material">
            <input
              id="detail-rekap-spk"
              type="text"
              readOnly
              value={`${dokubah.noSpk} / ${dokubah.client}`}
              placeholder="No. SPK / Nama Proyek"
              className={readOnlyFieldClass}
            />
          </Field>
          <Field id="detail-rekap-pj" label="Penanggung Jawab">
            <input id="detail-rekap-pj" type="text" readOnly value={dokubah.penanggungJawab ?? '-'} className={readOnlyFieldClass} />
          </Field>
        </div>

        {/* Tabel realisasi material */}
        <div className="overflow-x-auto border-t border-l border-gray-300 rounded-sm">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-gray-100 text-gray-800 font-semibold text-xs">
              <tr>
                <th scope="col" className={`${cellClass} w-14`}>No.</th>
                <th scope="col" className={cellClass}>Kode Material</th>
                <th scope="col" className={cellClass}>Nama Item / Bahan</th>
                <th scope="col" className={cellClass}>Kuota Dokubah Awal</th>
                <th scope="col" className={cellClass}>Realisasi Pengambilan</th>
                <th scope="col" className={cellClass}>Sisa Anggaran</th>
                <th scope="col" className={cellClass}>Status</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              {dokubah.bahan.map((b, index) => {
                const sisaKuota = b.kuota - b.realisasi;
                const status = getStatusMaterial(sisaKuota);
                return (
                  <tr key={b.kodeBarang}>
                    <td className={cellClass}>{index + 1}</td>
                    <td className={`${cellClass} font-semibold text-gray-900`}>{b.kodeBarang}</td>
                    <td className={cellClass}>{b.namaBahan}</td>
                    <td className={cellClass}>{formatAngka(b.kuota)} {b.satuan}</td>
                    <td className={cellClass}>{formatAngka(b.realisasi)} {b.satuan}</td>
                    <td className={`${cellClass} ${sisaKuota < 0 ? 'text-red-600 font-semibold' : ''}`}>{formatRupiah(sisaKuota * b.hargaSatuan)}</td>
                    <td className={cellClass}>
                      <StatusBadge tone={statusTone[status]}>{status}</StatusBadge>
                    </td>
                  </tr>
                );
              })}
              {dokubah.bahan.length === 0 && (
                <tr>
                  <td colSpan={7} className={`${cellClass} px-6 py-10 text-center text-gray-400 italic`}>
                    Belum ada material pada Dokubah ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-10">
          <Link href={gudang_rekap_dokubah_path} className={orangeButtonClass}>Kembali</Link>
        </div>
      </div>
    </div>
  );
}
