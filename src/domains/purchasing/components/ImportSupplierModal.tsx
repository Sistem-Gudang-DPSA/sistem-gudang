"use client";

import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { FileDown, FileSpreadsheet, Upload } from 'lucide-react';
import Modal from '@/shared/components/Modal';
import { ApiError } from '@/shared/lib/api-client';
import {
    parseSupplierRow, supplierTemplateExample, supplierTemplateHeaders, type SupplierImportRow,
} from '@/domains/purchasing/modal/supplier';

const MAX_BYTES = 5 * 1024 * 1024;
const PREVIEW_ROWS = 10;

export default function ImportSupplierModal({ onClose, onNext }: {
    onClose: () => void;
    onNext: (rows: SupplierImportRow[]) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState('');
    const [rows, setRows] = useState<SupplierImportRow[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const downloadTemplate = () => {
        const sheet = XLSX.utils.aoa_to_sheet([supplierTemplateHeaders, supplierTemplateExample]);
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheet, 'Template');
        XLSX.writeFile(book, 'Template_Import_Supplier.xlsx');
    };

    const handleFile = async (file: File | null) => {
        setRows([]);
        setErrors([]);
        setError('');
        setFileName(file?.name ?? '');
        if (!file) return;
        if (!/\.(xlsx|xls)$/i.test(file.name)) {
            setError('File harus berformat .xlsx atau .xls');
            return;
        }
        if (file.size > MAX_BYTES) {
            setError('Ukuran file maksimal 5 MB');
            return;
        }
        setBusy(true);
        try {
            const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
            const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[book.SheetNames[0]], { defval: '' });
            if (raw.length === 0) {
                setError('File kosong atau tidak ada data.');
                return;
            }
            const ok: SupplierImportRow[] = [];
            const errs: string[] = [];
            raw.forEach((r, i) => {
                try {
                    ok.push(parseSupplierRow(r, i + 2));
                } catch (e) {
                    errs.push(e instanceof Error ? e.message : `Baris ${i + 2} tidak valid`);
                }
            });
            setRows(ok);
            setErrors(errs);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Gagal membaca file. Pastikan formatnya sesuai template.');
        } finally {
            setBusy(false);
        }
    };

    const canNext = rows.length > 0 && errors.length === 0 && !busy;

    return (
        <Modal
            title="Import Data Supplier"
            onClose={onClose}
            size="lg"
            footer={
                <>
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                        Batal
                    </button>
                    <button type="button" disabled={!canNext} onClick={() => onNext(rows)}
                        className="px-5 py-2 text-sm font-semibold text-white bg-[#FF8A00] rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed">
                        Lanjut ke Mapping
                    </button>
                </>
            }
        >
            <div className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-xl mb-4">
                <div>
                    <p className="text-sm font-semibold text-gray-800">1. Download template</p>
                    <p className="text-xs text-gray-500">Isi data sesuai format kolom template.</p>
                </div>
                <button type="button" onClick={downloadTemplate}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100">
                    <FileDown className="w-4 h-4" /> Template
                </button>
            </div>

            <div className="p-3 border border-gray-200 rounded-xl mb-4">
                <p className="text-sm font-semibold text-gray-800 mb-2">2. Pilih file</p>
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#FF8A00] bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 disabled:opacity-50">
                        <Upload className="w-4 h-4" /> Pilih file
                    </button>
                    <span className="text-xs text-gray-500 truncate">{fileName || 'Belum ada file dipilih'}</span>
                    <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
                        onChange={(e) => { handleFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
                </div>
                {busy && <p className="mt-2 text-xs text-gray-500">Membaca file...</p>}
                {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
                {rows.length > 0 && errors.length === 0 && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-green-700">
                        <FileSpreadsheet className="w-4 h-4" /> {rows.length} baris siap diproses
                    </p>
                )}
            </div>

            {rows.length > 0 && (
                <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-800 mb-2">3. Preview ({rows.length} baris, {Math.min(PREVIEW_ROWS, rows.length)} ditampilkan)</p>
                    <div className="max-h-64 overflow-auto border border-gray-200 rounded-xl">
                        <table className="w-full text-xs text-left whitespace-nowrap">
                            <thead>
                                <tr>
                                    <th className="px-3 py-2">Nama Supplier</th>
                                    <th className="px-3 py-2">Alamat</th>
                                    <th className="px-3 py-2">NPWP Badan</th>
                                    <th className="px-3 py-2">NPWP Perorangan</th>
                                    <th className="px-3 py-2">NIK</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.slice(0, PREVIEW_ROWS).map((r, i) => (
                                    <tr key={i} className="border-t border-gray-100">
                                        <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
                                        <td className="px-3 py-2">{r.address}</td>
                                        <td className="px-3 py-2 font-mono">{r.npwp}</td>
                                        <td className="px-3 py-2 font-mono">{r.npwpPerorangan}</td>
                                        <td className="px-3 py-2 font-mono">{r.nik}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {errors.length > 0 && (
                <ul className="max-h-32 overflow-y-auto p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl list-disc list-inside">
                    {errors.slice(0, 20).map((er, i) => <li key={i}>{er}</li>)}
                    {errors.length > 20 && <li>...dan {errors.length - 20} error lain</li>}
                </ul>
            )}
        </Modal>
    );
}