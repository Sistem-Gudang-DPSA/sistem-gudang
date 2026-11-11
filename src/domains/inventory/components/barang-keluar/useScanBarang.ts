import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import { getItemByCode } from "@/domains/inventory/api";
import { beepFail, beepOk } from "@/domains/inventory/beep";
import { ApiError } from "@/shared/lib/api-client";
import { randomId } from "@/shared/lib/random-id";
import { tambahSatu } from "./form-utils";
import type { BarisForm } from "./types";

type Props = {
  pengambil: string;
  baris: BarisForm[];
  setBaris: (fn: (baris: BarisForm[]) => BarisForm[]) => void;
  // Form sedang menyimpan: scan baru diabaikan.
  submittingRef: RefObject<boolean>;
};

// Scan barang (USB scanner atau kamera) ke baris form. Scan bisa datang lebih cepat dari render dan
// bisa kembali setelah form ditutup, jadi pengecekannya memakai ref: sesi scan berganti tiap form dibuka/ditutup.
export function useScanBarang({ pengambil, baris, setBaris, submittingRef }: Props) {
  const [scanOpen, setScanOpen] = useState(false);
  const [scanValue, setScanValue] = useState("");
  const [scanError, setScanError] = useState("");
  const [pendingScans, setPendingScans] = useState(0);
  // Baris yang baru discan berkedip hijau sebentar; n berubah tiap scan supaya scan ulang kode yang sama tetap memicu efek
  const [flash, setFlash] = useState<{ itemId: number; n: number } | null>(null);
  // Kamera HP: lihat QrCameraScanner, nama barang terakhir yang discan ditampilkan di kotak kamera
  const [cameraOn, setCameraOn] = useState(false);
  const [lockedName, setLockedName] = useState("");

  const scanSessionRef = useRef(0);
  const modalOpenRef = useRef(false);
  const scanRef = useRef<HTMLInputElement>(null);
  const barisRef = useRef<BarisForm[]>([]);
  // Callback kamera tidak diperbarui tiap render, jadi nama pengambil dibaca lewat ref
  const pengambilRef = useRef("");

  useEffect(() => {
    barisRef.current = baris;
  }, [baris]);
  useEffect(() => {
    pengambilRef.current = pengambil.trim();
  }, [pengambil]);
  useEffect(
    () => () => {
      modalOpenRef.current = false;
      scanSessionRef.current += 1;
    },
    [],
  );
  useEffect(() => {
    if (scanOpen) scanRef.current?.focus();
  }, [scanOpen]);
  useEffect(() => {
    if (!flash) return;
    document.getElementById(`bk-baris-${flash.itemId}`)?.scrollIntoView?.({ block: "nearest" });
    const timer = setTimeout(() => setFlash(null), 700);
    return () => clearTimeout(timer);
  }, [flash]);
  // Toast gagal scan hilang sendiri
  useEffect(() => {
    if (!scanError) return;
    const timer = setTimeout(() => setScanError(""), 4000);
    return () => clearTimeout(timer);
  }, [scanError]);

  // Form dibuka: sesi baru, semua sisa scan lama diabaikan.
  const mulai = () => {
    scanSessionRef.current += 1;
    modalOpenRef.current = true;
    setPendingScans(0);
    barisRef.current = [];
    pengambilRef.current = "";
    setScanOpen(false);
    setScanValue("");
    setScanError("");
    setCameraOn(false);
    setLockedName("");
    setFlash(null);
  };

  const akhiri = () => {
    modalOpenRef.current = false;
    scanSessionRef.current += 1;
    setPendingScans(0);
    setCameraOn(false);
    setScanOpen(false);
    setScanValue("");
    setLockedName("");
  };

  const bukaScan = () => {
    if (!pengambilRef.current) return;
    if (scanOpen) scanRef.current?.focus();
    else setScanOpen(true);
  };

  // Barang yang sudah ada di tabel cukup ditambah jumlahnya, barang baru diambil datanya dari database
  const tambahKode = async (code: string) => {
    if (!modalOpenRef.current || submittingRef.current) return;
    code = code.trim();
    if (!code) return;
    const session = scanSessionRef.current;
    setScanError("");
    setLockedName("");
    if (!pengambilRef.current) {
      setScanError("Isi nama pengambil dulu.");
      beepFail();
      return;
    }
    const ok = (itemId: number) => {
      setFlash((f) => ({ itemId, n: (f?.n ?? 0) + 1 }));
      beepOk();
    };
    const ada = barisRef.current.find((b) => b.itemId !== null && b.code === code);
    if (ada && ada.itemId !== null) {
      setBaris((bs) => tambahSatu(bs, ada.key));
      setLockedName(ada.name);
      ok(ada.itemId);
      return;
    }
    setPendingScans((n) => n + 1);
    try {
      const item = await getItemByCode(code);
      // Abaikan hasil scan dari form yang sudah ditutup atau diganti draft baru.
      if (session !== scanSessionRef.current || !modalOpenRef.current) return;
      setLockedName(item.name);
      // Dua scan cepat untuk kode baru yang sama sama-sama sampai di sini sebelum barisnya ada
      setBaris((bs) => {
        const sama = bs.find((b) => b.itemId === item.id);
        return sama
          ? tambahSatu(bs, sama.key)
          : [
            ...bs,
            {
              key: randomId(),
              manual: false,
              itemId: item.id,
              code: item.code ?? code,
              name: item.name,
              unit: item.unit,
              stock: item.stock,
              qty: "1",
              dokubah: "",
            },
          ];
      });
      ok(item.id);
    } catch (err) {
      if (session !== scanSessionRef.current || !modalOpenRef.current) return;
      beepFail();
      setScanError(
        err instanceof ApiError && err.status === 404
          ? `Kode "${code}" tidak dikenal.`
          : err instanceof ApiError
            ? err.message
            : "Gagal membaca kode.",
      );
    } finally {
      if (session === scanSessionRef.current) setPendingScans((n) => Math.max(0, n - 1));
    }
  };

  // Scanner USB mengetik kode lalu menekan Enter; Enter juga tidak boleh mengirim form
  const onScanKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const code = scanValue.trim();
    setScanValue("");
    if (code) void tambahKode(code);
  };

  return {
    scanOpen, scanValue, setScanValue, scanError, setScanError, pendingScans, flash,
    cameraOn, setCameraOn, lockedName, scanRef,
    mulai, akhiri, bukaScan, tambahKode, onScanKey,
  };
}
