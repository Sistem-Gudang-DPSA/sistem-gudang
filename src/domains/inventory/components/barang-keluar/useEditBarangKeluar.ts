import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { updateOutbound } from "@/domains/inventory/api";
import type { OutboundRow } from "@/domains/inventory/types";
import type { useItemSearch } from "@/domains/inventory/use-item-search";
import { useSpkSearch } from "@/domains/ppic/use-spk-search";
import { ApiError } from "@/shared/lib/api-client";
import { cetakBarangKeluar, dataCetakDariTrx, muatSatuan } from "./cetak";
import { bisaEdit, PESAN_TIDAK_BISA_EDIT, validasiEdit } from "./edit-rules";
import type { EditForm, EditLineForm, EditTarget } from "./types";

type Props = {
  userId?: number;
  itemSearch: ReturnType<typeof useItemSearch>;
  reload: () => void;
  setActionError: (message: string) => void;
};

// Edit satu transaksi setelah disetujui superadmin: semua barang disimpan bersama agar izin hanya terpakai sekali.
export function useEditBarangKeluar({ userId, itemSearch, reload, setActionError }: Props) {
  const [target, setTarget] = useState<EditTarget | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [peringatan, setPeringatan] = useState("");
  // Terpisah dari form tambah supaya dua form tidak saling mengunci.
  const submittingRef = useRef(false);

  const spk = useSpkSearch(target?.trx.recipientType === "INTERNAL" ? "" : form?.spk ?? "");
  const clientOf = (noSpk: string) => spk.options.find((t) => t.noSpk === noSpk)?.client ?? "";
  // Client yang tampil di form, kosong bila belum diketahui.
  const clientTampil =
    target && form
      ? target.trx.recipientType === "INTERNAL"
        ? "Internal"
        : clientOf(form.spk) || (form.spk === target.trx.spk ? target.trx.clientName : "")
      : "";

  const open = (trx: OutboundRow, lineIndex: number) => {
    if (!trx.lines[lineIndex]) return;
    if (!bisaEdit(trx, userId)) {
      setPeringatan(PESAN_TIDAK_BISA_EDIT);
      return;
    }
    setTarget({ trx, lineIndex });
    setForm({
      tanggal: trx.date.slice(0, 10),
      spk: trx.spk,
      namaItem: trx.itemName,
      // Satuan tidak ada di transaksi; dimuat saat cetak bila barangnya tidak dipilih ulang.
      lines: trx.lines.map((entry) => ({
        itemId: String(entry.itemId),
        picked: { name: entry.itemName, code: entry.itemCode },
        qty: String(entry.qty),
      })),
    });
    setError("");
  };

  const close = () => {
    setTarget(null);
    setForm(null);
  };

  const update = (patch: Partial<EditForm>) => setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  const updateLine = (index: number, patch: Partial<EditLineForm>) =>
    setForm((prev) =>
      prev ? { ...prev, lines: prev.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)) } : prev,
    );

  const cetak = async (trx: OutboundRow, edited: EditForm) => {
    const unit = (line: EditLineForm) =>
      line.picked?.unit ?? itemSearch.items.find((item) => item.id === Number(line.itemId))?.unit;
    const units = await muatSatuan(edited.lines.filter((line) => !unit(line)).map((line) => Number(line.itemId)));
    await cetakBarangKeluar(
      dataCetakDariTrx({
        recipientType: trx.recipientType,
        tanggal: edited.tanggal,
        client:
          trx.recipientType === "INTERNAL"
            ? "Internal"
            : clientOf(edited.spk) || (edited.spk === trx.spk ? trx.clientName : "") || "-",
        spk: edited.spk,
        namaItem: edited.namaItem,
        baris: edited.lines.map((line, index) => ({
          name: line.picked?.name ?? trx.lines[index].itemName,
          code: line.picked?.code ?? trx.lines[index].itemCode,
          unit: unit(line) ?? units.get(Number(line.itemId)) ?? "",
          qty: Number(line.qty),
          pic: trx.lines[index].pic,
        })),
      }),
    );
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!target || !form) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const cetakSetelahSimpan = submitter instanceof HTMLButtonElement && submitter.value === "cetak";
    const { trx } = target;
    if (!bisaEdit(trx, userId)) {
      close();
      setPeringatan(PESAN_TIDAK_BISA_EDIT);
      return;
    }
    const invalid = validasiEdit(form);
    if (invalid) {
      setError(invalid);
      return;
    }

    submittingRef.current = true;
    setSaving(true);
    setError("");
    setActionError("");
    try {
      await updateOutbound(trx.id, {
        date: form.tanggal,
        spk: form.spk.trim(),
        itemName: form.namaItem.trim(),
        recipientType: trx.recipientType,
        notes: trx.notes ?? undefined,
        lines: form.lines.map((line, index) => ({ itemId: Number(line.itemId), qty: Number(line.qty), pic: trx.lines[index].pic })),
      });
      close();
      reload();
      if (cetakSetelahSimpan) {
        try {
          await cetak(trx, form);
        } catch (err) {
          setActionError(`Perubahan sudah tersimpan, tetapi dialog cetak gagal dibuka. ${err instanceof Error ? err.message : ""}`);
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan perubahan barang keluar.");
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  return { target, form, saving, error, peringatan, setPeringatan, spk, clientTampil, open, close, update, updateLine, submit };
}
