"use client";

import { useEffect, useRef, useState } from 'react';

// The scan box covers this share of the frame's shorter side. Only QRs inside it are decoded.
const SCAN_RATIO = 2 / 3;

// Same square as the overlay: the frame is shown with object-fit cover, so the visible square is the centred one.
const scanRegion = (video: HTMLVideoElement) => {
  const side = Math.round(Math.min(video.videoWidth, video.videoHeight) * SCAN_RATIO);
  return {
    x: Math.round((video.videoWidth - side) / 2),
    y: Math.round((video.videoHeight - side) / 2),
    width: side,
    height: side,
  };
};

type Props = {
  // Called once per lock, with the first QR read. Other QRs are ignored until "Scan lagi".
  onScan: (code: string) => void;
  // Item name the parent looked up for the locked code, shown once it is known.
  lockedLabel?: string;
  // The parent rejected the locked code (e.g. unknown). Shows the red state.
  rejected?: boolean;
  // The camera could not start. The parent should turn the camera off.
  onFail: (message: string) => void;
};

// Phone camera scanner. Needs HTTPS (or localhost) for getUserMedia. Mount it to start the camera, unmount it to stop.
export default function QrCameraScanner({ onScan, lockedLabel, rejected = false, onFail }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const onFailRef = useRef(onFail);
  const lockedRef = useRef(false);
  const [locked, setLocked] = useState<string | null>(null);

  useEffect(() => { onScanRef.current = onScan; onFailRef.current = onFail; });

  useEffect(() => {
    let stop = () => {};
    let cancelled = false;
    (async () => {
      if (!window.isSecureContext) {
        onFailRef.current('Kamera hanya jalan di HTTPS atau localhost.');
        return;
      }
      try {
        // qr-scanner is loaded only when the camera is opened.
        const { default: QrScanner } = await import('qr-scanner');
        if (cancelled || !videoRef.current) return;
        const scanner = new QrScanner(
          videoRef.current,
          (result) => {
            const code = result.data.trim();
            if (!code || lockedRef.current) return;
            // Set the ref first: a second read in the same frame must not lock again.
            lockedRef.current = true;
            setLocked(code);
            onScanRef.current(code);
          },
          { preferredCamera: 'environment', returnDetailedScanResult: true, calculateScanRegion: scanRegion },
        );
        stop = () => { scanner.stop(); scanner.destroy(); };
        await scanner.start();
        if (cancelled) stop();
      } catch {
        if (!cancelled) onFailRef.current('Kamera tidak bisa dibuka. Periksa izin kamera di browser.');
      }
    })();
    return () => { cancelled = true; stop(); };
  }, []);

  const rescan = () => { lockedRef.current = false; setLocked(null); };

  const state = locked === null ? 'idle' : rejected ? 'rejected' : 'locked';
  const box = {
    idle: 'border-2 border-dashed border-white',
    locked: 'border-4 border-solid border-green-500',
    rejected: 'border-4 border-solid border-red-500',
  }[state];

  return (
    <div className="mb-4 w-full max-w-sm">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
        <video ref={videoRef} muted playsInline className="absolute inset-0 h-full w-full object-cover" />
        <div className={`pointer-events-none absolute left-1/2 top-1/2 aspect-square w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-lg ${box}`} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-sm">
        {state === 'idle' && <p className="text-gray-600">Arahkan QR ke dalam kotak</p>}
        {state === 'locked' && (
          <p className="font-semibold text-green-700">
            Terbaca: <span className="font-mono">{locked}</span>{lockedLabel && ` · ${lockedLabel}`}
          </p>
        )}
        {state === 'rejected' && <p role="alert" className="font-semibold text-red-600">Kode tidak bisa dipakai. Tekan Scan lagi.</p>}
        {state !== 'idle' && (
          <button type="button" onClick={rescan} className="shrink-0 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Scan lagi
          </button>
        )}
      </div>
    </div>
  );
}
