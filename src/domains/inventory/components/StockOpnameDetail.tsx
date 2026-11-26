"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getStockOpname, reopenStockOpname } from '@/domains/inventory/api';
import type { StockOpnameStatus } from '@/domains/inventory/types';
import { useCan, useCanAny } from '@/domains/auth/user-context';
import { useApiData } from '@/shared/lib/use-api-data';
import { ApiError } from '@/shared/lib/api-client';
import ScrollableTable, { STICKY_HEAD_CLASS } from '@/shared/components/ScrollableTable';
import { KategoriBadge } from '@/domains/inventory/components/data-barang/DataBarangTable';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const STATUS_LABEL: Record<StockOpnameStatus, string> = { OPEN: 'Open', SUBMITTED: 'Disubmit', POSTED: 'Diposting' };
const fmt = (value: number | null | undefined) => value == null ? '-' : value.toLocaleString('id-ID');

function Detail({ id }: { id: number }) {
  const canOpen = useCan('stock-opname.open');
  const { data: detail, loading, error, reload } = useApiData(() => getStockOpname(id), `stock-opname-detail:${id}`, 'Gagal memuat detail stok opname.');
  const [reopening, setReopening] = useState(false);
  const [actionError, setActionError] = useState('');
  if (loading) return <p role="status">Memuat detail stok opname...</p>;
  if (error) return <p role="alert" className="text-red-600">{error}</p>;
  if (!detail) return <p role="alert">Stok opname tidak ditemukan.</p>;

  const handleReopen = async () => {
    if (reopening) return;
    setReopening(true);
    setActionError('');
    try {
      await reopenStockOpname(id);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Gagal membuka kembali stok opname.');
    } finally {
      setReopening(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">Stok Opname {BULAN[detail.month - 1]} {detail.year}</h1>
        <p className="mt-2 text-sm text-gray-500">Status: <span className="font-semibold text-gray-700">{STATUS_LABEL[detail.status]}</span></p>
        {detail.progress && <p className="mt-1 text-sm text-gray-500">Progress: {detail.progress.filled} / {detail.progress.total} barang</p>}
        {detail.notes && <p className="mt-3 text-sm text-gray-600">{detail.notes}</p>}
        {canOpen && detail.status === 'SUBMITTED' && (
          <button type="button" onClick={() => void handleReopen()} disabled={reopening} className="mt-4 rounded-lg border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-700 disabled:opacity-60">
            {reopening ? 'Membuka...' : 'Reopen Opname'}
          </button>
        )}
        {actionError && <p role="alert" className="mt-3 text-sm text-red-600">{actionError}</p>}
      </div>
      <ScrollableTable ariaLabel="Tabel detail stok opname">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className={`${STICKY_HEAD_CLASS} bg-gray-50 text-gray-600 font-semibold border-b border-gray-100`}>
              <tr>
                {['No', 'Kode Barang', 'Nama Barang', 'Kategori', 'Satuan', 'Jumlah Administrasi', 'Jumlah Fisik', 'Jumlah Selisih', 'Keterangan'].map((label) => <th key={label} scope="col" className={`px-6 py-3 ${label.startsWith('Jumlah') ? 'text-right' : ''}`}>{label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {detail.lines.map((line, index) => (
                <tr key={line.itemId} className="hover:bg-[#FF8A00]/5 transition-colors">
                  <td className="px-6 py-3 text-gray-500">{index + 1}</td>
                  <td className="px-6 py-3 font-mono text-xs text-gray-600">{line.itemCode ?? '-'}</td>
                  <td className="px-6 py-3 font-bold text-gray-900">{line.itemName}</td>
                  <td className="px-6 py-3"><KategoriBadge category={line.category} /></td>
                  <td className="px-6 py-3 text-gray-700">{line.unit}</td>
                  <td className="px-6 py-3 text-right text-gray-700">{fmt(line.systemQty)}</td>
                  <td className="px-6 py-3 text-right font-bold text-gray-900">{fmt(line.physicalQty)}</td>
                  <td className={`px-6 py-3 text-right font-bold ${line.difference != null && line.difference < 0 ? 'text-red-600' : 'text-gray-700'}`}>{line.difference == null ? '-' : `${line.difference > 0 ? '+' : ''}${line.difference.toLocaleString('id-ID')}`}</td>
                  <td className="px-6 py-3 whitespace-normal text-gray-700">{line.note ?? '-'}</td>
                </tr>
              ))}
              {detail.lines.length === 0 && <tr><td colSpan={9} className="px-6 py-8 text-center text-gray-400">Tidak ada detail barang.</td></tr>}
            </tbody>
          </table>
        </ScrollableTable>
    </div>
  );
}

export default function StockOpnameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const backPath = pathname?.replace(/\/[^/]+$/, '') ?? '/dashboard/gudang/transaksi/stock-opname';
  const canView = useCanAny('stock-opname.view', 'report.view', 'item.set-price', 'supplier.create', 'supplier.update');
  const opnameId = Number(id);
  const valid = /^\d+$/.test(id) && Number.isSafeInteger(opnameId) && opnameId > 0;

  return (
    <div className="pb-10">
      <Link href={backPath} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"><ArrowLeft className="h-4 w-4" />Kembali ke Stok Opname</Link>
      {!canView ? <p role="alert">Anda tidak punya izin melihat stok opname.</p> : !valid ? <p role="alert">ID stok opname tidak valid.</p> : <Detail key={opnameId} id={opnameId} />}
    </div>
  );
}
