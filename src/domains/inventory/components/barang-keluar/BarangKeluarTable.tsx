import React, { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { OutboundRow } from "@/domains/inventory/types";
import { displayDate } from "@/domains/inventory/date";
import SortableTh, { type Sort } from "@/shared/components/SortableTh";
import { BadgeDibatalkan } from "../BatalkanTransaksi";
import { AksiPengajuan, TombolEdit } from "./AksiEdit";

type Props = {
  rows: OutboundRow[];
  page: number;
  pageSize: number;
  loading: boolean;
  error: string;
  sort: Sort;
  onSort: (key: string) => void;
  selected: Map<number, OutboundRow>;
  allChecked: boolean;
  onToggle: (trx: OutboundRow) => void;
  onToggleAll: () => void;
  canUpdate: boolean;
  userId?: number;
  requesting: number | null;
  onRincian: (trx: OutboundRow) => void;
  onEdit: (trx: OutboundRow, lineIndex: number) => void;
  onAjukan: (trx: OutboundRow) => void;
  onRiwayat: (id: number) => void;
};

export default function BarangKeluarTable({
  rows, page, pageSize, loading, error, sort, onSort, selected, allChecked, onToggle, onToggleAll,
  canUpdate, userId, requesting, onRincian, onEdit, onAjukan, onRiwayat,
}: Props) {
  // Transaksi yang sedang disorot kursor; semua barisnya ikut disorot
  const [hoverTrx, setHoverTrx] = useState<number | null>(null);
  // Transaksi yang rincian barangnya sedang dibuka di tabel
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const toggleExpand = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const editProps = { canUpdate, userId, onEdit };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
          <tr>
            <th scope="col" className="px-6 py-4">
              No
            </th>
            <SortableTh
              label="Transaksi"
              sortKey="tanggal"
              sort={sort}
              onSort={onSort}
            />
            <SortableTh
              label="Client / SPK"
              sortKey="clientName"
              sort={sort}
              onSort={onSort}
            />
            <SortableTh
              label="Nama Item/Projek"
              sortKey="itemName"
              sort={sort}
              onSort={onSort}
            />
            <th scope="col" className="px-6 py-4">
              Pengambil
            </th>
            <th scope="col" className="px-6 py-4">
              Barang
            </th>
            <th scope="col" className="px-6 py-4 text-right">
              Jumlah
            </th>
            <th scope="col" className="px-6 py-4 text-center">
              Action
            </th>
            <th scope="col" className="px-6 py-4 text-center">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                Check
                <input type="checkbox" aria-label="Centang semua transaksi" checked={allChecked} onChange={onToggleAll} disabled={loading || !!error || rows.length === 0} className="w-4 h-4 accent-[#FF8A00]" />
              </label>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {loading && (
            <tr>
              <td
                colSpan={9}
                className="px-6 py-10 text-center text-gray-400"
              >
                Memuat data...
              </td>
            </tr>
          )}
          {!loading && error && (
            <tr>
              <td
                colSpan={9}
                className="px-6 py-10 text-center text-red-500"
              >
                {error}
              </td>
            </tr>
          )}
          {!loading &&
            !error &&
            rows.map((trx, trxIndex) => {
        const trxNo = (page - 1) * pageSize + trxIndex + 1;
              // Satu transaksi punya satu warna zebra, satu sorotan hover, dan satu garis aksen di semua barisnya, termasuk baris rincian
              const aktif = hoverTrx === trx.id;
              const zebra = trxNo % 2 === 0 ? "bg-gray-50/60" : "bg-white";
              const garisKiri = `border-l-[3px] ${aktif ? "border-[#FF8A00]" : "border-transparent"}`;
              const barisClass = `transition-colors group ${aktif ? "bg-[#FF8A00]/5" : zebra}`;
              const hoverProps = {
                "data-hover": aktif ? "true" : undefined,
                onMouseEnter: () => setHoverTrx(trx.id),
                onMouseLeave: () => setHoverTrx(null),
              };
              const terbuka = expanded.has(trx.id);
              const banyak = trx.lines.length > 1;
              const pertama = trx.lines[0];
              const jumlah = trx.lines.reduce((sum, l) => sum + l.qty, 0);
              // Nama yang bisa diklik membuka pop-up rincian transaksi
              const tombolRincian = (
                teks: React.ReactNode,
                className: string,
              ) => (
                <button
                  type="button"
                  onClick={() => onRincian(trx)}
                  aria-label={`Lihat rincian ${trx.id}`}
                  className={`text-left hover:underline ${className}`}
                >
                  {teks}
                </button>
              );
              return (
                <React.Fragment key={trx.id}>
                  <tr
                    {...hoverProps}
                    className={`${barisClass} border-t border-gray-100`}
                  >
                    <td className={`px-6 py-4 text-gray-500 ${garisKiri}`}>
                      <div className="flex items-center gap-2">
                        {banyak ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(trx.id)}
                            aria-expanded={terbuka}
                            aria-label={`${terbuka ? "Tutup" : "Buka"} rincian barang ${trx.id}`}
                            className="p-0.5 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-200/60"
                          >
                            <ChevronRight
                              className={`w-4 h-4 transition-transform ${terbuka ? "rotate-90" : ""}`}
                            />
                          </button>
                        ) : (
                          <span className="w-5" />
                        )}
                        <span>{trxNo}.</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start">
                        {tombolRincian(
                          trx.noTransaksi ?? trx.id,
                          "font-semibold text-gray-900",
                        )}
                        <span className="text-xs text-gray-500">
                          {displayDate(trx.date)}
                        </span>
                        <BadgeDibatalkan row={trx} />
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {trx.clientName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {trx.spk}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {tombolRincian(trx.itemName, "text-gray-600")}
                    </td>

                    <td className="px-6 py-4 text-gray-700">
                      {pertama?.pic ?? "-"}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start">
                        {tombolRincian(
                          pertama?.itemName ?? "-",
                          "font-medium text-gray-900",
                        )}
                        <span className="text-xs font-mono text-gray-500 mt-0.5">
                          {pertama?.itemCode ?? "-"}
                        </span>
                        {banyak && (
                          <span className="text-xs text-gray-400 mt-0.5">{`+${trx.lines.length - 1} barang lainnya`}</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right font-bold text-gray-800">
                      {jumlah}
                    </td>

                    <td className="px-6 py-4">
                      {/* Menggunakan kontainer flex agar tombol berjejer rapi ke samping */}
                      <div className="flex items-center justify-center gap-2">
                        {/* Aksi pengajuan selalu terlihat pada baris transaksi. */}
                        {(!banyak || !terbuka) && pertama && <TombolEdit trx={trx} lineIndex={0} {...editProps} />}
                        <AksiPengajuan trx={trx} canUpdate={canUpdate} userId={userId} requesting={requesting} onAjukan={onAjukan} onRiwayat={onRiwayat} />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input type="checkbox" aria-label={`Centang transaksi ${trx.noTransaksi ?? trx.id}`} checked={selected.has(trx.id)} onChange={() => onToggle(trx)} className="w-4 h-4 accent-[#FF8A00] cursor-pointer" />
                    </td>
                  </tr>

                  {terbuka &&
                    banyak &&
                    trx.lines.map((line, lineIndex) => (
                      <tr
                        key={lineIndex}
                        {...hoverProps}
                        className={barisClass}
                      >
                        <td className={`px-6 py-3 ${garisKiri}`} />
                        <td className="px-6 py-3" />
                        <td className="px-6 py-3" />
                        <td className="px-6 py-3" />
                        <td className="px-6 py-3" />
                        <td className="py-3 pl-12 pr-6">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">
                              {line.itemName}
                            </span>
                            <span className="text-xs font-mono text-gray-500 mt-0.5">
                              {line.itemCode ?? "-"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-gray-800">
                          {line.qty}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <TombolEdit trx={trx} lineIndex={lineIndex} {...editProps} />
                          </div>
                        </td>
                        <td />
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
          {!loading && !error && rows.length === 0 && (
            <tr>
              <td
                colSpan={9}
                className="px-6 py-10 text-center text-gray-400 italic"
              >
                Data tidak ditemukan untuk filter tersebut.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
