"use client";

import React, { useId, useRef, useState } from "react";
import { FileSpreadsheet, Upload, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  // Frontend menyerahkan File asli; proses upload/API dihubungkan melalui callback ini.
  onSelectFile: (file: File) => void | Promise<void>;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function validasiFileImpor(file: File): string | null {
  if (!/\.(xlsx|xls)$/i.test(file.name))
    return "Pilih file Excel dengan format .xlsx atau .xls.";
  if (file.size === 0) return "File kosong. Pilih file Excel yang berisi data.";
  if (file.size > MAX_FILE_SIZE) return "Ukuran file maksimal 10 MB.";
  return null;
}

export default function ImportBarangKeluarModal({
  open,
  onClose,
  onSelectFile,
}: Props) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const pilihFile = (files: FileList | null) => {
    if (!files || files.length === 0 || submitting) return;
    setFile(null);
    if (files.length !== 1) {
      setError("Pilih satu file Excel setiap kali impor.");
      return;
    }
    const selected = files.item(0);
    if (!selected) return;
    const message = validasiFileImpor(selected);
    setError(message ?? "");
    if (!message) setFile(selected);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!file) {
      setError("Pilih file Excel terlebih dahulu.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onSelectFile(file);
      setSubmitting(false);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "File belum dapat diproses. Silakan coba lagi.",
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4">
      <form
        onSubmit={handleSubmit}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !submitting) {
            event.preventDefault();
            onClose();
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg max-h-full overflow-y-auto rounded-xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Tutup pilihan file impor"
          className="absolute top-5 right-5 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 id={titleId} className="pr-10 text-lg font-extrabold text-gray-900">
          Import Barang Keluar
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Pilih file Excel yang berisi data barang keluar.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          disabled={submitting}
          aria-label="File Excel barang keluar"
          className="sr-only"
          onChange={(event) => {
            pilihFile(event.target.files);
            event.target.value = "";
          }}
        />
        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!submitting) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            pilihFile(event.dataTransfer.files);
          }}
          className={`mt-6 rounded-xl border-2 border-dashed p-6 text-center ${dragging ? "border-orange-500 bg-orange-50" : "border-gray-300 bg-gray-50"}`}
        >
          <Upload className="mx-auto h-9 w-9 text-[#FF8A00]" />
          <p className="mt-3 text-sm text-gray-700">
            Tarik file ke sini atau pilih dari perangkat.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Format .xlsx / .xls · Maksimal 10 MB
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={submitting}
            className="mt-4 rounded-lg border border-[#FF8A00] px-4 py-2 text-sm font-semibold text-[#FF8A00] hover:bg-orange-50 disabled:opacity-50"
          >
            Pilih File
          </button>
        </div>

        {file && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-gray-200 p-3">
            <FileSpreadsheet className="h-6 w-6 shrink-0 text-green-600" />
            <div className="min-w-0 flex-1">
              <p className="break-all text-sm font-semibold text-gray-800">
                {file.name}
              </p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024).toLocaleString("id-ID", {
                  maximumFractionDigits: 1,
                })}{" "}
                KB
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setError("");
              }}
              disabled={submitting}
              aria-label="Hapus pilihan file"
              className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="mt-4 whitespace-pre-line rounded-lg bg-red-50 p-3 text-sm text-red-600"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={!file || submitting}
            className="rounded-xl bg-[#FF8A00] px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Memproses..." : "Gunakan File"}
          </button>
        </div>
      </form>
    </div>
  );
}
