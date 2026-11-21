"use client";

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useCan } from '@/domains/auth/user-context';
import { formatAngka, formatRupiah, formatTanggal } from '@/domains/ppic/data/dokubah';
import { getPurchaseOrder } from '@/domains/purchasing/api';
import { lihatPermintaanPath, PEMESAN, po_barang_path } from '@/domains/purchasing/data/pembelian';
import StatusBadge from '@/shared/components/StatusBadge';
import { useApiData } from '@/shared/lib/use-api-data';

const cellClass = 'px-3 py-2 border-b border-r border-gray-300';
const infoLabelClass = `${cellClass} w-40 text-xs text-gray-800 align-top`;
const infoValueClass = `${cellClass} text-xs text-gray-800 whitespace-normal`;
const sectionTitleClass = 'text-xs font-bold text-gray-900 uppercase mb-3';
const dividerClass = 'border-t border-gray-400 my-6';

export default function DetailPOBarang() {
  const { id } = useParams<{ id: string }>();
  const canView = useCan('purchase-order.view');
  const canReview = useCan('purchase-request.approve');
  const { data: po, loading, error } = useApiData(
    () => canView ? getPurchaseOrder(id) : Promise.resolve(null),
    `purchase-order-detail|${id}|${canView}`,
    'Gagal memuat detail PO.',
  );

  return (
    <div className="pb-10">
      <div className="flex items-center gap-3 mb-6">
        <Link href={po_barang_path} aria-label="Kembali ke PO Barang" className="text-gray-800 hover:opacity-70"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-[18px] font-extrabold text-black">Detail PO Barang</h1>
      </div>
      {!canView ? (
        <p role="alert" className="py-10 text-center text-sm text-gray-500">Anda tidak memiliki izin untuk melihat PO Barang.</p>
      ) : loading ? (
        <p role="status" className="py-10 text-center text-sm text-gray-500">Memuat detail PO...</p>
      ) : error || !po ? (
        <p role="alert" className="py-10 text-center text-sm text-red-600">{error || 'PO tidak ditemukan.'}</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-900 text-center mb-6">Detail Pemesanan Pembelian</h2>
          <dl className="flex flex-wrap items-center gap-x-10 gap-y-4 text-sm text-gray-800">
            <div className="flex items-center gap-3"><dt className="font-medium">Nomor PO</dt><dd className="font-bold">{po.nomorPo}</dd></div>
            <div className="flex items-center gap-3"><dt className="font-medium">Tanggal PO</dt><dd className="border border-gray-300 rounded-lg px-3 py-2">{formatTanggal(po.tanggalPo)}</dd></div>
            <div className="flex items-center gap-3"><dt className="font-medium">Status</dt><dd><StatusBadge tone={po.status === 'CANCELLED' ? 'red' : 'green'}>{po.status}</StatusBadge></dd></div>
          </dl>
          {po.cancelReason && <p className="mt-4 text-sm text-red-600">Alasan Pembatalan: {po.cancelReason}</p>}
          <hr className={dividerClass} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-6">
            <section aria-labelledby="detail-po-supplier">
              <h3 id="detail-po-supplier" className={sectionTitleClass}>Tujuan Pemesanan (Supplier)</h3>
              <div className="overflow-x-auto border-t border-l border-gray-300 rounded-sm">
                <table aria-label="Data supplier PO" className="w-full text-left border-collapse">
                  <thead className="bg-gray-100"><tr><th scope="row" className={`${infoLabelClass} font-bold uppercase`}>Data Supplier</th><td className={`${infoValueClass} font-semibold`}>{po.supplierName}</td></tr></thead>
                  <tbody>
                    {[
                      ['Nama Perusahaan', po.supplierName],
                      ['Alamat / Telp', [po.supplierAddress, po.supplierPhone].filter(Boolean).join(' / ')],
                      ['NPWP', po.supplierNpwp || ''],
                      ['No A/C (Bank)', po.supplierBank || ''],
                      ['PIC / Telp', po.picSupplier],
                    ].map(([label, value]) => <tr key={label}><th scope="row" className={`${infoLabelClass} font-normal`}>{label}</th><td className={infoValueClass}>{value}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </section>
            <section aria-labelledby="detail-po-pemesan">
              <h3 id="detail-po-pemesan" className={sectionTitleClass}>Pemesan</h3>
              <div className="border-t border-l border-gray-300 rounded-sm">
                <table aria-label="Data pemesan PO" className="w-full text-left border-collapse">
                  <thead className="bg-gray-100"><tr><th colSpan={2} className={`${cellClass} text-xs font-bold text-gray-900 text-center`}>{PEMESAN.nama}</th></tr></thead>
                  <tbody>
                    {[
                      ['NPWP', PEMESAN.npwp],
                      ['Alamat Pengiriman', PEMESAN.alamatPengiriman],
                      ['Kebutuhan Proyek', po.kebutuhanProyek || ''],
                      ['PIC / Telp', PEMESAN.pic],
                    ].map(([label, value]) => <tr key={label}><th scope="row" className={`${infoLabelClass} font-normal`}>{label}</th><td className={infoValueClass}>{value}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          <hr className={dividerClass} />

          <h3 className="text-sm font-bold text-gray-900 mb-3">Daftar / Spesifikasi Barang yang Dipesan</h3>
          <div className="overflow-x-auto border-t border-l border-gray-300 mb-6">
            <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
              <thead className="bg-gray-100 text-gray-900"><tr>
                {['No', 'Kode Barang', 'Nama Item / Barang', 'Satuan', 'Jumlah', 'Harga/Sat', 'Diskon', 'Total Harga'].map((label) => <th key={label} scope="col" className={cellClass}>{label}</th>)}
              </tr></thead>
              <tbody className="text-gray-800">
                {po.barang.map((barang, index) => (
                  <tr key={index}>
                    <td className={cellClass}>{index + 1}</td>
                    <td className={cellClass}>{barang.kodeBarang}</td>
                    <td className={cellClass}>{barang.namaBarang}</td>
                    <td className={cellClass}>{barang.satuan}</td>
                    <td className={cellClass}>{formatAngka(barang.jumlah)}</td>
                    <td className={cellClass}>{formatRupiah(barang.hargaSatuan)}</td>
                    <td className={cellClass}>{formatRupiah(barang.diskon)}</td>
                    <td className={cellClass}>{formatRupiah(barang.jumlah * barang.hargaSatuan - barang.diskon)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="ml-auto max-w-md space-y-3 text-sm text-gray-800">
            {[
              ['Total Setelah Diskon', formatRupiah(po.subtotal)],
              ['DPP Nilai Lain', formatRupiah(po.dppLain)],
              [`PPN (${formatAngka(po.persenPpn)}%)`, formatRupiah(po.nilaiPpn)],
              ['Total Setelah PPN', formatRupiah(po.subtotal + po.nilaiPpn)],
              ['Jasa', formatRupiah(po.jasa)],
              ['Grand Total', formatRupiah(po.grandTotal)],
            ].map(([label, value]) => <div key={label} className={`flex items-center justify-between gap-4 ${label === 'Grand Total' ? 'border-t border-gray-400 pt-4 mt-6' : ''}`}><dt className="font-semibold uppercase text-xs">{label}</dt><dd className="w-40 sm:w-64 max-w-full shrink-0 border border-gray-300 rounded-lg px-3 py-2 text-right">{value}</dd></div>)}
          </dl>
          {canReview && po.approvalRequestId !== null && (
            <Link href={lihatPermintaanPath(po.approvalRequestId)} className="inline-block mt-6 text-sm font-semibold text-orange-600 hover:underline">Lihat Permintaan Pembelian Asal</Link>
          )}
        </div>
      )}
    </div>
  );
}
