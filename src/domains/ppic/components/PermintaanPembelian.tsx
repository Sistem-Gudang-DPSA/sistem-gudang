"use client";

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { formatAngka, formatTanggal } from '@/domains/ppic/data/dokubah';
import { getPermintaanList, rekap_pembelian_path, setStatusPermintaan, type StatusPermintaan } from '@/domains/ppic/data/pembelian';

const cellClass = 'px-4 py-3 border-b border-r border-gray-300';
const readOnlyFieldClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-gray-50 cursor-default focus:outline-none';
const orangeButtonClass = 'min-w-24 px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm text-center';
const dividerClass = 'border-t border-gray-400 my-6';

function Field({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-36 shrink-0 text-sm font-medium text-gray-800">{label}</label>
      <span className="text-gray-800">:</span>
      <input id={id} type="text" readOnly value={value} className={readOnlyFieldClass} />
    </div>
  );
}

function Lampiran({ label, file }: { label: string; file?: string }) {
  return (
    <div className="flex items-center gap-6">
      <span className="w-32 shrink-0 text-sm font-bold text-gray-900">{label}</span>
      {file ? (
        <span className="px-4 py-1 rounded-full bg-slate-200 text-sm text-gray-800">{file}</span>
      ) : (
        <span className="text-sm text-gray-400 italic">Tidak ada lampiran</span>
      )}
    </div>
  );
}

// `actions` mengganti tombol Revisi/Setuju (dipakai halaman purchasing)
export default function PermintaanPembelianPPIC({ backPath = rekap_pembelian_path, actions }: { backPath?: string; actions?: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const permintaan = getPermintaanList().find((item) => String(item.id) === id);

  const header = (
    <div className="flex items-center gap-3 mb-6">
      <Link href={backPath} aria-label="Kembali ke Rekap Pembelian" className="text-gray-800 hover:opacity-70 transition-opacity">
        <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
      </Link>
      <h1 className="text-[18px] font-extrabold text-black tracking-wide">Permintaan Pembelian Gudang</h1>
    </div>
  );

  if (!permintaan) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        {header}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-10 text-center text-gray-400 italic">
          Permintaan pembelian tidak ditemukan.
        </div>
      </div>
    );
  }

  const handleKeputusan = (status: StatusPermintaan) => {
    setStatusPermintaan(permintaan.id, status);
    router.replace(backPath);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {header}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-bold text-gray-900 text-center mb-6">Permintaan Pembelian</h2>

        {/* Info pengaju */}
        <div className="flex flex-col gap-2 max-w-sm">
          <Field id="permintaan-bagian" label="Bagian/Sub bagian" value={permintaan.bagian} />
          <Field id="permintaan-nama" label="Nama" value={permintaan.nama} />
          <Field id="permintaan-jabatan" label="Jabatan" value={permintaan.jabatan} />
          <Field id="permintaan-tanggal" label="Tanggal Pengajuan" value={formatTanggal(permintaan.tanggal)} />
        </div>

        <hr className={dividerClass} />

        {/* Detail barang */}
        <h2 className="text-base font-bold text-gray-900 mb-4">Detail Barang</h2>
        <div className="overflow-x-auto border-t border-l border-gray-300 rounded-sm max-w-4xl">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-gray-100 text-gray-800 font-semibold text-xs">
              <tr>
                <th scope="col" className={`${cellClass} w-14`}>No.</th>
                <th scope="col" className={`${cellClass} text-center`}>Nama Barang</th>
                <th scope="col" className={`${cellClass} text-center`}>QTY</th>
                <th scope="col" className={`${cellClass} text-center`}>Satuan</th>
                <th scope="col" className={`${cellClass} text-center`}>Proyek</th>
                <th scope="col" className={`${cellClass} text-center`}>No SPK</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              {permintaan.barang.map((b, index) => (
                <tr key={`${b.namaBarang}-${index}`}>
                  <td className={cellClass}>{index + 1}.</td>
                  <td className={`${cellClass} font-semibold text-gray-900`}>{b.namaBarang}</td>
                  <td className={`${cellClass} text-center`}>{formatAngka(b.qty)}</td>
                  <td className={`${cellClass} text-center`}>{b.satuan}</td>
                  <td className={`${cellClass} text-center`}>{b.proyek}</td>
                  <td className={`${cellClass} text-center`}>{b.noSpk}</td>
                </tr>
              ))}
              {permintaan.barang.length === 0 && (
                <tr>
                  <td colSpan={6} className={`${cellClass} px-6 py-10 text-center text-gray-400 italic`}>
                    Belum ada barang pada permintaan ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <hr className={dividerClass} />

        {/* Lampiran */}
        <h2 className="text-base font-bold text-gray-900 mb-6">Lampiran</h2>
        <div className="flex flex-col gap-4 pb-10">
          <Lampiran label="Rekap Dokubah" file={permintaan.lampiranRekapDokubah} />
          <Lampiran label="Kartu Stok" file={permintaan.lampiranKartuStok} />
        </div>
      </div>

      {/* Keputusan hanya bisa diberikan selama permintaan belum diproses */}
      <div className="flex items-center justify-end gap-4 mt-8">
        {actions ?? (permintaan.status === 'Belum Disetujui' ? (
          <>
            <button type="button" onClick={() => handleKeputusan('Perlu Revisi')} className={orangeButtonClass}>Revisi</button>
            <button type="button" onClick={() => handleKeputusan('Disetujui')} className={orangeButtonClass}>Setuju</button>
          </>
        ) : (
          <p className="text-sm text-gray-600">Status permintaan: <span className="font-bold text-gray-900">{permintaan.status}</span></p>
        ))}
      </div>
    </div>
  );
}
