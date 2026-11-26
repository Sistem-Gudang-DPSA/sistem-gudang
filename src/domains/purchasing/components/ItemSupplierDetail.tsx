"use client";

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useCan } from '@/domains/auth/user-context';
import { getItem } from '@/domains/inventory/api';
import { SupplierCell } from '@/domains/inventory/components/data-barang/DataBarangTable';
import { useApiData } from '@/shared/lib/use-api-data';

function SupplierDetail({ itemId }: { itemId: number }) {
  const { data: item, loading, error } = useApiData(() => getItem(itemId), `purchasing-item-suppliers:${itemId}`, 'Gagal memuat supplier material.');
  if (loading) return <p role="status" className="text-sm text-gray-500">Memuat supplier material...</p>;
  if (error) return <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</p>;
  if (!item) return <p role="alert">Barang tidak ditemukan.</p>;
  const suppliers = item.suppliers ?? (item.supplierId === null ? [] : [{ id: item.supplierId, name: `Supplier #${item.supplierId}` }]);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
      <p className="font-semibold text-gray-900">{item.name}</p>
      <p className="mb-6 mt-1 text-sm text-gray-500">Kode barang: {item.code ?? '-'} · Satuan: {item.unit}</p>
      <h2 className="mb-3 font-semibold text-gray-900">Daftar Supplier ({suppliers.length})</h2>
      {suppliers.length > 0 ? (
        <ul aria-label="Supplier material" className="divide-y divide-gray-100 rounded-xl border border-gray-100">
          {suppliers.map((supplier) => (
            <li key={supplier.id} className="px-4 py-4"><SupplierCell name={supplier.name} /></li>
          ))}
        </ul>
      ) : <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">Belum ada supplier yang dipetakan ke material ini.</p>}
    </div>
  );
}

export default function ItemSupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const canView = useCan('item.view');
  const itemId = Number(id);
  const validId = /^\d+$/.test(id) && Number.isSafeInteger(itemId) && itemId > 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link href="/dashboard/purchasing/master/data-barang" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Data Barang
      </Link>
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">Detail Supplier Material</h1>
      <p className="mb-6 text-sm text-gray-500">Daftar supplier yang dipetakan ke material ini.</p>
      {!canView ? <p role="alert">Anda tidak memiliki izin melihat supplier material.</p> : !validId ? <p role="alert">ID barang tidak valid.</p> : <SupplierDetail key={itemId} itemId={itemId} />}
    </div>
  );
}
