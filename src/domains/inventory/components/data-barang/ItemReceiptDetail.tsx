"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useCan } from '@/domains/auth/user-context';
import { getItem } from '@/domains/inventory/api';
import { useApiData } from '@/shared/lib/use-api-data';
import SearchableSelect from '@/shared/components/SearchableSelect';
import { SupplierCell } from './DataBarangTable';
import { DUMMY_RECEIPTS, totalStockValue } from './dummy-receipts';

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const tanggal = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
const supplierOptions = [...new Set(DUMMY_RECEIPTS.map((receipt) => receipt.supplier))].map((supplier) => ({ value: supplier, label: supplier }));

function ReceiptDetail({ itemId }: { itemId: number }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [supplier, setSupplier] = useState('');
  const hasFilter = !!(startDate || endDate || supplier);
  const receipts = DUMMY_RECEIPTS.filter((receipt) => (!startDate || receipt.date >= startDate) && (!endDate || receipt.date <= endDate) && (!supplier || receipt.supplier === supplier));
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
        Data dummy: contoh riwayat penerimaan material dari beberapa supplier. Jumlah, sisa stok, harga, dan nilai stok di bawah bukan transaksi atau stok aktual. Nilai stok = sisa stok × harga per satuan.
      </p>
      <div role="group" aria-label="Filter penerimaan barang" className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="receipt-start" className="mb-1 block text-xs text-gray-600">Dari tanggal</label>
          <input id="receipt-start" type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700" />
        </div>
        <div>
          <label htmlFor="receipt-end" className="mb-1 block text-xs text-gray-600">Sampai tanggal</label>
          <input id="receipt-end" type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700" />
        </div>
        <div className="w-full sm:w-64">
          <span className="mb-1 block text-xs text-gray-600">Supplier</span>
          <SearchableSelect aria-label="Filter supplier" value={supplier} onChange={setSupplier} options={[{ value: '', label: 'Semua supplier' }, ...supplierOptions]} placeholder="Semua supplier" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700" />
        </div>
        {hasFilter && <button type="button" onClick={() => { setStartDate(''); setEndDate(''); setSupplier(''); }} className="py-2 text-sm font-medium text-orange-600 hover:underline">Reset filter</button>}
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <caption className="sr-only">Riwayat penerimaan {item.name} (data dummy)</caption>
          <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
            <tr>
              <th scope="col" className="px-6 py-4">Tanggal Masuk</th>
              <th scope="col" className="px-6 py-4 text-right">Jumlah</th>
              <th scope="col" className="px-6 py-4 text-right">Sisa Stok</th>
              <th scope="col" className="px-6 py-4 text-right">Harga per Satuan</th>
              <th scope="col" className="px-6 py-4 text-right">Nilai Stok</th>
              <th scope="col" className="px-6 py-4">Supplier</th>
            </tr>
          </thead>
          <tbody>
            {receipts.length === 0 && <tr><td colSpan={6} className="px-6 py-6 text-center text-gray-500">Tidak ada penerimaan yang sesuai filter.</td></tr>}
            {receipts.map((receipt, index) => (
              <tr key={receipt.date} className={`h-20 ${index % 2 ? 'bg-gray-50' : 'bg-white'} hover:bg-[#FF8A00]/5 transition-colors`}>
                <td className="px-6 py-4 text-gray-600">{tanggal.format(new Date(`${receipt.date}T00:00:00`))}</td>
                <td className="px-6 py-4 text-right font-bold text-gray-900">{receipt.quantity} {item.unit}</td>
                <td className="px-6 py-4 text-right font-bold text-gray-900">{receipt.remainingStock} {item.unit}</td>
                <td className="px-6 py-4 text-right font-mono text-gray-700">{rupiah.format(receipt.price)}</td>
                <td className="px-6 py-4 text-right font-mono text-gray-700">{rupiah.format(receipt.remainingStock * receipt.price)}</td>
                <td className="px-6 py-4"><SupplierCell name={receipt.supplier} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-gray-100 bg-gray-50 font-bold text-gray-900">
            <tr>
              <th scope="row" colSpan={4} className="px-6 py-4 text-right">Total Nilai Stok{hasFilter && <span className="block text-xs font-normal text-gray-500">Seluruh penerimaan</span>}</th>
              <td className="px-6 py-4 text-right font-mono">{rupiah.format(totalStockValue)}</td>
              <td />
            </tr>
          </tfoot>
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
