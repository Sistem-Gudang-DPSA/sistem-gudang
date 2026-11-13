"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Plus, Printer, ScanLine, X } from 'lucide-react';
import { displayDate } from '@/domains/inventory/date';
import SearchableSelect from '@/shared/components/SearchableSelect';
import QrCameraScanner from '../QrCameraScanner';
import BarisBarangMasukTable from './BarisBarangMasukTable';
import { inputClass, labelClass, primaryClass, rowClass, secondaryClass } from './styles';
import { useFormBarangMasuk, type SaveBarangMasuk } from './useFormBarangMasuk';

function WaktuSekarang() {
  const [waktu, setWaktu] = useState('');
  useEffect(() => {
    const update = () => setWaktu(new Date().toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);
  return <p className="text-xs text-gray-900">Waktu Sekarang : <span className="font-mono font-semibold">{waktu}</span></p>;
}

export default function FormBarangMasukModal({ onClose, onSave }: { onClose: () => void; onSave: SaveBarangMasuk }) {
  const { scanRef, ...f } = useFormBarangMasuk(onSave);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (f.preview || !f.scanOpen) headingRef.current?.focus(); }, [f.preview, f.scanOpen]);
  const visibleError = f.error || (!f.preview ? f.supplierSearch.error || (f.baris.some((row) => row.manual) ? f.itemSearch.error : '') : '');

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4">
      <form role="dialog" aria-modal="true" aria-labelledby="barang-masuk-title" aria-describedby="barang-masuk-qc-note"
        noValidate onSubmit={(event) => { event.preventDefault(); f.openPreview(false); }}
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-full overflow-y-auto p-6 sm:p-8 animate-in zoom-in-95 duration-200">
        <fieldset disabled={f.saving} className="min-w-0 border-0 p-0 m-0">
          <button type="button" aria-label="Tutup" onClick={onClose} disabled={f.saving}
            className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50">
            <X className="h-4 w-4" />
          </button>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 mb-6 pr-10">
            <h2 ref={headingRef} tabIndex={-1} id="barang-masuk-title" className="text-[18px] font-extrabold text-black tracking-wide outline-none">
              {f.preview ? 'PREVIEW BARANG MASUK' : 'FORM BARANG MASUK'}
            </h2>
            <p className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-800">Jumlah Barang : {f.baris.length}</p>
          </div>
          <p id="barang-masuk-qc-note" className="mb-5 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-xs text-orange-900">
            <strong>Catatan:</strong> Barang masuk yang diinput adalah barang yang sudah lolos QC.
          </p>

          {f.preview ? (
            <>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-4 mb-4 text-sm">
                <div className={rowClass}><dt className={labelClass}>Nama Supplier</dt><dd className="font-semibold text-gray-900">{f.supplier?.name}</dd></div>
                <div className={rowClass}><dt className={labelClass}>Tanggal</dt><dd className="font-semibold text-gray-900">{displayDate(f.tanggal)}</dd></div>
              </dl>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-4 mb-6">
              <div className={rowClass}>
                <span className={labelClass}>Nama Supplier</span>
                <SearchableSelect value={f.supplier ? String(f.supplier.id) : ''} options={f.pilihanSupplier}
                  onChange={f.pilihSupplier} onSearch={f.supplierSearch.onSearch} pending={f.supplierSearch.pending}
                  aria-label="Nama Supplier" placeholder="Pilih supplier" emptyText="Supplier tidak ditemukan" className={inputClass} />
              </div>
              <div className={rowClass}>
                <label htmlFor="barang-masuk-tanggal" className={labelClass}>Tanggal</label>
                <input id="barang-masuk-tanggal" type="date" value={f.tanggal}
                  onChange={(event) => f.setTanggal(event.target.value)} className={inputClass} />
              </div>
            </div>
          )}

          {!f.preview && (
            <>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={!f.supplier} onClick={f.bukaScan} className={primaryClass}>
                  <ScanLine className="w-4 h-4" /> Scan Barang
                </button>
                <button type="button" disabled={!f.supplier} onClick={f.tambahManual} className={secondaryClass}>
                  <Plus className="w-4 h-4" /> Input Manual
                </button>
              </div>
              {!f.supplier && <p className="mt-2 text-xs text-gray-500">Pilih nama supplier dulu</p>}
              {f.scanOpen && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <input ref={scanRef} type="text" aria-label="Hasil scan" value={f.scanValue} autoComplete="off" maxLength={191}
                    placeholder="Arahkan scanner ke QR barang..."
                    onChange={(event) => { f.setScanValue(event.target.value); f.setScanError(''); }}
                    onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); f.bacaInputScan(); } }}
                    className={`${inputClass} flex-1 min-w-40 border-2 border-orange-200 py-3`} />
                  <button type="button" onClick={f.bacaInputScan} className={secondaryClass}>Baca Kode</button>
                  <button type="button" aria-pressed={f.cameraOn} onClick={() => { f.setScanError(''); f.setCameraOn((current) => !current); }} className={secondaryClass}>
                    <Camera className="w-4 h-4" /> {f.cameraOn ? 'Matikan kamera' : 'Kamera'}
                  </button>
                </div>
              )}
              {f.cameraOn && <div className="mt-4"><QrCameraScanner onScan={(code) => void f.readCode(code)} lockedLabel={f.lockedName} rejected={!!f.scanError}
                onFail={(message) => { f.setScanError(message); f.setCameraOn(false); }} /></div>}
              {f.pendingScans > 0 && <p role="status" className="mt-2 text-xs text-gray-500">Membaca {f.pendingScans} scan barang...</p>}
              {f.scanError && <p role="alert" className="mt-3 text-sm text-red-600">{f.scanError}</p>}
            </>
          )}

          <BarisBarangMasukTable f={f} />
          {visibleError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{visibleError}</p>}

          <div className="flex flex-wrap items-center justify-between gap-4 mt-3">
            <WaktuSekarang />
            <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
              {f.preview ? (
                <>
                  <button type="button" disabled={f.saving} onClick={f.kembaliEdit} className={secondaryClass}>Kembali Edit</button>
                  <button type="button" disabled={f.saving} onClick={() => void f.confirmSave()} className={primaryClass}>
                    {f.printAfter && <Printer className="w-4 h-4" />}
                    {f.saving ? 'Menyimpan...' : f.printAfter ? 'Konfirmasi + Cetak' : 'Konfirmasi Simpan'}
                  </button>
                </>
              ) : (
                <>
                  <button type="submit" disabled={f.pendingScans > 0} className={secondaryClass}>Simpan</button>
                  <button type="button" disabled={f.pendingScans > 0} onClick={() => f.openPreview(true)} className={primaryClass}>
                    <Printer className="w-4 h-4" /> Simpan + Cetak
                  </button>
                </>
              )}
            </div>
          </div>
          <p className="mt-3 mb-4 text-sm text-gray-500">Periksa semua barang sebelum disimpan. Gunakan Kembali Edit jika ada yang perlu diperbaiki.</p>
        </fieldset>
      </form>
    </div>,
    document.body,
  );
}
