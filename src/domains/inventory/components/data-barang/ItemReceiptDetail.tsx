"use client";

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useCan } from '@/domains/auth/user-context';
import { getItem } from '@/domains/inventory/api';
import { useApiData } from '@/shared/lib/use-api-data';
import { SupplierCell } from './DataBarangTable';

// Data contoh penerimaan; belum terhubung ke riwayat transaksi backend.
const DUMMY_RECEIPTS = [
  { date: '18 November 2026', quantity: 25, price: 125000, supplier: 'PT Sumber Material' },
  { date: '10 November 2026', quantity: 40, price: 120000, supplier: 'CV Mitra Sejahtera' },
  { date: '02 November 2026', quantity: 15, price: 122500, supplier: 'PT Sumber Material' },
];

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

function ReceiptDetail({ itemId }: { itemId: number }) {
  const { data: item, loading, error } = useApiData(() => getItem(itemId), `item-receipt-detail:${itemId}`, 'Gagal memuat detail barang.');
  if (loading) return <p role="status" className="text-sm text-gray-500">Memuat detail barang...</p>;
  if (error) return <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</p>;
  if (!item) return <p role="alert">Barang tidak ditemukan.</p>;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-8 shadow-sm">
      <div className="mb-5">
        <p className="font-bold text-gray-900">{item.name}</p>
        <p className="mt-1 text-sm text-gray-500">Kode barang: {item.code || '-'} · Satuan: {item.unit}</p>
      </div>
      <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        Data dummy: contoh riwayat penerimaan material dari beberapa supplier. Jumlah dan harga di bawah bukan transaksi atau stok aktual.
      </p>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <caption className="sr-only">Riwayat penerimaan {item.name} (data dummy)</caption>
          <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
            <tr>
              <th scope="col" className="px-6 py-4">Tanggal Masuk</th>
              <th scope="col" className="px-6 py-4 text-right">Jumlah</th>
              <th scope="col" className="px-6 py-4 text-right">Harga per Satuan</th>
              <th scope="col" className="px-6 py-4">Supplier</th>
            </tr>
          </thead>
          <tbody>
            {DUMMY_RECEIPTS.map((receipt, index) => (
              <tr key={receipt.date} className={`h-20 ${index % 2 ? 'bg-gray-50' : 'bg-white'} hover:bg-[#FF8A00]/5 transition-colors`}>
                <td className="px-6 py-4 text-gray-600">{receipt.date}</td>
                <td className="px-6 py-4 text-right font-bold text-gray-900">{receipt.quantity} {item.unit}</td>
                <td className="px-6 py-4 text-right font-mono text-gray-700">{rupiah.format(receipt.price)}</td>
                <td className="px-6 py-4"><SupplierCell name={receipt.supplier} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ItemReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const canView = useCan('item.view');
  const itemId = Number(id);
  const validId = /^\d+$/.test(id) && Number.isSafeInteger(itemId) && itemId > 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link href="/dashboard/superadmin/master/data-barang" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Data Barang
      </Link>
      <h1 className="mb-2 text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Detail Barang</h1>
      <p className="mb-6 text-sm text-gray-500">Riwayat penerimaan material berdasarkan tanggal masuk dan supplier.</p>
      {!canView ? <p role="alert">Anda tidak memiliki izin melihat detail barang.</p> : !validId ? <p role="alert">ID barang tidak valid.</p> : <ReceiptDetail key={itemId} itemId={itemId} />}
    </div>
  );
}
