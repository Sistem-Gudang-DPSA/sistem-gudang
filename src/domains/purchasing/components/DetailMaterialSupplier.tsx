"use client";

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getItem } from '@/domains/inventory/api';
import { SupplierCell } from '@/domains/inventory/components/data-barang/DataBarangTable';
import { useCan } from '@/domains/auth/user-context';
import { useApiData } from '@/shared/lib/use-api-data';
import { formatSupplierAmount, isSupplierAmount, materialSuppliers, supplierPriceSummary } from '../material-suppliers';

function MaterialSuppliers({ itemId }: { itemId: number }) {
  const { data: item, loading, error } = useApiData(() => getItem(itemId), `purchasing-material-suppliers:${itemId}`, 'Gagal memuat detail supplier material.');
  if (loading) return <p role="status" className="text-sm text-gray-500">Memuat detail supplier material...</p>;
  if (error) return <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</p>;
  if (!item) return <p role="alert">Material tidak ditemukan.</p>;

  const suppliers = materialSuppliers(item);
  const summary = supplierPriceSummary(suppliers);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
      <p className="font-bold text-gray-900">{item.name}</p>
      <p className="mt-1 text-sm text-gray-500">Kode barang: {item.code || '-'} · Satuan: {item.unit}</p>
      <p className="mb-5 mt-3 text-sm text-gray-600">Harga rata-rata = total harga supplier ÷ jumlah supplier.</p>
      {suppliers.length > 0 && summary.average === null && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Harga sebagian supplier belum tersedia. Total dan rata-rata ditampilkan setelah seluruh harga tersedia.</p>}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Supplier material {item.name}</caption>
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th scope="col" className="px-4 py-3 w-16">No</th>
              <th scope="col" className="px-4 py-3">Supplier</th>
              <th scope="col" className="px-4 py-3 text-right whitespace-nowrap">Sisa Stok ({item.unit})</th>
              <th scope="col" className="px-4 py-3 text-right whitespace-nowrap">Harga Material (Rp)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {suppliers.map((supplier, index) => (
              <tr key={supplier.id} className="hover:bg-purple-50/30">
                <td className="px-4 py-4 text-gray-500">{index + 1}</td>
                <td className="px-4 py-4 min-w-48"><SupplierCell name={supplier.name} /></td>
                <td className="px-4 py-4 text-right text-gray-700">{isSupplierAmount(supplier.remainingStock) ? supplier.remainingStock.toLocaleString('id-ID') : '-'}</td>
                <td className="px-4 py-4 text-right text-gray-700">{formatSupplierAmount(supplier.price)}</td>
              </tr>
            ))}
            {suppliers.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">Belum ada supplier untuk material ini.</td></tr>}
          </tbody>
          <tfoot className="border-t border-gray-100 bg-gray-50 text-gray-900">
            <tr><th scope="row" colSpan={3} className="px-4 py-3 text-right">Total Harga Supplier</th><td className="px-4 py-3 text-right font-semibold">{formatSupplierAmount(summary.total)}</td></tr>
            <tr><th scope="row" colSpan={3} className="px-4 py-3 text-right">Jumlah Supplier</th><td className="px-4 py-3 text-right">{suppliers.length}</td></tr>
            <tr><th scope="row" colSpan={3} className="px-4 py-3 text-right">Harga Rata-rata</th><td className="px-4 py-3 text-right font-bold text-purple-700">{formatSupplierAmount(summary.average)}</td></tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function DetailMaterialSupplier() {
  const { id } = useParams<{ id: string }>();
  const canView = useCan('item.view');
  const itemId = Number(id);
  const validId = /^\d+$/.test(id) && Number.isSafeInteger(itemId) && itemId > 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link href="/dashboard/purchasing/master/data-barang" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"><ArrowLeft className="h-4 w-4" />Kembali ke Data Barang</Link>
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">Detail Supplier Material</h1>
      <p className="mb-6 text-sm text-gray-500">Daftar supplier, sisa stok, dan harga material dari masing-masing supplier.</p>
      {!canView ? <p role="alert">Anda tidak memiliki izin melihat detail supplier material.</p> : !validId ? <p role="alert">ID barang tidak valid.</p> : <MaterialSuppliers key={itemId} itemId={itemId} />}
    </div>
  );
}
