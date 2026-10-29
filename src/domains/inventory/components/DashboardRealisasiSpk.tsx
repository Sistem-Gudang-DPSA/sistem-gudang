"use client";

import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Filter, Search } from 'lucide-react';
import { listItems } from '@/domains/inventory/api';
import type { ItemListRow } from '@/domains/inventory/types';
import { toDateRange } from '@/domains/inventory/date';
import { listTrackingSpk } from '@/domains/ppic/api';
import { useApiData } from '@/shared/lib/use-api-data';
import SearchableSelect from '@/shared/components/SearchableSelect';
import DateFilter from '@/shared/components/DateFilter';
import { ExportExcellButton } from '@/shared/components/Tombol';
import {
  fmtQty, fmtRp, loadRealisasi, loadRealisasiPeriode, loadRekapBulanan, makeRows, periodeLabel, totalsOf,
  type RealisasiTable, type SpkUsage,
} from '@/domains/inventory/components/RealisasiSPK';
import { exportRealisasiExcel, exportRekapBulananExcel, printRealisasiPdf } from '@/shared/components/ExportRealisasi';

const checkboxClass = 'w-4 h-4 accent-[#FF8A00] cursor-pointer disabled:cursor-not-allowed';
const selectClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors';

// Semua barang (100 per permintaan, batas API), karena tabel menampilkan seluruh barang
async function loadAllItems(): Promise<ItemListRow[]> {
  const pageSize = 100;
  const first = await listItems({ page: 1, pageSize });
  const pages = Math.ceil(first.total / pageSize);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) => listItems({ page: i + 2, pageSize })),
  );
  return [first, ...rest].flatMap((r) => r.rows);
}

