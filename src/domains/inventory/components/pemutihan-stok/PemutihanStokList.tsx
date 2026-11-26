"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Eye, Filter, Plus, Search } from 'lucide-react';
import { listStockReconciliations } from '@/domains/inventory/api';
import type { StockReconciliationStatus } from '@/domains/inventory/types';
import { useApiData } from '@/shared/lib/use-api-data';
import { useCan } from '@/domains/auth/user-context';
import DateFilter from '@/shared/components/DateFilter';
import ScrollableTable, { STICKY_HEAD_CLASS } from '@/shared/components/ScrollableTable';
import TableFooter from '@/shared/components/TableFooter';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const periodeLabel = (month: number, year: number) => `Pemutihan ${BULAN[month - 1]} ${year}`;
const STATUS_LABEL: Record<StockReconciliationStatus, string> = { DRAFT: 'Draft', POSTED: 'Diposting' };

export function PemutihanStokList({ basePath, mode }: { basePath: string; mode: 'ppic' | 'gudang' }) {
  const canCreate = useCan('stock-reconciliation.create');
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const key = JSON.stringify([search, month, year, page]);
  const { data, loading, error } = useApiData(
    () => listStockReconciliations({ page, pageSize, search: search.trim() || undefined, month: month ? Number(month) : undefined, year: year ? Number(year) : undefined }),
    key,
    'Gagal memuat data pemutihan stok.',
  );
  const rows = (data?.rows ?? []).filter((row) => mode === 'ppic' || row.status === 'POSTED');
  const total = data?.total ?? 0;
  const actionError = error;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col justify-start mb-8 gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">PEMUTIHAN STOK</h1>
        <p className="text-gray-500 text-sm">{mode === 'ppic' ? 'Tinjau selisih opname lalu posting pemutihan.' : 'Lihat pemutihan yang sudah diposting.'}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative w-full max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} maxLength={100} placeholder="Cari periode pemutihan..."
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20" />
          </div>
          <div className="flex gap-2">
            {mode === 'ppic' && canCreate && <Link href={`${basePath}/transaksi/pemutihan-stok/baru`} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 text-sm"><Plus className="w-4 h-4" />Buat Pemutihan</Link>}
            <button type="button" onClick={() => setShowFilter((v) => !v)} className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium ${showFilter || month || year ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-600'}`}><Filter className="w-4 h-4" />Filter</button>
          </div>
        </div>
        {showFilter && <DateFilter day="" month={month} year={year} onDayChange={() => undefined} onMonthChange={(v) => { setMonth(v); setPage(1); }} onYearChange={(v) => { setYear(v); setPage(1); }} onReset={() => { setMonth(''); setYear(''); setPage(1); }} showDay={false} />}
        {actionError && <p role="alert" className="px-6 pt-3 text-sm text-red-600">{actionError}</p>}

        <ScrollableTable ariaLabel="Tabel pemutihan stok">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className={`${STICKY_HEAD_CLASS} bg-gray-50 text-gray-600 font-semibold border-b border-gray-100`}>
              <tr>
                <th scope="col" className="px-6 py-3">No</th>
                <th scope="col" className="px-6 py-3">Periode</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3 text-right">Jumlah Barang</th>
                <th scope="col" className="px-6 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">Memuat data...</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">Belum ada data pemutihan.</td></tr>}
              {!loading && rows.map((row, index) => (
                <tr key={row.id} className="hover:bg-[#FF8A00]/5 transition-colors">
                  <td className="px-6 py-3 text-gray-500">{index + 1}</td>
                  <td className="px-6 py-3 font-bold text-gray-900">{periodeLabel(row.month, row.year)}</td>
                  <td className="px-6 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.status === 'POSTED' ? 'bg-green-100 text-green-800' : 'bg-amber-50 text-amber-800'}`}>{STATUS_LABEL[row.status]}</span></td>
                  <td className="px-6 py-3 text-right">{row.lineCount ?? '-'}</td>
                  <td className="px-6 py-3 text-center"><Link href={`${basePath}/transaksi/pemutihan-stok/${row.id}`} className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 text-blue-600 font-bold rounded-lg text-xs hover:bg-blue-100"><Eye className="h-3.5 w-3.5" />Detail</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTable>
        <TableFooter total={total} unit="pemutihan" />
      </div>
    </div>
  );
}
