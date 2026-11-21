"use client";

import Link from 'next/link';
import { formatAngka, formatTanggal } from '@/domains/ppic/data/dokubah';
import type { PermintaanPembelian } from '@/domains/ppic/data/pembelian';
import { useCan } from '@/domains/auth/user-context';
import { usePoPermintaan } from '../use-po-permintaan';
import { detailPoPath } from '../data/pembelian';

const cellClass = 'px-4 py-3 border-b border-r border-gray-300';

const PROGRES_LABEL: Record<string, string> = {
  NOT_PURCHASED: 'Belum dipesan',
  PARTIALLY_PURCHASED: 'Sebagian dipesan',
  PURCHASED: 'Sudah dipesan semua',
};

// Daftar PO milik satu permintaan pembelian, tampil di detail permintaan Purchasing.
export default function DaftarPoPermintaan({ permintaan }: { permintaan: PermintaanPembelian }) {
  const canView = useCan('purchase-order.view');
  const canCreate = useCan('purchase-order.create');
  return canView || canCreate ? <Isi permintaan={permintaan} /> : null;
}

function Isi({ permintaan }: { permintaan: PermintaanPembelian }) {
  const canView = useCan('purchase-order.view');
  const { pos, loading, error } = usePoPermintaan(permintaan.id);
  const progres = permintaan.purchaseStatus;

  return (
    <>
      <hr className="border-t border-gray-400 my-6" />
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-base font-bold text-gray-900">Purchase Order</h2>
        {progres && (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${progres === 'PURCHASED' ? 'bg-green-100 text-green-700' : progres === 'PARTIALLY_PURCHASED' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
            {PROGRES_LABEL[progres]}
          </span>
        )}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600">{error}</p>
      ) : loading ? (
        <p className="text-sm text-gray-500">Memuat daftar PO...</p>
      ) : pos.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Belum ada PO untuk permintaan ini.</p>
      ) : (
        <div className="overflow-x-auto border-t border-l border-gray-300 rounded-sm max-w-4xl">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-100 text-gray-800 font-semibold text-xs">
              <tr>
                <th scope="col" className={cellClass}>Nomor PO</th>
                <th scope="col" className={cellClass}>Tanggal</th>
                <th scope="col" className={cellClass}>Supplier</th>
                <th scope="col" className={`${cellClass} text-right`}>Grand Total</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              {pos.map((po) => (
                <tr key={po.id}>
                  <td className={`${cellClass} font-semibold text-gray-900`}>
                    {canView ? <Link href={detailPoPath(po.id)} className="text-orange-600 hover:underline">{po.nomorPo}</Link> : po.nomorPo}
                  </td>
                  <td className={cellClass}>{formatTanggal(po.tanggalPo?.slice(0, 10) ?? '')}</td>
                  <td className={cellClass}>{po.supplierName}</td>
                  <td className={`${cellClass} text-right`}>Rp. {formatAngka(po.grandTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