export default function RealisasiSpk() {
  const [client, setClient] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyUsed, setOnlyUsed] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterDay, setFilterDay] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [rekapLoading, setRekapLoading] = useState(false);
  const [rekapError, setRekapError] = useState('');

  const periodeAktif = !!(filterDay || filterMonth || filterYear);
  const activeCount = [filterDay, filterMonth, filterYear].filter(Boolean).length;
  const dateRange = toDateRange(filterDay, filterMonth, filterYear);
  const periode = periodeLabel(filterDay, filterMonth, filterYear);

  const { data: items, loading: loadingItems, error: errItems } =
    useApiData(loadAllItems, 'realisasi-items', 'Gagal memuat data barang.');
  const { data: spkList, error: errSpk } =
    useApiData(() => listTrackingSpk(), 'spk', 'Gagal memuat daftar SPK.');

  // Harus setelah `items` dideklarasikan
  const bisaRekap = !!filterMonth && !!filterYear && !!items;

  const handleRekapBulanan = async () => {
    if (!items) return;
    setRekapLoading(true);
    setRekapError('');
    try {
      const data = await loadRekapBulanan(items, filterMonth, filterYear);
      if (data.kolom.length === 0) {
        setRekapError(`Tidak ada transaksi barang keluar untuk SPK pada ${data.periode}.`);
        return;
      }
      await exportRekapBulananExcel(data);
    } catch (err) {
      setRekapError(err instanceof Error ? err.message : 'Gagal membuat rekap bulanan.');
    } finally {
      setRekapLoading(false);
    }
  };

  const clientOptions = useMemo(
    () =>
      [...new Set((spkList ?? []).map((t) => t.client?.trim()).filter(Boolean) as string[])]
        .sort((a, b) => a.localeCompare(b))
        .map((c) => ({ value: c, label: c })),
    [spkList],
  );

  // SPK milik client yang dipilih
  const spks = useMemo(
    () =>
      (spkList ?? [])
        .filter((t) => client && t.client?.trim().toLowerCase() === client.toLowerCase())
        .map((t) => t.noSpk)
        .sort((a, b) => a.localeCompare(b)),
    [spkList, client],
  );

  // Tanpa filter: dari dokubah. Dengan filter: dari transaksi barang keluar pada periode itu.
  const { data: usages, loading: loadingSpk, error: errBahan } = useApiData(
    () => {
      if (spks.length === 0) return Promise.resolve([] as SpkUsage[]);
      return periodeAktif ? loadRealisasiPeriode(spks, dateRange) : loadRealisasi(spks);
    },
    `realisasi|${client}|${spks.join(',')}|${filterDay}|${filterMonth}|${filterYear}`,
    'Gagal memuat data pengambilan SPK.',
  );

  const spkNos = (usages ?? []).map((u) => u.noSpk);
  const n = spkNos.length;
  const fullRows = useMemo(() => makeRows(items ?? [], usages ?? []), [items, usages]);

  const q = searchQuery.trim().toLowerCase();
  const rows = fullRows.filter(
    (r) =>
      (!q || r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)) &&
      (!onlyUsed || n === 0 || r.cells.some((c) => c.qty > 0)),
  );
  const table: RealisasiTable = { client, periode, spks: spkNos, rows, totals: totalsOf(rows, n) };

  const memuat = loadingItems || loadingSpk;
  const error = errItems || errSpk || errBahan;
  const colCount = 5 + n * 2; // No, Kode, Nama, Harga, Total Pengambilan
  const pesan = memuat ? 'Memuat data...' : error ? error : rows.length === 0 ? 'Barang tidak ditemukan.' : null;
  const thKiri = 'px-3 py-3';
  const sekat = 'border-l border-gray-200';

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">Realisasi SPK</h1>
        <p className="text-gray-500 text-sm">Pemakaian dan biaya barang per SPK, dapat difilter per tanggal, bulan, dan tahun.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative w-full sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                maxLength={100}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kode atau nama barang..."
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all shadow-sm"
              />
            </div>
            <div className="w-full sm:w-64">
              <SearchableSelect
                value={client}
                onChange={setClient}
                options={clientOptions}
                placeholder="Pilih client"
                aria-label="Client"
                className={selectClass}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input type="checkbox" checked={onlyUsed} onChange={(e) => setOnlyUsed(e.target.checked)} disabled={n === 0} className={checkboxClass} />
              Hanya barang terpakai
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilter((v) => !v)}
              aria-expanded={showFilter}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors text-sm font-medium ${
                showFilter || activeCount > 0
                  ? 'bg-orange-50 border-orange-300 text-orange-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filter{activeCount > 0 ? ` (${activeCount})` : ''}</span>
            </button>
            <ExportExcellButton onClick={() => exportRealisasiExcel(table)} disabled={memuat || rows.length === 0} />
            <button
              type="button"
              onClick={() => printRealisasiPdf(table)}
              disabled={memuat || rows.length === 0}
              title="Print Data ke PDF"
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Print PDF</span>
            </button>
            <button
              type="button"
              onClick={handleRekapBulanan}
              disabled={!bisaRekap || rekapLoading}
              title={bisaRekap ? 'Export rekap semua client untuk bulan ini' : 'Pilih Bulan dan Tahun di Filter dulu'}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">{rekapLoading ? 'Menyiapkan...' : 'Rekap Bulanan'}</span>
            </button>
          </div>
        </div>

        {showFilter && (
          <DateFilter
            day={filterDay}
            month={filterMonth}
            year={filterYear}
            onDayChange={setFilterDay}
            onMonthChange={setFilterMonth}
            onYearChange={setFilterYear}
            onReset={() => { setFilterDay(''); setFilterMonth(''); setFilterYear(''); }}
          />
        )}

        {rekapError && (
          <p role="alert" className="mx-5 mt-5 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{rekapError}</p>
        )}
        {client && !memuat && !error && n === 0 && (
          <p className="mx-5 mt-5 p-3 bg-amber-50 text-amber-800 text-sm rounded-lg">Client ini belum punya SPK.</p>
        )}
        {!client && (
          <p className="mx-5 mt-5 p-3 bg-blue-50 text-blue-700 text-sm rounded-lg">Pilih client untuk menampilkan realisasi per SPK.</p>
        )}
        {client && n > 0 && !memuat && !error && (
          <p className="mx-5 mt-5 text-xs text-gray-500">
            Periode: <b className="text-gray-700">{periode}</b> · Jumlah diambil dari{' '}
            {periodeAktif ? 'transaksi barang keluar pada periode ini' : 'pengambilan di dokubah (seluruh periode)'}.
          </p>
        )}

        <div className="overflow-auto max-h-[70vh] mt-3">
          <table className="w-max text-left text-sm whitespace-nowrap">
            <thead className="sticky top-0 z-20 bg-gray-50 text-gray-600 font-semibold shadow-[0_1px_0_#e5e7eb]">
              <tr className="border-b border-gray-100">
                <th rowSpan={n > 0 ? 3 : 1} scope="col" className={`${thKiri} text-center align-middle`}>No</th>
                <th rowSpan={n > 0 ? 3 : 1} scope="col" className={`${thKiri} align-middle`}>Kode Barang</th>
                <th rowSpan={n > 0 ? 3 : 1} scope="col" className={`${thKiri} align-middle`}>Nama Barang</th>
                <th rowSpan={n > 0 ? 3 : 1} scope="col" className={`${thKiri} text-right align-middle`}>Harga Satuan</th>
                <th rowSpan={n > 0 ? 3 : 1} scope="col" className={`${thKiri} text-right align-middle`}>Total Pengambilan</th>
                {n > 0 && (
                  <th colSpan={n * 2} scope="colgroup" className={`px-4 py-3 text-center border-b border-gray-200 ${sekat}`}>{client}</th>
                )}
              </tr>
              {n > 0 && (
                <>
                  <tr className="border-b border-gray-100">
                    {spkNos.map((no) => (
                      <th key={no} colSpan={2} scope="colgroup" className={`px-4 py-2 text-center ${sekat}`}>{no}</th>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-100">
                    {spkNos.map((no) => (
                      <React.Fragment key={no}>
                        <th scope="col" className={`px-4 py-2 min-w-24 text-center ${sekat}`}>Jumlah</th>
                        <th scope="col" className="px-4 py-2 min-w-36 text-center">Biaya</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </>
              )}
            </thead>

            <tbody className="divide-y divide-gray-50">
              {pesan && (
                <tr>
                  <td colSpan={colCount} className={`px-6 py-10 text-center ${error && !memuat ? 'text-red-500' : 'text-gray-400'}`}>{pesan}</td>
                </tr>
              )}
              {!memuat && !error && rows.map((r, i) => (
                <tr key={r.id} className="hover:bg-[#FF8A00]/5 transition-colors">
                  <td className="px-3 py-2.5 text-center text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-700">{r.code}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-900">{r.name}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{fmtRp(r.price)}</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${r.totalQty ? 'font-semibold text-gray-900' : 'text-gray-300'}`}>{fmtQty(r.totalQty)}</td>
                  {r.cells.map((c, k) => (
                    <React.Fragment key={spkNos[k]}>
                      <td className={`px-4 py-2.5 min-w-24 text-right tabular-nums ${sekat} ${c.qty ? 'font-semibold text-gray-900' : 'text-gray-300'}`}>{fmtQty(c.qty)}</td>
                      <td className={`px-4 py-2.5 min-w-36 text-right tabular-nums ${c.cost ? 'font-semibold text-gray-900' : 'text-gray-300'}`}>{fmtRp(c.cost)}</td>
                    </React.Fragment>
                  ))}
                </tr>
              ))}
            </tbody>

            {!memuat && !error && rows.length > 0 && (
              <tfoot className="sticky bottom-0 z-10 bg-gray-50 font-bold text-gray-900 shadow-[0_-1px_0_#e5e7eb]">
                <tr>
                  <td colSpan={5} className="px-3 py-3">Total pengeluaran</td>
                  {table.totals.map((v, k) => (
                    <React.Fragment key={spkNos[k]}>
                      <td className={`px-4 py-3 ${sekat}`} />
                      <td className="px-4 py-3 text-right tabular-nums">{fmtRp(v)}</td>
                    </React.Fragment>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}