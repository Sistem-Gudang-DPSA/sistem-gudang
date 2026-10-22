"use client";

import { useCan } from '@/domains/auth/user-context';
import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createStockOpname, listItems } from '@/domains/inventory/api';
import type { ItemListRow } from '@/domains/inventory/types';
import { ApiError } from '@/shared/lib/api-client';
import { INTEGER_INPUT, digitsOnly } from '@/shared/lib/input';
import Pagination from '@/shared/components/Pagination';
import { useSort, type Sort } from '@/shared/components/SortableTh';

// SortableTh has no rowSpan, and this header spans two rows, so the same sort button is written here.
type SortThProps = { label: string; sortKey: string; sort: Sort; onSort: (by: string) => void; className: string; rowSpan?: number };
function SortTh({ label, sortKey, sort, onSort, className, rowSpan }: SortThProps) {
  const active = sort?.by === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th rowSpan={rowSpan} scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={className}>
      <button type="button" onClick={() => onSort(sortKey)} className="flex w-full items-center gap-1.5 text-left font-[inherit] hover:text-gray-900">
        <span>{label}</span>
        <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-orange-500" : "text-gray-300"}`} strokeWidth={2.5} aria-hidden />
      </button>
    </th>
  );
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
type Row = { itemId: string; itemName: string; jumlah: string; keterangan: string };

