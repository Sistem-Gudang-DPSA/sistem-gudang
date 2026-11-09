'use client';

import React from 'react';
import Link from 'next/link';
import { FileWarning, ClipboardList, ShoppingCart, Hourglass, FileText } from 'lucide-react';
import StatCard from '@/shared/components/StatCard';
import { useApiData } from '@/shared/lib/use-api-data';
import { useCan } from '@/domains/auth/user-context';
import { listApprovals, listDokubah, listPenawaran, listSpkInternal } from '@/domains/ppic/api';
import { STATUS_LABEL, lihatPermintaanPath } from '@/domains/ppic/data/pembelian';
import type { ApprovalStatus } from '@/domains/ppic/types';

const PEMBELIAN = '/dashboard/ppic/transaksi/permintaan-pembelian';

function Count({ label, fetcher, icon, tone, href, hint }: Omit<React.ComponentProps<typeof StatCard>, 'value' | 'error'> & { fetcher: () => Promise<{ total: number }> }) {
  const { data, error } = useApiData(fetcher, label);
  return <StatCard label={label} icon={icon} tone={tone} href={href} hint={hint} value={data?.total} error={error} />;
}

const approvals = (status: ApprovalStatus) => () => listApprovals({ type: 'purchase-request', status, pageSize: 1 });

function PermintaanTerbaru() {
  const { data, loading, error } = useApiData(() => listApprovals({ type: 'purchase-request', pageSize: 5 }), 'terbaru');
  const rows = data?.rows ?? [];
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-800">Permintaan Pembelian Terbaru</h2>
      </div>
      {error ? (
        <p role="alert" className="p-6 text-sm text-red-600">{error}</p>
      ) : loading ? (
        <p className="p-6 text-sm text-gray-500">Memuat...</p>
      ) : rows.length === 0 ? (
        <p className="p-6 text-sm text-gray-500">Belum ada permintaan pembelian.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-6 py-3 font-semibold">Tanggal</th>
                <th className="px-6 py-3 font-semibold">Ringkasan</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-3 text-gray-700">{(r.payload?.tanggalPengajuan ?? r.createdAt).slice(0, 10)}</td>
                  <td className="px-6 py-3 text-gray-700">{r.payload?.bagian ?? '-'} - {r.payload?.items?.length ?? 0} barang</td>
                  <td className="px-6 py-3"><span className="px-2.5 py-1 rounded-md bg-purple-100 text-purple-700 text-xs font-semibold">{STATUS_LABEL[r.status]}</span></td>
                  <td className="px-6 py-3"><Link href={lihatPermintaanPath(r.id)} className="text-purple-600 font-semibold hover:underline">Lihat</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function PPICDashboard() {
  const canDokubah = useCan('dokubah.view');
  const canSpk = useCan('spk-internal.view');
  const canPembelian = useCan('purchase-request.create');
  const canSph = useCan('penawaran-harga.view');

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Dashboard PPIC</h1>
        <p className="text-gray-500">Pantau dokumen perubahan, SPK internal, permintaan pembelian, dan penawaran harga.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {canDokubah && (
          <Count label="Dokubah Menunggu Persetujuan" icon={FileWarning} tone="purple" href="/dashboard/ppic/transaksi/dokubah"
            fetcher={() => listDokubah({ status: 'PENDING', pageSize: 1 })} />
        )}
        {canSpk && (
          <Count label="SPK Internal" icon={ClipboardList} tone="blue" href="/dashboard/ppic/transaksi/spk-mutasi-internal"
            fetcher={() => listSpkInternal({ pageSize: 1 })} />
        )}
        {canPembelian && (
          <>
            <Count label="Permintaan Pembelian Perlu Revisi" icon={ShoppingCart} tone="red" href={PEMBELIAN} hint="Perlu tindakan PPIC"
              fetcher={approvals('revision_requested')} />
            <Count label="Permintaan Pembelian Menunggu Purchasing" icon={Hourglass} tone="amber" href={PEMBELIAN}
              fetcher={approvals('pending')} />
          </>
        )}
        {canSph && (
          <Count label="Penawaran Harga Draft" icon={FileText} tone="teal" href="/dashboard/ppic/master/penawaran-harga"
            fetcher={() => listPenawaran({ status: 'DRAFT', pageSize: 1 })} />
        )}
      </div>

      {canPembelian && <PermintaanTerbaru />}
    </div>
  );
}
