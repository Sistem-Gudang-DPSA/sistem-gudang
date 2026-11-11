"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Ban, X } from "lucide-react";
import { useAuthUser } from "@/domains/auth/user-context";
import { ApiError } from "@/shared/lib/api-client";

export const MAX_ALASAN = 500;

type Cancelled = { cancelledAt: string | null; cancelledByName: string | null; cancelReason: string | null };

const waktuWib = (iso: string) => new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB";

export function BadgeDibatalkan({ row }: { row: Cancelled }) {
  if (!row.cancelledAt) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
      Dibatalkan superadmin
    </span>
  );
}

// Reason, canceller and time, shown in a detail view of a cancelled transaction.
export function InfoPembatalan({ row }: { row: Cancelled }) {
  if (!row.cancelledAt) return null;
  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <BadgeDibatalkan row={row} />
      <p className="mt-2">Alasan: {row.cancelReason ?? "-"}</p>
      <p className="text-xs">
        Oleh {row.cancelledByName ?? "-"} pada {waktuWib(row.cancelledAt)}
      </p>
    </div>
  );
}

// "Batalkan" button (superadmin, not yet cancelled) with its confirmation modal and success toast.
export default function BatalkanTransaksi<T extends Cancelled>({
  row,
  cancel,
  onDone,
  label,
}: {
  row: T & { id: number };
  cancel: (id: number, reason: string) => Promise<T>;
  onDone: (updated: T) => void;
  label: string;
}) {
  const user = useAuthUser();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) return setError("Alasan pembatalan wajib diisi.");
    setSaving(true);
    setError("");
    try {
      const updated = await cancel(row.id, trimmed);
      setOpen(false);
      setReason("");
      setToast(`${label} dibatalkan.`);
      onDone(updated);
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Gagal membatalkan transaksi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {user?.isSuperadmin && !row.cancelledAt && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
        >
          <Ban className="h-3.5 w-3.5" />
          Batalkan
        </button>
      )}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
            <form
              role="dialog"
              aria-modal="true"
              aria-labelledby="batalkan-judul"
              onSubmit={submit}
              className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup"
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
              <h2 id="batalkan-judul" className="mb-2 text-base font-extrabold text-black">
                Batalkan {label}
              </h2>
              <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                Stok akan disesuaikan. Transaksi yang dibatalkan tidak dapat dikembalikan.
              </p>
              <label htmlFor="alasan-pembatalan" className="mb-1 block text-sm font-medium text-gray-700">
                Alasan pembatalan
              </label>
              <textarea
                id="alasan-pembatalan"
                value={reason}
                maxLength={MAX_ALASAN}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 p-2 text-sm text-black"
              />
              <p className="text-right text-xs text-gray-500">
                {reason.length}/{MAX_ALASAN}
              </p>
              {error && (
                <p role="alert" className="mt-2 text-sm text-red-600">
                  {error}
                </p>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || !reason.trim()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Membatalkan..." : "Batalkan Transaksi"}
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}
      {toast &&
        createPortal(
          <div role="status" className="fixed bottom-6 right-6 z-[80] rounded-lg bg-green-600 px-4 py-2 text-sm text-white shadow-lg">
            {toast}
          </div>,
          document.body,
        )}
    </>
  );
}