export default function TambahStockOpnameGudang() {
  const router = useRouter();
  const canCreate = useCan('stock-opname.create');

  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [items, setItems] = useState<ItemListRow[]>([]);
  const [data, setData] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [loadingItems, setLoadingItems] = useState(false);
  const { sort, toggle } = useSort();
  // a sort change starts again from page 1, like the pager does
  const sortBy = (by: string) => {
    toggle(by);
    setPage(1);
  };


  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      setLoadingItems(true);
      setError("");

      try {
        const res = await listItems({ page, pageSize, sortBy: sort?.by, sortDir: sort?.dir });

        if (cancelled) return;

        setItems(res.rows);
        setTotalItems(res.total);

        setData((prev) => {
          const existing = new Map(
            prev.map((row) => [row.itemId, row])
          );

          const newRows = res.rows.map((item) => {
            const id = String(item.id);
            const saved = existing.get(id);

            return saved ?? {
              itemId: id,
              itemName: item.name,
              jumlah: "",
              keterangan: "",
            };
          });

          const currentPageIds = new Set(
            res.rows.map((item) => String(item.id))
          );

          return [
            ...prev.filter(
              (row) => !currentPageIds.has(row.itemId)
            ),
            ...newRows,
          ];
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Gagal memuat data barang."
          );
        }
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    }

    loadItems();

    return () => {
      cancelled = true;
    };
  }, [page, pageSize, sort]);

  const handleChange = (itemId: string, patch: Partial<Row>) => {
    setData((prev) => prev.map((row) => row.itemId === itemId ? {...row, ...patch} : row));
  };

  const findItem = (itemId: string) => items.find((it) => String(it.id) === itemId);

  const handleSimpan = async () => {
    // Only rows with a physical count go to the API; an empty row must not zero that item's stock.
    const filled = data.filter((row) => row.jumlah !== "");
    if (filled.length === 0) {
      setError("Isi jumlah fisik minimal satu barang.");
      return;
    }
    const ids = filled.map((row) => row.itemId);
    if (new Set(ids).size !== ids.length) {
      setError("Satu barang hanya boleh muncul sekali per stok opname.");
      return;
    }
    // Stock opname overwrites stock with the physical count, so confirm first.
    const changed = filled.filter((row) => Number(row.jumlah) !== findItem(row.itemId)?.stock).length;
    if (!window.confirm(`Stok ${filled.length} barang akan disetel ke jumlah fisik (${changed} berbeda dari stok sistem). Lanjutkan?`)) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createStockOpname({
        month: Number(month),
        year: Number(year),
        lines: filled.map((row) => ({
          itemId: Number(row.itemId),
          physicalQty: Number(row.jumlah),
          note: row.keterangan || undefined,
        })),
      });
      router.push('/dashboard/gudang/transaksi/stock-opname');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan stok opname.");
    } finally {
      setSaving(false);
    }
  };

  if (!canCreate) return <div className="p-6 text-sm text-gray-600">Anda tidak punya izin untuk membuat stock opname.</div>;

  const pageData = data.filter((row) =>
    items.some((item) => String(item.id) === row.itemId)
  );

  return (
    <div className="flex flex-col bg-white min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="text-gray-800 hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
        </button>
        <h1 className="text-[19px] font-extrabold text-black tracking-wide">
          Tambah Stok Opname {BULAN[Number(month) - 1]} {year}
        </h1>
      </div>

      <div className="max-w-5xl">
        <div className="flex gap-3 mb-6">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-200 rounded-xl py-2.5 px-3 shadow-sm text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20"
          >
            {BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="border border-gray-200 rounded-xl py-2.5 px-3 shadow-sm text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20"
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <datalist id="stock-opname-items">
          {items.map((it) => <option key={it.id} value={it.name} />)}
        </datalist>

        <div className="relative">
          {/* Table Wrapper */}
          <div className="overflow-hidden w-full bg-white rounded-xl shadow-sm border border-gray-200/80">
            <div className="overflow-x-auto w-full">
              <table className="w-full table-auto text-left text-sm border-collapse">
                <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                  <tr>
                    <th rowSpan={2} className="border-r border-b border-gray-200 px-6 py-4 align-top w-12 whitespace-nowrap text-center">No</th>
                    <SortTh rowSpan={2} label="Nama Barang" sortKey="name" sort={sort} onSort={sortBy} className="border-r border-b border-gray-200 px-6 py-4 align-top whitespace-nowrap" />
                    <SortTh rowSpan={2} label="Satuan" sortKey="unit" sort={sort} onSort={sortBy} className="border-r border-b border-gray-200 px-6 py-4 align-top whitespace-nowrap" />
                    <SortTh rowSpan={2} label="Kategori" sortKey="category" sort={sort} onSort={sortBy} className="border-r border-b border-gray-200 px-6 py-4 align-top whitespace-nowrap" />
                    <th colSpan={2} className="border-r border-b border-gray-200 px-6 py-2.5 text-center whitespace-nowrap">Administrasi</th>
                    <th colSpan={2} className="border-r border-b border-gray-200 px-6 py-2.5 text-center whitespace-nowrap">Fisik</th>
                    <th colSpan={2} className="border-r border-b border-gray-200 px-6 py-2.5 text-center whitespace-nowrap">Selisih</th>
                    <th rowSpan={2} className="border-b border-gray-200 px-6 py-4 align-top whitespace-nowrap">Keterangan</th>
                  </tr>
                  <tr>
                    <th colSpan={2} className="border-r border-b border-gray-200 px-6 py-2.5 font-semibold whitespace-nowrap text-center">Jumlah</th>
                    {/* <th className="border-r border-b border-gray-200 px-6 py-2.5 font-semibold whitespace-nowrap text-center">Harga</th> */}
                    <th colSpan={2} className="border-r border-b border-gray-200 px-6 py-2.5 font-semibold whitespace-nowrap text-center">Jumlah</th>
                    {/* <th className="border-r border-b border-gray-200 px-6 py-2.5 font-semibold whitespace-nowrap text-center">Harga</th> */}
                    <th colSpan={2} className="border-r border-b border-gray-200 px-6 py-2.5 font-semibold whitespace-nowrap text-center">Jumlah</th>
                    {/* <th className="border-r border-b border-gray-200 px-6 py-2.5 font-semibold whitespace-nowrap text-center">Harga</th> */}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageData.map((row, index) => {
                    const item = items.find((it) => String(it.id) === row.itemId);
                    // Administrasi = system stock; Fisik harga and Selisih are derived (the API only takes physical qty).
                    const adm = item ? { qty: item.stock, harga: item.stock * item.price } : null;
                    const fsk = item && row.jumlah !== "" ? { qty: Number(row.jumlah), harga: Number(row.jumlah) * item.price } : null;
                    const fmt = (n?: number) => (n === undefined ? '' : n.toLocaleString('id-ID'));
                    return (
                      <tr key={item?.id} className="bg-white hover:bg-orange-50/10 transition-colors duration-150">
                        <td className="border-r border-b border-gray-100/50 h-12 text-gray-400 font-medium text-center text-xs"> {(page - 1) * pageSize + index + 1}</td>
                        <td className="border-r border-b border-gray-100/50 p-0 whitespace-normal">
                          <div className='flex flex-col'>
                            <span className="font-bold text-gray-900">{row.itemName}</span>
                            <span className="text-xs font-mono text-gray-500 mt-0.5">{item?.code ?? '-'}</span>
                          </div>
                        </td>
                        <td className="border-r border-b border-gray-100/50 p-0 w-24">
                          <input type="text" readOnly value={item?.unit ?? ''} placeholder="Unit" className="w-full h-full min-h-12 px-4 py-2 bg-transparent text-center text-gray-700 text-sm placeholder-gray-300 focus:outline-none" />
                        </td>
                        <td className="border-r border-b border-gray-100/50 p-0 w-32">
                          <input type="text" readOnly value={item?.category ?? ''} placeholder="Kategori" className="w-full h-full min-h-12 px-4 py-2 bg-transparent text-center text-gray-700 text-sm placeholder-gray-300 focus:outline-none" />
                        </td>
                        <td colSpan={2} className="border-r border-b border-gray-100/50 px-4 py-2 w-28 text-center text-gray-600">{fmt(adm?.qty)}</td>
                        {/* <td className="border-r border-b border-gray-100/50 px-4 py-2 w-36 text-center text-gray-600">{fmt(adm?.harga)}</td> */}
                        <td colSpan={2} className="border-r border-b border-gray-100/50 p-0 w-28">
                          <input {...INTEGER_INPUT} maxLength={9} value={row.jumlah} placeholder="0" onChange={(e) => handleChange(row.itemId, { jumlah: digitsOnly(e.target.value) })} className="w-full h-full min-h-12 px-4 py-2 bg-transparent text-center focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500/50 text-gray-700 text-sm transition-all placeholder-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        </td>
                        {/* <td className="border-r border-b border-gray-100/50 px-4 py-2 w-36 text-center text-gray-600">{fmt(fsk?.harga)}</td> */}
                        <td colSpan={2} className="border-r border-b border-gray-100/50 px-4 py-2 w-28 text-center text-gray-600 font-bold bg-gray-50/50">{fsk && adm ? fmt(fsk.qty - adm.qty) : ''}</td>
                        {/* <td className="border-r border-b border-gray-100/50 px-4 py-2 w-36 text-center text-gray-600 font-bold bg-gray-50/50">{fsk && adm ? fmt(fsk.harga - adm.harga) : ''}</td> */}
                        <td className="border-b border-gray-100/50 p-0">
                          <input type="text" maxLength={255} value={row.keterangan} placeholder="Tambahkan catatan..." onChange={(e) => handleChange(row.itemId, { keterangan: e.target.value })} className="w-full h-full min-h-12 px-6 py-2 bg-transparent focus:outline-none focus:ring-1 focus:ring-inset focus:ring-orange-500/50 text-gray-700 text-sm transition-all placeholder-gray-300 italic" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {loadingItems && (
                <p className="text-sm text-gray-500 p-4">
                  Memuat data barang...
                </p>
              )}

              <Pagination page={page} pageSize={pageSize} total={totalItems} onPageChange={setPage} />
            </div>
          </div>
        </div>
      </div>

      {/* Simpan Button underneath */}
      {error && <p className="text-sm text-red-500 text-right mt-4">{error}</p>}
      <div className="flex justify-end mt-6">
        <button
          onClick={handleSimpan}
          disabled={saving}
          className="px-8 py-2.5 bg-[#ff8a00] text-white rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:bg-[#eb7d00] transition-all duration-200 font-semibold text-sm disabled:opacity-60"
        >
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  );
}
