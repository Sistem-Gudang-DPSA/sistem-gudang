import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { OutboundRow } from "@/domains/inventory/types";
import { displayDate } from "@/domains/inventory/date";
import { AksiPengajuan, TombolEdit } from "../AksiEdit";
import { bisaEdit, PESAN_TIDAK_BISA_EDIT, tampilWaktu } from "../edit-rules";

// Pop-up rincian transaksi: header, semua barang, dan status edit
export default function RincianTrxModal({
  trx,
  canUpdate,
  userId,
  requesting,
  onClose,
  onEdit,
  onAjukan,
  onRiwayat,
}: {
  trx: OutboundRow;
  canUpdate: boolean;
  userId?: number;
  requesting: number | null;
  onClose: () => void;
  onEdit: (trx: OutboundRow, lineIndex: number) => void;
  onAjukan: (trx: OutboundRow) => void;
  onRiwayat: (id: number) => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md transition-opacity duration-300 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rincian-bk-judul"
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-full overflow-y-auto p-6 sm:p-8 relative animate-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup rincian"
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>

        <h2 id="rincian-bk-judul" className="text-[18px] font-extrabold text-black tracking-wide uppercase mb-6">
          Rincian Barang Keluar
        </h2>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mb-6 text-sm">
          {(
            [
              ["No. Transaksi", trx.noTransaksi ?? trx.id],
              ["Tanggal", displayDate(trx.date)],
              ["Client", trx.clientName],
              [trx.recipientType === "INTERNAL" ? "ID Stok / Internal" : "SPK", trx.spk],
              ["Nama Item/Projek", trx.itemName],
              ["Pengambil", trx.lines[0]?.pic ?? "-"],
              ["Dicatat", tampilWaktu(new Date(trx.createdAt).getTime())],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <dt className="text-gray-500">{k}</dt>
              <dd className="font-semibold text-gray-900">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold">
              <tr>
                <th scope="col" className="px-4 py-2.5">No</th>
                <th scope="col" className="px-4 py-2.5">Nama Barang</th>
                <th scope="col" className="px-4 py-2.5">Kode</th>
                <th scope="col" className="px-4 py-2.5 text-right">Jumlah</th>
                <th scope="col" className="px-4 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {trx.lines.map((line, i) => (
                <tr key={i}>
                  <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{line.itemName}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{line.itemCode ?? "-"}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-gray-800">{line.qty}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-center">
                      <TombolEdit trx={trx} lineIndex={i} canUpdate={canUpdate} userId={userId} onEdit={onEdit} onBuka={onClose} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-600">
          {bisaEdit(trx, userId) ? "Disetujui superadmin. Transaksi dapat diedit satu kali." : PESAN_TIDAK_BISA_EDIT}
        </p>
        <AksiPengajuan trx={trx} canUpdate={canUpdate} userId={userId} requesting={requesting} onAjukan={onAjukan} onRiwayat={onRiwayat} />
      </div>
    </div>,
    document.body,
  );
}
