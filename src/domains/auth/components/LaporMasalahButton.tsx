"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ImagePlus, Info, MessageSquareWarning, X } from "lucide-react";
import { createBugReport, listMyBugReports } from "@/domains/superadmin/api";
import type { BugReport, BugReportStatus } from "@/domains/superadmin/types";
import { waktuEdit } from "@/domains/inventory/components/RiwayatEditBarangKeluar";
import { ApiError } from "@/shared/lib/api-client";

const MAX_DESCRIPTION = 2000;
const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
const MAX_FIELD = 500;
const ACCEPT = "image/jpeg,image/png,image/webp";

const statusInfo: Record<BugReportStatus, { label: string; className: string }> = {
  OPEN: { label: "Baru", className: "bg-gray-100 text-gray-600" },
  DIPROSES: { label: "Diproses", className: "bg-amber-100 text-amber-700" },
  SELESAI: { label: "Selesai", className: "bg-green-100 text-green-700" },
};

export default function LaporMasalahButton() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"buat" | "saya">("buat");
  const [mine, setMine] = useState<BugReport[]>([]);
  const [mineLoading, setMineLoading] = useState(false);
  const [mineError, setMineError] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<File | undefined>();
  const [preview, setPreview] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Thumbnail URL is made with the file and revoked when the file is replaced or removed
  const gantiScreenshot = (file?: File) => {
    if (preview) URL.revokeObjectURL(preview);
    setScreenshot(file);
    setPreview(file ? URL.createObjectURL(file) : "");
  };

  const close = () => {
    if (sending) return;
    setOpen(false);
    setError("");
  };

  // Loads on every open of the tab, so a report answered meanwhile shows its IT note
  const loadMine = useCallback(async () => {
    setMineLoading(true);
    setMineError("");
    try {
      const page = await listMyBugReports({ page: 1, pageSize: 20 });
      setMine(page.rows);
    } catch (err) {
      setMineError(err instanceof Error ? err.message : "Gagal memuat laporan.");
    } finally {
      setMineLoading(false);
    }
  }, []);

  const pilihTab = useCallback(
    (next: "buat" | "saya") => {
      setTab(next);
      if (next === "saya") void loadMine();
    },
    [loadMine],
  );

  // Deep link from e.g. a notification: /dashboard/...?laporan=saya
  useEffect(() => {
    if (searchParams.get("laporan") !== "saya") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL is an external trigger; opening the modal is the point
    setOpen(true);
    pilihTab("saya");
    router.replace(pathname);
  }, [searchParams, pathname, router, pilihTab]);

  useEffect(() => {
    if (!open) return;
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
      setSuccess("Laporan terkirim. Terima kasih.");
      setDescription("");
      gantiScreenshot(undefined);
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Gagal mengirim laporan.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setSuccess("");
        }}
        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-gray-600 transition-colors hover:bg-amber-50 hover:text-amber-700"
      >
        <MessageSquareWarning className="h-5 w-5" />
        <span className="font-medium">Laporkan Masalah</span>
      </button>
      {success && !open && (
        <p role="status" className="mx-4 mt-1 flex items-center gap-1.5 text-xs text-green-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {success}
        </p>
      )}
      {open &&
        createPortal(
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

              <div role="tablist" aria-label="Laporan" className="flex gap-1 border-b border-gray-100 px-6">
                {(
                  [
                    ["buat", "Buat Laporan"],
                    ["saya", "Laporan Saya"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    id={`lapor-tab-${value}`}
                    aria-selected={tab === value}
                    aria-controls={`lapor-panel-${value}`}
                    onClick={() => pilihTab(value)}
                    className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold ${
                      tab === value ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div
                role="tabpanel"
                id="lapor-panel-buat"
                aria-labelledby="lapor-tab-buat"
                hidden={tab !== "buat"}
                className="space-y-5 px-6 py-5"
              >
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

              {tab === "buat" && (
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
              )}

              <div
                role="tabpanel"
                id="lapor-panel-saya"
                aria-labelledby="lapor-tab-saya"
                hidden={tab !== "saya"}
                className="max-h-96 space-y-3 overflow-y-auto px-6 py-5"
              >
                {mineLoading && <p className="text-center text-sm text-gray-400">Memuat laporan...</p>}
                {!mineLoading && mineError && (
                  <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                    {mineError}
                  </p>
                )}
                {!mineLoading && !mineError && mine.length === 0 && (
                  <p className="text-center text-sm text-gray-400">Belum ada laporan</p>
                )}
                {!mineLoading &&
                  !mineError &&
                  mine.map((r) => (
                    <div key={r.id} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
                        <span>{waktuEdit(r.createdAt)} WIB</span>
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${statusInfo[r.status].className}`}>
                          {statusInfo[r.status].label}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-gray-800">{r.description}</p>
                      {r.itNote && (
                        <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2">
                          <p className="text-xs font-semibold text-blue-700">Catatan IT</p>
                          <p className="whitespace-pre-wrap text-sm text-blue-900">{r.itNote}</p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </form>
          </div>,
          document.body,
        )}
    </div>
  );
}
