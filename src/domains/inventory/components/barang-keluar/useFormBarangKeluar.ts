import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createOutbound } from "@/domains/inventory/api";
import type { useItemSearch } from "@/domains/inventory/use-item-search";
import { getTrackingSpk } from "@/domains/ppic/api";
import type { TrackingSpkDetail } from "@/domains/ppic/types";
import { useClientSearch, useSpkSearch } from "@/domains/ppic/use-spk-search";
import { ApiError } from "@/shared/lib/api-client";
import { randomId } from "@/shared/lib/random-id";
import { cetakBarangKeluar, dataCetakDariTrx } from "./cetak";
import { barisManual, formKosong, susunInput, validasiForm } from "./form-utils";
import type { BarisForm, FormBarangKeluar, ModeKeluar } from "./types";
import { useScanBarang } from "./useScanBarang";

type Props = {
  itemSearch: ReturnType<typeof useItemSearch>;
  reload: () => void;
  setActionError: (message: string) => void;
};

// Form tambah barang keluar (SPK atau stok/internal): isian, scan, preview, dan simpan.
export function useFormBarangKeluar({ itemSearch, reload, setActionError }: Props) {
  const { items } = itemSearch;
  const [isOpen, setIsOpen] = useState(false);
  const [modeKeluar, setModeKeluar] = useState<ModeKeluar>("spk");
  const [form, setForm] = useState<FormBarangKeluar>(formKosong);
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);
  const [modalError, setModalError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCetak, setPreviewCetak] = useState(false);
  // Satu key per draft: dipakai ulang saat retry atau klik ganda, ganti hanya kalau isi draft berubah
  const draftKey = useRef({ key: "", payload: "" });

  const setBaris = (fn: (baris: BarisForm[]) => BarisForm[]) =>
    setForm((prev) => ({ ...prev, baris: fn(prev.baris) }));
  const patchBaris = (key: string, patch: Partial<BarisForm>) =>
    setBaris((bs) => bs.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  const patchForm = (patch: Partial<FormBarangKeluar>) => setForm((prev) => ({ ...prev, ...patch }));

  const scan = useScanBarang({ pengambil: form.namaPengambil, baris: form.baris, setBaris, submittingRef });

  // Dropdown Client dan SPK: pencarian dikirim ke server. Client berasal dari tracking lewat SPK; API mengabaikan nama client dari FE.
  const clientSearch = useClientSearch();
  const clientPilihan = clientSearch.options.map((c) => ({ value: c, label: c }));
  const spkSearch = useSpkSearch(form.spk, form.client);
  const spkPilihan = spkSearch.options.map((t) => ({ value: t.noSpk, label: t.noSpk }));

  // Detail SPK (client dan produk) dari tracking, dimuat tiap SPK di form dipilih
  const [detailSpk, setDetailSpk] = useState<{ noSpk: string; data: TrackingSpkDetail | null } | null>(null);
  useEffect(() => {
    if (!form.spk) return;
    const spk = form.spk;
    let batal = false;
    getTrackingSpk(spk)
      .then((data) => !batal && setDetailSpk({ noSpk: spk, data }))
      .catch(() => !batal && setDetailSpk({ noSpk: spk, data: null }));
    return () => {
      batal = true;
    };
  }, [form.spk]);
  const detailAktif = form.spk && detailSpk?.noSpk === form.spk ? detailSpk : null;
  const detailGagal = !!form.spk && detailAktif !== null && detailAktif.data === null;
  const detailMemuat = !!form.spk && detailAktif === null;

  // Hanya produk milik SPK dan client yang sedang dipilih.
  const trackingData = detailAktif?.data;
  const produkTracking = (trackingData && trackingData.client === form.client ? trackingData.products : []).filter(
    (p, i, arr) => arr.findIndex((x) => x.name === p.name) === i,
  );
  const pilihanProduk = produkTracking.map((p) => ({
    value: p.name,
    label: `${p.name} (${p.qty} ${p.unit})`,
  }));

  const open = (mode: ModeKeluar) => {
    scan.mulai();
    draftKey.current = { key: "", payload: "" };
    setModeKeluar(mode);
    setForm(formKosong());
    setModalError("");
    setActionError("");
    setIsOpen(true);
  };

  const close = () => {
    scan.akhiri();
    setIsOpen(false);
  };

  const tambahManual = () => setBaris((bs) => [...bs, barisManual()]);

  const pilihMaterial = (key: string, itemId: string) => {
    if (!itemId) {
      patchBaris(key, { itemId: null, code: "", name: "", unit: "", stock: 0 });
      return;
    }
    const item = items.find((it) => String(it.id) === itemId);
    if (item)
      patchBaris(key, { itemId: item.id, code: item.code ?? "", name: item.name, unit: item.unit, stock: item.stock });
  };

  // Material yang sudah ada di baris lain tidak ditawarkan lagi, jumlahnya cukup ditambah di baris itu.
  // Item terpilih tetap ada di pilihan walau di luar hasil pencarian terakhir.
  const pilihanMaterial = (b: BarisForm) => [
    ...(b.itemId !== null && !items.some((it) => it.id === b.itemId)
      ? [{ value: String(b.itemId), label: b.code ? `${b.name} (${b.code})` : b.name }]
      : []),
    ...items
      .filter((it) => it.id === b.itemId || !form.baris.some((x) => x.itemId === it.id))
      .map((it) => ({ value: String(it.id), label: it.code ? `${it.name} (${it.code})` : it.name })),
  ];

  const pilihClient = (client: string) =>
    setForm((prev) => (prev.client === client ? prev : { ...prev, client, spk: "", namaItem: "" }));
  const pilihSpk = (spk: string) => setForm((prev) => ({ ...prev, spk, namaItem: "" }));

  // Dipanggil saat tombol Simpan / Simpan + Cetak ditekan di form
  const bukaPreview = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (scan.pendingScans > 0) {
      setModalError("Tunggu proses scan barang selesai sebelum menyimpan.");
      return;
    }
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    setPreviewCetak(submitter instanceof HTMLButtonElement && submitter.value === "cetak");
    const invalid = validasiForm(form, modeKeluar, {
      spkAda: spkPilihan.some((p) => p.value === form.spk),
      produkAda: produkTracking.some((p) => p.name === form.namaItem),
    });
    if (invalid) {
      setModalError(invalid);
      return;
    }
    setModalError("");
    setPreviewOpen(true);
  };

  const konfirmasiSimpan = async () => {
    if (submittingRef.current) return;
    const { input, terisi, pengambil, client } = susunInput(form, modeKeluar);
    submittingRef.current = true;
    setSaving(true);
    setModalError("");
    setActionError("");
    try {
      const payload = JSON.stringify(input);
      if (!draftKey.current.key || draftKey.current.payload !== payload)
        draftKey.current = { key: randomId(), payload };
      await createOutbound(input, draftKey.current.key);
      draftKey.current = { key: "", payload: "" };

      setPreviewOpen(false);
      close();
      reload();
      if (previewCetak) {
        try {
          await cetakBarangKeluar(
            dataCetakDariTrx({
              recipientType: input.recipientType,
              tanggal: input.date,
              client,
              spk: input.spk,
              namaItem: input.itemName,
              baris: terisi.map((b) => ({
                name: b.name, code: b.code, unit: b.unit, dokubah: b.dokubah,
                qty: Number(b.qty), pic: pengambil,
              })),
            }),
          );
        } catch (err) {
          setActionError(`Data sudah tersimpan, tetapi dialog cetak gagal dibuka. ${err instanceof Error ? err.message : ""}`);
        }
      }
    } catch (err) {
      // Preview tetap terbuka supaya pengguna bisa membaca pesan dan memperbaiki
      setModalError(err instanceof ApiError ? err.message : "Gagal menyimpan barang keluar.");
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  return {
    isOpen, modeKeluar, form, patchForm, saving, modalError,
    previewOpen, setPreviewOpen, previewCetak,
    open, close, bukaPreview, konfirmasiSimpan,
    setBaris, patchBaris, tambahManual, pilihMaterial, pilihanMaterial, pilihClient, pilihSpk,
    clientSearch, clientPilihan, spkSearch, spkPilihan, pilihanProduk, detailMemuat, detailGagal,
    scan,
  };
}
