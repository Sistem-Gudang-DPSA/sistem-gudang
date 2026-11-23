"use client";

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getStockOpname } from '@/domains/inventory/api';
import { useCanAny } from '@/domains/auth/user-context';
import { useApiData } from '@/shared/lib/use-api-data';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function Detail({ id }: { id: number }) {
  const { data: detail, loading, error } = useApiData(() => getStockOpname(id), `stock-opname-detail:${id}`, 'Gagal memuat detail stok opname.');
  if (loading) return <p role="status">Memuat detail stok opname...</p>;
  if (error) return <p role="alert" className="text-red-600">{error}</p>;
  if (!detail) return <p role="alert">Stok opname tidak ditemukan.</p>;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">Stok Opname {BULAN[detail.month - 1]} {detail.year}</h1>
        <p className="mt-2 text-sm text-gray-500">Sudah disubmit</p>
        {detail.notes && <p className="mt-3 text-sm text-gray-600">{detail.notes}</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
            <tr>
              {['Barang', 'Satuan', 'Kategori', 'Jumlah Administrasi', 'Jumlah Fisik', 'Jumlah Selisih', 'Keterangan'].map((label) => <th key={label} scope="col" className="px-6 py-4">{label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {detail.lines.map((line) => (
              <tr key={line.itemId}>
                <td className="px-6 py-4 font-medium text-gray-900">{line.itemName}<span className="block text-xs font-mono text-gray-500">{line.itemCode ?? '-'}</span></td>
                <td className="px-6 py-4">{line.unit}</td>
                <td className="px-6 py-4">{line.category}</td>
                <td className="px-6 py-4">{line.systemQty.toLocaleString('id-ID')}</td>
                <td className="px-6 py-4 font-bold">{line.physicalQty.toLocaleString('id-ID')}</td>
                <td className={`px-6 py-4 font-bold ${line.difference < 0 ? 'text-red-600' : 'text-gray-700'}`}>{line.difference > 0 ? '+' : ''}{line.difference.toLocaleString('id-ID')}</td>
                <td className="px-6 py-4">{line.note ?? '-'}</td>
              </tr>
            ))}
            {detail.lines.length === 0 && <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Tidak ada detail barang.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function StockOpnameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const backPath = pathname?.replace(/\/[^/]+$/, '') ?? '/dashboard/gudang/transaksi/stock-opname';
  // Same access as the Rekap lists that link here: Gudang transaksi, Gudang/GBJ laporan,
  // Purchasing, and Keuangan each open the page with a different permission.
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
