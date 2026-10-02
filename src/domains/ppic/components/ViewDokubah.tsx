"use client";

import React from 'react';
import { useCan } from '@/domains/auth/user-context';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import {
  dokubah_path,
  editMaterialPath,
  escapeHtml,
  formatAngka,
  formatRupiah,
  formatTanggal,
  viewDokubahPath,
} from '@/domains/ppic/data/dokubah';
import { getDokubah, listDokubah } from '@/domains/ppic/api';
import { useApiData } from '@/shared/lib/use-api-data';

const cellClass = 'px-4 py-3 border-b border-r border-gray-200';
const fieldClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors';
const readOnlyFieldClass = `${fieldClass} bg-gray-50 cursor-default`;
const cardClass = 'bg-white rounded-xl border border-gray-100 shadow-md p-6 min-h-32';

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-36 shrink-0 text-sm font-medium text-gray-800">{label}</label>
      <span className="text-gray-800">:</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export default function ViewDokubahPPIC() {
  const canUpdate = useCan('dokubah.update');
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  // ponytail: the SPK picker lists the first 100 dokubah only
  const { data: listResult } = useApiData(() => listDokubah({ pageSize: 100 }), 'list', 'Gagal memuat daftar Dokubah.');
  const list = listResult?.rows ?? [];
  const { data: dokubah, loading, error } = useApiData(() => getDokubah(Number(id)), id, 'Gagal memuat Dokubah.');

  const header = (
    <div className="flex items-center gap-3 mb-6">
      <Link href={dokubah_path} aria-label="Kembali ke daftar Dokubah" className="text-gray-800 hover:opacity-70 transition-opacity">
        <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
      </Link>
      <h1 className="text-[18px] font-extrabold text-black tracking-wide">View Dokubah</h1>
    </div>
  );

  if (!dokubah) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
        {header}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-10 text-center text-gray-400 italic">
          {loading ? 'Memuat data...' : error || 'Dokubah tidak ditemukan.'}
        </div>
      </div>
    );
  }

  const totalHpp = dokubah.bahan.reduce((sum, b) => sum + b.realisasi * b.hargaSatuan, 0);
  const margin = dokubah.totalAnggaran - totalHpp;

  const handlePilihSpk = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.replace(viewDokubahPath(e.target.value));
  };

  // Buka jendela berisi dokubah saja lalu panggil dialog print (pilih "Save as PDF")
  const handleCetak = () => {
    const win = window.open('', '_blank');
    if (!win) {
      alert('Pop-up diblokir browser. Izinkan pop-up untuk mencetak Dokubah.');
      return;
    }
    const bodyRows = dokubah.bahan.map((b, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td>${escapeHtml(b.kodeBarang)}</td>
        <td>${escapeHtml(b.namaBahan)}</td>
        <td class="right">${formatAngka(b.kuota)} ${escapeHtml(b.satuan)}</td>
        <td class="right">${formatAngka(b.realisasi)} ${escapeHtml(b.satuan)}</td>
        <td class="right">${formatAngka(b.kuota - b.realisasi)} ${escapeHtml(b.satuan)}</td>
      </tr>`).join('');
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>Dokubah ${escapeHtml(dokubah.noSpk)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 18px; margin: 0 0 16px; }
            table { border-collapse: collapse; font-size: 12px; }
            .info { margin-bottom: 16px; }
            .info td { padding: 2px 12px 2px 0; }
            .data { width: 100%; }
            .data th, .data td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
            .data th { background: #eee; }
            .data .center { text-align: center; }
            .data .right { text-align: right; }
          </style>
        </head>
        <body>
          <h1>Dokubah ${escapeHtml(dokubah.noSpk)}</h1>
          <table class="info">
            <tr><td>No. SPK / Proyek</td><td>: ${escapeHtml(dokubah.noSpk)}</td></tr>
            <tr><td>Nama Client</td><td>: ${escapeHtml(dokubah.client)}</td></tr>
            <tr><td>Status Dokubah</td><td>: ${dokubah.status}</td></tr>
            <tr><td>Tanggal Mulai</td><td>: ${formatTanggal(dokubah.tanggalMulai)}</td></tr>
            <tr><td>Tanggal Selesai</td><td>: ${formatTanggal(dokubah.tanggalSelesai)}</td></tr>
            <tr><td>Total Anggaran SPK</td><td>: ${formatRupiah(dokubah.totalAnggaran)}</td></tr>
            <tr><td>Total Biaya Aktual (HPP)</td><td>: ${formatRupiah(totalHpp)}</td></tr>
            <tr><td>Margin / Sisa Anggaran</td><td>: ${formatRupiah(margin)}</td></tr>
          </table>
          <table class="data">
            <thead>
              <tr><th class="center">No.</th><th>Kode Barang</th><th>Nama &amp; Spesifikasi Bahan</th><th>Kuota Alokasi (Dokubah)</th><th>Realisasi Pengambilan</th><th>Sisa Jatah Kuota</th></tr>
            </thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </body>
      </html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {header}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Info SPK */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-3 max-w-4xl mb-8">
          <Field id="view-dokubah-spk" label="Pilih SPK / Proyek">
            <select id="view-dokubah-spk" value={dokubah.id} onChange={handlePilihSpk} className={`${fieldClass} bg-white cursor-pointer`}>
              {list.map((item) => (
                <option key={item.id} value={item.id}>{item.noSpk}</option>
              ))}
            </select>
          </Field>
          <div className="hidden lg:block" />

          <Field id="view-dokubah-client" label="Nama Client">
            <input id="view-dokubah-client" type="text" readOnly value={dokubah.client} className={readOnlyFieldClass} />
          </Field>
          <Field id="view-dokubah-mulai" label="Tanggal Mulai">
            <input id="view-dokubah-mulai" type="text" readOnly value={formatTanggal(dokubah.tanggalMulai)} className={readOnlyFieldClass} />
          </Field>

          <Field id="view-dokubah-status" label="Status Dokubah">
            <input id="view-dokubah-status" type="text" readOnly value={dokubah.status} className={readOnlyFieldClass} />
          </Field>
          <Field id="view-dokubah-selesai" label="Tanggal Selesai">
            <input id="view-dokubah-selesai" type="text" readOnly value={formatTanggal(dokubah.tanggalSelesai)} className={readOnlyFieldClass} />
          </Field>
        </div>

        {/* Ringkasan anggaran */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Total Anggaran SPK (Rp)</h2>
            <p className="text-base font-bold text-gray-900">{formatRupiah(dokubah.totalAnggaran)}</p>
          </div>
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Total Biaya Aktual (HPP)</h2>
            <p className="text-base font-bold text-gray-900">{formatRupiah(totalHpp)}</p>
          </div>
          <div className={cardClass}>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Margin / Sisa Anggaran (Rp)</h2>
            <p className={`text-base font-bold ${margin < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatRupiah(margin)}</p>
          </div>
        </div>

        {/* Tabel bahan */}
        <div className="overflow-x-auto border-t border-l border-gray-200">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-gray-100 text-gray-700 font-semibold">
              <tr>
                <th scope="col" className={`${cellClass} w-14 text-center`}>No.</th>
                <th scope="col" className={cellClass}>Kode Barang</th>
                <th scope="col" className={cellClass}>Nama &amp; Spesifikasi Bahan</th>
                <th scope="col" className={cellClass}>Kuota Alokasi (Dokubah)</th>
                <th scope="col" className={cellClass}>Realisasi Pengambilan</th>
                <th scope="col" className={cellClass}>Sisa Jatah Kuota</th>
                <th scope="col" className={`${cellClass} text-center`}>Aksi</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              {dokubah.bahan.map((b, index) => {
                const sisa = b.kuota - b.realisasi;
                return (
                  <tr key={b.kodeBarang} className="hover:bg-orange-50/20 transition-colors">
                    <td className={`${cellClass} text-center text-gray-700`}>{index + 1}</td>
                    <td className={`${cellClass} font-semibold text-gray-900`}>{b.kodeBarang}</td>
                    <td className={cellClass}>{b.namaBahan}</td>
                    <td className={cellClass}>{formatAngka(b.kuota)} {b.satuan}</td>
                    <td className={cellClass}>{formatAngka(b.realisasi)} {b.satuan}</td>
                    <td className={`${cellClass} ${sisa < 0 ? 'text-red-600 font-semibold' : ''}`}>{formatAngka(sisa)} {b.satuan}</td>
                    <td className={`${cellClass} text-center`}>
                      {/* The API answers 409 when replacing the materials of an APPROVED dokubah */}
                      {canUpdate && dokubah.status !== 'Approved' && (
                        <Link
                          href={editMaterialPath(dokubah.id)}
                          className="inline-block px-4 py-1.5 bg-[#FF8A00] text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                        >
                          Edit
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
              {dokubah.bahan.length === 0 && (
                <tr>
                  <td colSpan={7} className={`${cellClass} px-6 py-10 text-center text-gray-400 italic`}>
                    Belum ada bahan pada Dokubah ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-8">
          <button
            onClick={handleCetak}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokubah</span>
          </button>
        </div>
      </div>
    </div>
  );
}
