"use client";

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getStockReconciliation, postStockReconciliation } from '@/domains/inventory/api';
import type { StockReconciliationDetail } from '@/domains/inventory/types';
import { ApiError } from '@/shared/lib/api-client';
import { useApiData } from '@/shared/lib/use-api-data';
import { useCan } from '@/domains/auth/user-context';
import Modal from '@/shared/components/Modal';
import ScrollableTable, { STICKY_HEAD_CLASS } from '@/shared/components/ScrollableTable';
import { KategoriBadge } from '@/domains/inventory/components/data-barang/DataBarangTable';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const fmt = (value: number | null | undefined) => value == null ? '-' : value.toLocaleString('id-ID');

export default function PemutihanStokDetail() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const base = pathname.startsWith('/dashboard/gudang') ? '/dashboard/gudang' : '/dashboard/ppic';
  const listPath = `${base}/transaksi/pemutihan-stok`;
  const canPost = useCan('stock-reconciliation.post');
  const canEdit = useCan('stock-reconciliation.create');
  const { data: fetched, loading, error, reload } = useApiData(
    () => getStockReconciliation(id),
    `stock-reconciliation:${id}`,
    'Gagal memuat pemutihan stok.',
  );
  const [posted, setPosted] = useState<StockReconciliationDetail | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const idempotencyKey = useRef<string | null>(null);
  const detail = posted ?? fetched;
  const isGudang = base === '/dashboard/gudang';

  if (loading) return <p role="status" className="p-6 text-sm text-gray-500">Memuat pemutihan stok...</p>;
  if (error) return <div className="p-6"><p role="alert" className="text-sm text-red-600">{error}</p><Link href={listPath} className="mt-4 inline-block text-sm text-blue-600 underline">Kembali ke daftar</Link></div>;
  if (!detail) return <p role="alert" className="p-6 text-sm text-red-600">Pemutihan tidak ditemukan.</p>;
  if (isGudang && detail.status === 'DRAFT') return <p role="alert" className="p-6 text-sm text-red-600">Pemutihan belum tersedia untuk divisi Anda.</p>;

  const handlePost = async () => {
    if (posting) return;
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    setPosting(true);
    setPostError('');
    try {
      const result = await postStockReconciliation(detail.id, idempotencyKey.current);
      setPosted(result);
      setConfirming(false);
      reload();
    } catch (err) {
      setPostError(err instanceof ApiError ? err.message : 'Gagal memposting pemutihan.');
    } finally {
      setPosting(false);
    }
  };

  const systemQty = (line: StockReconciliationDetail['lines'][number]) => detail.status === 'DRAFT' ? line.reviewedSystemQty ?? line.systemQty : line.systemQty;

  return (
    <div className="pb-10">
      <Link href={listPath} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"><ArrowLeft className="h-4 w-4" />Kembali ke Pemutihan Stok</Link>
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pemutihan Stok {BULAN[detail.month - 1]} {detail.year}</h1>
            <p className="mt-2 text-sm text-gray-500">Status: <span className="font-semibold text-gray-700">{detail.status === 'POSTED' ? 'Diposting' : 'Draft'}</span></p>
            {detail.status === 'POSTED' && <p className="mt-1 text-sm text-gray-500">Diposting oleh {detail.postedByName ?? detail.postedBy ?? '-'}{detail.postedAt ? ` · ${new Date(detail.postedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB` : ''}</p>}
            {detail.notes && <p className="mt-2 text-sm text-gray-600">{detail.notes}</p>}
          </div>
          {!isGudang && detail.status === 'DRAFT' && (
            <div className="flex gap-2">
              {canEdit && <Link href={`${listPath}/${detail.id}/edit`} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Edit Draft</Link>}
              {canPost && <button type="button" onClick={() => { setPostError(''); setConfirming(true); }} className="rounded-lg bg-[#ff8a00] px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600">Posting Pemutihan</button>}
            </div>
          )}
        </div>
        <ScrollableTable ariaLabel="Tabel detail pemutihan stok">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className={`${STICKY_HEAD_CLASS} bg-gray-50 text-gray-600 font-semibold border-b border-gray-100`}>
              <tr>
                {['No', 'Kode Barang', 'Nama Barang', 'Kategori', 'Satuan', 'Stok Sistem', 'Jumlah Fisik', 'Selisih', 'Harga Satuan', 'Keterangan'].map((label) => <th key={label} scope="col" className={`px-6 py-3 ${label.startsWith('Stok') || label.startsWith('Jumlah') || label.startsWith('Selisih') || label.startsWith('Harga') ? 'text-right' : ''}`}>{label}</th>)}
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
                  <td className="px-6 py-3 text-right text-gray-700">{fmt(systemQty(line))}</td>
                  <td className="px-6 py-3 text-right font-bold text-gray-900">{fmt(line.physicalQty)}</td>
                  <td className={`px-6 py-3 text-right font-bold ${line.difference != null && line.difference < 0 ? 'text-red-600' : 'text-gray-700'}`}>{line.difference == null ? '-' : `${line.difference > 0 ? '+' : ''}${line.difference.toLocaleString('id-ID')}`}</td>
                  <td className="px-6 py-3 text-right text-gray-700">{fmt(line.unitPrice)}</td>
                  <td className="px-6 py-3 whitespace-normal text-gray-700">{line.note ?? '-'}</td>
                </tr>
              ))}
              {detail.lines.length === 0 && <tr><td colSpan={10} className="px-6 py-8 text-center text-gray-400">Tidak ada barang pada pemutihan ini.</td></tr>}
            </tbody>
          </table>
        </ScrollableTable>
      </div>

      {confirming && (
        <Modal title="Posting Pemutihan?" onClose={() => { if (!posting) setConfirming(false); }} footer={<>
          <button type="button" disabled={posting} onClick={() => setConfirming(false)} className="px-4 py-2 rounded-lg border border-gray-200 disabled:opacity-60">Batal</button>
          <button type="button" disabled={posting} onClick={() => void handlePost()} className="px-4 py-2 rounded-lg bg-[#ff8a00] text-white disabled:opacity-60">{posting ? 'Memposting...' : 'Ya, Posting'}</button>
        </>}>
          <p className="text-sm text-gray-700">Setelah diposting, stok sistem disesuaikan dan seluruh selisih menjadi 0. Tindakan ini tidak bisa dibatalkan.</p>
          {postError && <p role="alert" className="mt-3 text-sm text-red-600">{postError}</p>}
        </Modal>
      )}
    </div>
  );
}
