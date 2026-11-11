"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Ban, X } from "lucide-react";
import { cancelApproval } from "@/domains/ppic/api";
import { MAX_ALASAN } from "@/domains/inventory/components/BatalkanTransaksi";

// "Batalkan" button of a purchase request with its confirmation dialog. The reason is optional.
// The caller decides whether the button may be shown.
export default function BatalkanPermintaan({ id, onDone }: { id: number; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await cancelApproval(id, reason.trim() || undefined);
      setOpen(false);
      setReason("");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membatalkan permintaan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
      >
        <Ban className="h-3.5 w-3.5" />
        Batalkan
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
            <form
              role="dialog"
              aria-modal="true"
              aria-labelledby="batalkan-permintaan-judul"
              onSubmit={submit}
              className="relative w-full max-w-md rounded-xl bg-white p-6 text-left shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup"
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
              <h2 id="batalkan-permintaan-judul" className="mb-2 text-base font-extrabold text-black">
                Batalkan Permintaan Pembelian
              </h2>
              <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                Permintaan yang dibatalkan tidak dapat dikembalikan.
              </p>
              <label htmlFor="alasan-batal-permintaan" className="mb-1 block text-sm font-medium text-gray-700">
                Alasan pembatalan (opsional)
              </label>
              <textarea
                id="alasan-batal-permintaan"
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
                  disabled={saving}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Membatalkan..." : "Batalkan Permintaan"}
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </>
  );
}
