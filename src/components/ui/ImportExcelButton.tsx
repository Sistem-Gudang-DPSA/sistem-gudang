// components/ui/ImportExcelButton.tsx
"use client";

import { useRef, useState } from 'react';
import { FileDown, FileSpreadsheet, Upload, X } from 'lucide-react';

type Props<T> = {
  title?: string;
  templateHeaders: string[];
  templateExample?: (string | number)[];
  templateFilename: string;
  parseRow: (row: Record<string, unknown>, rowNumber: number) => T;
  onSave: (rows: T[]) => Promise<void>;
  onSuccess?: () => void;
};

export function ImportExcelButton<T>({
  title = 'Import Excel',
  templateHeaders,
  templateExample,
  templateFilename,
  parseRow,
  onSave,
  onSuccess,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<T[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    setFile(null);
    setRows([]);
    setErrors([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const data = [templateHeaders, ...(templateExample ? [templateExample] : [])];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Template');
    XLSX.writeFile(book, templateFilename);
  };

  const handleFile = async (f: File | null) => {
    setFile(f);
    setRows([]);
    setErrors([]);
    if (!f) return;

    if (!/\.(xlsx|xls)$/i.test(f.name)) {
      setErrors(['File harus berformat .xlsx atau .xls']);
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setErrors(['Ukuran file maksimal 5 MB']);
      return;
    }

    try {
      const XLSX = await import('xlsx');
      const buffer = await f.arrayBuffer();
      const book = XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheet = book.Sheets[book.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      if (raw.length === 0) {
        setErrors(['File kosong atau tidak ada data.']);
        return;
      }

      const parsed: T[] = [];
      const errs: string[] = [];
      raw.forEach((r, i) => {
        try {
          parsed.push(parseRow(r, i + 2)); // +2: baris 1 = header
        } catch (e) {
          errs.push(e instanceof Error ? e.message : `Baris ${i + 2} tidak valid`);
        }
      });
      setRows(parsed);
      setErrors(errs);
    } catch {
      setErrors(['Gagal membaca file. Pastikan formatnya sesuai template.']);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(rows);
      onSuccess?.();
      close();
    } catch (e) {
      setErrors([e instanceof Error ? e.message : 'Gagal menyimpan data.']);
    } finally {
      setSaving(false);
    }
  };

  const canSave = rows.length > 0 && errors.length === 0 && !saving;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
      >
        <Upload className="w-4 h-4" />
        <span className="hidden sm:inline">Import Excel</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">{title}</h2>
              <button type="button" onClick={close} aria-label="Tutup" className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Langkah 1 */}
              <div className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-gray-800">1. Download template</p>
                  <p className="text-xs text-gray-500">Isi data sesuai format template.</p>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                >
                  <FileDown className="w-4 h-4" /> Template
                </button>
              </div>

              {/* Langkah 2 */}
              <div className="p-3 border border-gray-200 rounded-xl">
                <p className="text-sm font-semibold text-gray-800 mb-2">2. Pilih file</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-orange-50 file:text-[#FF8A00] file:font-medium hover:file:bg-orange-100"
                />
                {file && rows.length > 0 && errors.length === 0 && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-green-700">
                    <FileSpreadsheet className="w-4 h-4" /> {rows.length} baris siap disimpan
                  </p>
                )}
              </div>

              {errors.length > 0 && (
                <ul className="max-h-32 overflow-y-auto p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl list-disc list-inside">
                  {errors.slice(0, 20).map((er, i) => <li key={i}>{er}</li>)}
                  {errors.length > 20 && <li>...dan {errors.length - 20} error lain</li>}
                </ul>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
              <button type="button" onClick={close} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#FF8A00] rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}