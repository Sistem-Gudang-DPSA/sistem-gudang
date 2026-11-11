import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import type { OutboundRow } from "@/domains/inventory/types";
import { batasEdit, bisaEdit, tampilWaktu } from "./edit-rules";

// Jadwalkan persis pada akhir 24 jam agar tombol hilang tanpa memuat ulang halaman.
function WithNow({ deadline, children }: { deadline: number; children: (now: number) => ReactNode }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const remaining = deadline - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), remaining);
    return () => clearTimeout(timer);
  }, [deadline]);
  return <>{children(now)}</>;
}

export function TombolEdit({
  trx,
  lineIndex,
  canUpdate,
  userId,
  onEdit,
  onBuka,
}: {
  trx: OutboundRow;
  lineIndex: number;
  canUpdate: boolean;
  userId?: number;
  onEdit: (trx: OutboundRow, lineIndex: number) => void;
  // Dipanggil sebelum form edit dibuka, mis. untuk menutup pop-up rincian.
  onBuka?: () => void;
}) {
  if (trx.cancelledAt || !canUpdate || !trx.lines[lineIndex] || !bisaEdit(trx, userId)) return null;
  return (
    <button
      type="button"
      onClick={() => {
        onBuka?.();
        onEdit(trx, lineIndex);
      }}
      aria-label={`Edit barang keluar ${trx.id} ${trx.lines[lineIndex].itemName}`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FF8A00] text-[#FF8A00] text-xs font-semibold hover:bg-orange-50"
    >
      <Pencil className="w-3.5 h-3.5" />
      Edit
    </button>
  );
}

export function AksiPengajuan({
  trx,
  canUpdate,
  userId,
  requesting,
  onAjukan,
  onRiwayat,
}: {
  trx: OutboundRow;
  canUpdate: boolean;
  userId?: number;
  requesting: number | null;
  onAjukan: (trx: OutboundRow) => void;
  onRiwayat: (id: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {canUpdate && !trx.cancelledAt && !trx.editRequest && (
        <WithNow deadline={batasEdit(trx)}>
          {(now) =>
            now < batasEdit(trx) ? (
              <button
                type="button"
                disabled={requesting !== null}
                onClick={() => onAjukan(trx)}
                title={`Ajukan edit sebelum ${tampilWaktu(batasEdit(trx))}`}
                aria-label={`Ajukan edit barang keluar ${trx.id}`}
                className="rounded-lg border border-orange-400 px-3 py-1.5 text-xs font-semibold text-orange-600 disabled:opacity-50"
              >
                {requesting === trx.id ? "Mengajukan..." : "Ajukan Edit"}
              </button>
            ) : null
          }
        </WithNow>
      )}
      {trx.editRequest?.status === "PENDING" && (
        <span className="text-xs text-amber-700">Menunggu persetujuan</span>
      )}
      {trx.editRequest?.status === "REJECTED" && (
        <span className="text-xs text-red-600">Pengajuan ditolak</span>
      )}
      {trx.editRequest?.status === "USED" && (
        <span className="text-xs text-gray-500">Sudah diedit 1 kali</span>
      )}
      {trx.editRequest?.status === "APPROVED" && !bisaEdit(trx, userId) && (
        <span className="text-xs text-green-700">Disetujui untuk pengaju</span>
      )}
      {trx.editRequest && (
        <button
          type="button"
          onClick={() => onRiwayat(trx.id)}
          aria-label={`Riwayat edit barang keluar ${trx.id}`}
          className="text-xs text-blue-600 underline"
        >
          Riwayat Edit
        </button>
      )}
    </div>
  );
}
