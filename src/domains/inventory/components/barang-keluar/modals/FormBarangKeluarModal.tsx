import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, Printer, X } from "lucide-react";
import type { useItemSearch } from "@/domains/inventory/use-item-search";
import SearchableSelect from "@/shared/components/SearchableSelect";
import { fieldClass, orangeButtonClass, rowClass, rowLabelClass, selectClass } from "../styles";
import type { useFormBarangKeluar } from "../useFormBarangKeluar";
import BarisBarangKeluarTable from "./BarisBarangKeluarTable";
import PanelScan from "./PanelScan";

// Jam berdetik hanya selama form terbuka, dan hanya komponen ini yang digambar ulang.
function WaktuSekarang() {
  const [waktu, setWaktu] = useState("");
  useEffect(() => {
    const update = () =>
      setWaktu(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="text-xs">
      Waktu Sekarang :
      <span className="font-mono font-semibold text-gray-800 ml-1 ">{waktu}</span>
    </div>
  );
}

export default function FormBarangKeluarModal({
  f,
  itemSearch,
}: {
  f: ReturnType<typeof useFormBarangKeluar>;
  itemSearch: ReturnType<typeof useItemSearch>;
}) {
  const { form, modeKeluar, saving, modalError, scan } = f;
  const formTanggalRef = useRef<HTMLInputElement>(null);
  const pengambilOk = form.namaPengambil.trim() !== "";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md transition-opacity duration-300 p-4">
      <form
        onSubmit={f.bukaPreview}
        noValidate
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-full overflow-y-auto p-6 sm:p-8 relative animate-in zoom-in-95 duration-200"
      >
        <fieldset disabled={saving} className="min-w-0 border-0 p-0 m-0">
          <button
            type="button"
            onClick={f.close}
            disabled={saving}
            aria-label="Tutup form"
            className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>

          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 mb-6 pr-10">
            <h2 className="text-[18px] font-extrabold text-black tracking-wide uppercase">
              Form Barang Keluar {modeKeluar === "stok" ? "Stok / Internal" : "SPK"}
            </h2>

            <p className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-800">
              <span className="font-medium">No. Transaksi :</span>{" "}
            </p>
          </div>
          {/* Nama Pengambil / Tanggal, Client / Nama Item, lalu SPK. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-4 mb-8">
            <div className={rowClass}>
              <label htmlFor="form-bk-pengambil" className={rowLabelClass}>
                Nama Pengambil
              </label>
              <input
                id="form-bk-pengambil"
                type="text"
                value={form.namaPengambil}
                maxLength={191}
                onChange={(e) => f.patchForm({ namaPengambil: e.target.value })}
                placeholder="Isi nama pengambil"
                className={fieldClass}
              />
            </div>
            <div className={rowClass}>
              <label htmlFor="form-bk-tanggal" className={rowLabelClass}>
                Tanggal
              </label>
              <div className="relative">
                <input
                  ref={formTanggalRef}
                  id="form-bk-tanggal"
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => f.patchForm({ tanggal: e.target.value })}
                  className={`${fieldClass} [&::-webkit-calendar-picker-indicator]:hidden`}
                />
                <button
                  type="button"
                  aria-label="Pilih tanggal transaksi"
                  onClick={() => formTanggalRef.current?.showPicker?.()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-800 hover:opacity-70"
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
            </div>
            {modeKeluar === "stok" ? (
              <div className={rowClass}>
                <label htmlFor="form-bk-stock-id" className={rowLabelClass}>
                  ID Stok / Internal
                </label>
                <input
                  id="form-bk-stock-id"
                  type="text"
                  value={form.stockId}
                  maxLength={100}
                  onChange={(e) => f.patchForm({ stockId: e.target.value })}
                  placeholder="Isi ID stok atau internal"
                  className={fieldClass}
                />
              </div>
            ) : (
              <div className={rowClass}>
                <span className={rowLabelClass}>Client</span>
                <SearchableSelect
                  value={form.client}
                  onChange={f.pilihClient}
                  onSearch={f.clientSearch.onSearch}
                  options={f.clientPilihan}
                  placeholder="Pilih client"
                  aria-label="Client"
                  className={selectClass}
                />
              </div>
            )}
            <div className={rowClass}>
              <label
                htmlFor={modeKeluar === "stok" ? "form-bk-nama-item" : undefined}
                className={rowLabelClass}
              >
                Nama Item
              </label>
              <div className="min-w-0">
                {modeKeluar === "stok" ? (
                  <input
                    id="form-bk-nama-item"
                    type="text"
                    value={form.namaItem}
                    maxLength={191}
                    onChange={(e) => f.patchForm({ namaItem: e.target.value })}
                    placeholder="Isi nama item"
                    className={fieldClass}
                  />
                ) : (
                  <SearchableSelect
                    value={form.namaItem}
                    onChange={(namaItem) => f.patchForm({ namaItem })}
                    options={f.pilihanProduk}
                    placeholder="Pilih Item"
                    emptyText={
                      !form.spk
                        ? "Pilih SPK dulu"
                        : f.detailMemuat
                          ? "Memuat item..."
                          : "Tidak ada item pada SPK ini"
                    }
                    aria-label="Nama Item"
                    className={selectClass}
                  />
                )}
                {modeKeluar === "spk" && f.detailMemuat && (
                  <p className="mt-1 text-xs text-gray-400">Memuat produk...</p>
                )}
                {modeKeluar === "spk" && f.detailGagal && (
                  <p className="mt-1 text-xs text-red-600">
                    Gagal memuat produk dari tracking. Pilih SPK lagi.
                  </p>
                )}
              </div>
            </div>
            {modeKeluar === "spk" && (
              <div className={rowClass}>
                <span className={rowLabelClass}>SPK</span>
                <SearchableSelect
                  value={form.spk}
                  onChange={f.pilihSpk}
                  onSearch={f.spkSearch.onSearch}
                  options={f.spkPilihan}
                  placeholder="Pilih SPK"
                  emptyText={form.client ? "Tidak ada SPK untuk client ini" : "Pilih SPK"}
                  aria-label="SPK"
                  className={selectClass}
                />
              </div>
            )}
          </div>

          <PanelScan scan={scan} baris={form.baris} pengambilOk={pengambilOk} onTambahManual={f.tambahManual} />

          <BarisBarangKeluarTable
            baris={form.baris}
            flashItemId={scan.flash?.itemId}
            itemSearch={itemSearch}
            pilihanMaterial={f.pilihanMaterial}
            onPilihMaterial={f.pilihMaterial}
            patchBaris={f.patchBaris}
            setBaris={f.setBaris}
          />

          {(modalError || itemSearch.error) && (
            <p
              role="alert"
              className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg"
            >
              {modalError || itemSearch.error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 mt-3">
            <WaktuSekarang />
            <div className="ml-auto flex flex-wrap items-center gap-3">
              <button
                type="submit"
                name="aksi"
                value="simpan"
                disabled={
                  saving || scan.pendingScans > 0
                }
                className="px-5 py-2.5 text-[#FF8A00] bg-white border-2 border-[#FF8A00] hover:bg-orange-50 font-semibold rounded-xl transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                type="submit"
                name="aksi"
                value="cetak"
                disabled={
                  saving || scan.pendingScans > 0
                }
                className={orangeButtonClass}
              >
                <Printer className="w-4 h-4" />
                Simpan + Cetak
              </button>
            </div>
          </div>
        </fieldset>
      </form>
    </div>,
    document.body,
  );
}
