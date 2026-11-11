"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Info, MessageSquareWarning, X } from "lucide-react";
import { createBugReport } from "@/domains/superadmin/api";
import { ApiError } from "@/shared/lib/api-client";

const MAX_DESCRIPTION = 2000;
const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
const MAX_FIELD = 500;
const ACCEPT = "image/jpeg,image/png,image/webp";

export default function LaporMasalahModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<File | undefined>();
  const [preview, setPreview] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Thumbnail URL is made with the file and revoked when the file is replaced or removed
  const gantiScreenshot = (file?: File) => {
    if (preview) URL.revokeObjectURL(preview);
    setScreenshot(file);
    setPreview(file ? URL.createObjectURL(file) : "");
  };

  const close = () => {
    if (!sending) onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const pilihFile = (file?: File) => {
    setError("");
    if (file && !ACCEPT.split(",").includes(file.type)) {
      setError("Screenshot harus berupa JPEG, PNG, atau WebP.");
      return;
    }
    gantiScreenshot(file);
  };

  // Ctrl+V on the form attaches a copied screenshot (PrtScn / Snipping Tool)
  const onPaste = (e: React.ClipboardEvent) => {
    const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
    if (file) {
      e.preventDefault();
      pilihFile(file);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || sending) return;
    if (screenshot && screenshot.size > MAX_SCREENSHOT_BYTES) {
      setError("Screenshot maksimal 10 MB (JPEG/PNG/WebP).");
      return;
    }
    setSending(true);
    setError("");
    try {
      await createBugReport({
        description: description.trim(),
        pageUrl: window.location.href.slice(0, MAX_FIELD),
        userAgent: navigator.userAgent.slice(0, MAX_FIELD),
        screenshot,
      });
      onSent();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Gagal mengirim laporan.");
    } finally {
      setSending(false);
    }
  };

  return createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
            onMouseDown={(e) => e.target === e.currentTarget && close()}
          >
            <form
              role="dialog"
              aria-modal="true"
              aria-labelledby="lapor-masalah-title"
              onSubmit={submit}
              onPaste={onPaste}
              className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
            >
              <div className="flex items-start gap-3 border-b border-gray-100 px-6 py-4">
                <div className="rounded-full bg-amber-100 p-2 text-amber-600">
                  <MessageSquareWarning className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h2 id="lapor-masalah-title" className="text-base font-bold text-gray-900">
                    Laporkan Masalah
                  </h2>
                  <p className="text-sm text-gray-500">Laporan dikirim ke tim IT (superadmin).</p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  disabled={sending}
                  aria-label="Tutup"
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 px-6 py-5">
                <div>
                  <label htmlFor="lapor-deskripsi" className="mb-1.5 block text-sm font-semibold text-gray-800">
                    Deskripsi
                  </label>
                  <textarea
                    id="lapor-deskripsi"
                    required
                    autoFocus
                    maxLength={MAX_DESCRIPTION}
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={"Apa yang terjadi? Apa yang sedang Anda lakukan?\nContoh: Klik Simpan di Barang Keluar, muncul error \"Stok tidak cukup\" padahal stok 20."}
                    className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="mt-1 text-right text-xs text-gray-400">
                    {description.length}/{MAX_DESCRIPTION}
                  </p>
                </div>

                <div>
                  <span className="mb-1.5 block text-sm font-semibold text-gray-800">Screenshot (opsional)</span>
                  {screenshot ? (
                    <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-2">
                      {preview && (
                        // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                        <img src={preview} alt="Pratinjau screenshot" className="h-16 w-24 rounded-lg object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-gray-800">{screenshot.name || "Tempelan clipboard"}</p>
                        <p className="text-xs text-gray-500">{(screenshot.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => gantiScreenshot(undefined)}
                        className="rounded-lg px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        Hapus
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-gray-200 px-4 py-5 text-center transition-colors hover:border-blue-300 hover:bg-blue-50/40 focus-within:border-blue-400">
                      <ImagePlus className="h-6 w-6 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Pilih gambar atau tekan Ctrl+V</span>
                      <span className="text-xs text-gray-400">JPEG, PNG, WebP. Maksimal 10 MB.</span>
                      <input
                        type="file"
                        accept={ACCEPT}
                        aria-label="Screenshot (opsional)"
                        onChange={(e) => pilihFile(e.target.files?.[0])}
                        className="sr-only"
                      />
                    </label>
                  )}
                </div>

                <p className="flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Alamat halaman ini, nama akun, dan jenis browser ikut terkirim otomatis.
                </p>

                {error && (
                  <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </p>
                )}
              </div>

                <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
                  <button
                    type="button"
                    onClick={close}
                    disabled={sending}
                    className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={sending || !description.trim()}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sending ? "Mengirim..." : "Kirim Laporan"}
                  </button>
                </div>
            </form>
          </div>,
          document.body,
        );
}
