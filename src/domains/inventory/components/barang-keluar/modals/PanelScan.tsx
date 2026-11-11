import { Camera, Plus, ScanLine } from "lucide-react";
import QrCameraScanner from "@/domains/inventory/components/QrCameraScanner";
import { orangeButtonClass } from "../styles";
import type { BarisForm } from "../types";
import type { useScanBarang } from "../useScanBarang";

// Tombol scan/manual, kotak scan USB, kamera, dan ringkasan jumlah yang sudah discan.
export default function PanelScan({
  scan,
  baris,
  pengambilOk,
  onTambahManual,
}: {
  scan: ReturnType<typeof useScanBarang>;
  baris: BarisForm[];
  pengambilOk: boolean;
  onTambahManual: () => void;
}) {
  const {
    scanOpen, scanValue, setScanValue, scanError, setScanError, pendingScans, cameraOn, setCameraOn,
    lockedName, scanRef, bukaScan, tambahKode, onScanKey,
  } = scan;

  return (
    <>
  {/* Daftar barang yang keluar, diisi dengan scan QR barang atau input manual */}
  <div className="flex flex-wrap gap-2">
    <button
      type="button"
      onClick={bukaScan}
      disabled={!pengambilOk}
      className={orangeButtonClass}
    >
      <ScanLine className="w-4 h-4" strokeWidth={2.5} />
      <span>Scan Barang</span>
    </button>
    <button
      type="button"
      onClick={onTambahManual}
      className="flex items-center justify-center gap-2 px-5 py-2.5 border border-[#FF8A00] text-[#FF8A00] font-semibold rounded-xl hover:bg-orange-50 transition-colors text-sm"
    >
      <Plus className="w-4 h-4" strokeWidth={2.5} />
      <span>Input Manual</span>
    </button>
  </div>
  {!pengambilOk && (
    <p className="mt-2 text-xs text-gray-500">
      Isi Nama Pengambil dulu
    </p>
  )}
  {pendingScans > 0 && (
    <p role="status" className="mt-2 text-xs text-gray-500">
      Membaca {pendingScans} scan barang...
    </p>
  )}

  {scanOpen && (
    <div className="flex gap-2 mt-4">
      <div className="relative flex-1">
        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={scanRef}
          type="text"
          autoComplete="off"
          maxLength={191}
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          onKeyDown={onScanKey}
          placeholder="Arahkan scanner ke QR barang..."
          aria-label="Hasil scan"
          className="w-full border-2 border-orange-200 rounded-lg py-3 pl-10 pr-4 text-sm text-gray-800 focus:outline-none focus:border-[#FF8A00]/60 focus:ring-2 focus:ring-[#FF8A00]/20"
        />
      </div>
      {/* Saat kamera sudah menyala tombol tetap bisa dipakai untuk mematikannya, walau nama pengambil kosong */}
      <button
        type="button"
        onClick={() => {
          setScanError("");
          setCameraOn((v) => !v);
        }}
        disabled={!pengambilOk && !cameraOn}
        aria-pressed={cameraOn}
        className={`flex items-center justify-center gap-2 px-4 border-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${cameraOn ? "bg-orange-50 border-orange-300 text-orange-700" : "border-orange-200 text-gray-700 hover:bg-gray-50"}`}
      >
        <Camera className="w-4 h-4" />
        {cameraOn ? "Matikan kamera" : "Kamera"}
      </button>
    </div>
  )}
  {cameraOn && (
    <div className="mt-4">
      <QrCameraScanner
        onScan={(code) => void tambahKode(code)}
        lockedLabel={lockedName}
        rejected={scanError !== ""}
        onFail={(message) => {
          setScanError(message);
          setCameraOn(false);
        }}
      />
    </div>
  )}
  {scanError && (
    <p
      role="alert"
      className="fixed bottom-6 right-6 z-[70] max-w-sm p-3 bg-red-600 text-white text-sm rounded-lg shadow-lg"
    >
      {scanError}
    </p>
  )}
  {baris.length > 0 && (
    <p className="mt-3 text-sm text-gray-700">
      Terscan:{" "}
      <span className="font-bold">
        {baris.reduce((n, b) => n + (Number(b.qty) || 0), 0)}
      </span>{" "}
      item, {baris.length} jenis
    </p>
  )}
    </>
  );
}
