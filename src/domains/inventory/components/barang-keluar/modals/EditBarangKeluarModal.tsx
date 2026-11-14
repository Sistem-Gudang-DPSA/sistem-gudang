import { useRef } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Calendar, X } from "lucide-react";
import type { useItemSearch } from "@/domains/inventory/use-item-search";
import SearchableSelect from "@/shared/components/SearchableSelect";
import { JUMLAH_INPUT, inputJumlah, peringatanJumlah } from "../form-utils";
import type { useEditBarangKeluar } from "../useEditBarangKeluar";
import { fieldClass, labelClass } from "../styles";

export default function EditBarangKeluarModal({
  edit,
  itemSearch,
}: {
  edit: ReturnType<typeof useEditBarangKeluar>;
  itemSearch: ReturnType<typeof useItemSearch>;
}) {
  const { target: editTarget, form: editForm, saving: editSaving, error: editError, spk: spkEdit } = edit;
  const { items, onSearch: searchItems, pending: itemPending, error: itemError } = itemSearch;
  const editTanggalRef = useRef<HTMLInputElement>(null);
  if (!editTarget || !editForm) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md transition-opacity duration-300 p-4">
      <form
        onSubmit={edit.submit}
        noValidate
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-full overflow-y-auto p-6 sm:p-8 relative animate-in zoom-in-95 duration-200"
      >
        <fieldset
          disabled={editSaving}
          className="min-w-0 border-0 p-0 m-0"
        >
          <button
            type="button"
            onClick={edit.close}
            disabled={editSaving}
            aria-label="Tutup form edit"
            className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>

          <h2 className="text-[18px] font-extrabold text-black tracking-wide uppercase mb-2">
            Edit Barang Keluar
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            No. Transaksi{" "}
            <span className="font-semibold text-gray-800">
              {editTarget.trx.id}
            </span>{" "}
            · Disetujui superadmin untuk satu kali penyimpanan. Periksa seluruh barang sebelum menyimpan.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-bk-tanggal" className={labelClass}>
                Tanggal
              </label>
              <div className="relative">
                <input
                  ref={editTanggalRef}
                  id="edit-bk-tanggal"
                  type="date"
                  value={editForm.tanggal}
                  onChange={(e) => edit.update({ tanggal: e.target.value })}
                  className={`${fieldClass} [&::-webkit-calendar-picker-indicator]:hidden`}
                />
                <button
                  type="button"
                  aria-label="Pilih tanggal edit"
                  onClick={() => editTanggalRef.current?.showPicker?.()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-800 hover:opacity-70"
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="edit-bk-client" className={labelClass}>
                Nama Client
              </label>
              <input
                id="edit-bk-client"
                type="text"
                readOnly
                value={
                  edit.clientTampil
                }
                className={fieldClass}
              />
            </div>
            <div>
              {editTarget.trx.recipientType === "INTERNAL" ? (
                <>
                  <label htmlFor="edit-bk-internal-id" className={labelClass}>
                    ID Stok / Internal
                  </label>
                  <input
                    id="edit-bk-internal-id"
                    type="text"
                    maxLength={100}
                    value={editForm.spk}
                    onChange={(e) => edit.update({ spk: e.target.value })}
                    className={fieldClass}
                  />
                </>
              ) : (
                <>
                  <span className={labelClass}>SPK</span>
                  <SearchableSelect
                    value={editForm.spk}
                    onChange={(spk) => edit.update({ spk })}
                    onSearch={spkEdit.onSearch}
                    options={spkEdit.options.map((entry) => ({ value: entry.noSpk, label: entry.noSpk }))}
                    placeholder="Pilih SPK"
                    aria-label="SPK"
                    className={fieldClass}
                  />
                </>
              )}
            </div>
            <div>
              <label htmlFor="edit-bk-item" className={labelClass}>
                Nama Item/Projek
              </label>
              <input
                id="edit-bk-item"
                type="text"
                value={editForm.namaItem}
                maxLength={191}
                onChange={(e) => edit.update({ namaItem: e.target.value })}
                className={fieldClass}
              />
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {editForm.lines.map((line, index) => {
              const warning = peringatanJumlah(line.qty);
              const utama = index === editTarget.lineIndex;
              const nama = editTarget.trx.lines[index].itemName;
              return (
                <div
                  key={index}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-gray-100 p-3"
                >
                  <div>
                    <span className={labelClass}>Nama Barang {index + 1}</span>
                    <SearchableSelect
                      value={line.itemId}
                      onChange={(itemId) => {
                        const item = items.find((entry) => String(entry.id) === itemId);
                        edit.updateLine(index, {
                          itemId,
                          picked: item ? { name: item.name, code: item.code, unit: item.unit } : undefined,
                        });
                      }}
                      onSearch={searchItems}
                      pending={itemPending}
                      options={[
                        ...(!items.some((item) => String(item.id) === line.itemId)
                          ? [{ value: line.itemId, label: line.picked?.name ?? nama }]
                          : []),
                        ...items.map((item) => ({ value: String(item.id), label: item.name })),
                      ]}
                      placeholder="Pilih barang"
                      aria-label={utama ? "Nama Barang" : `Nama Barang ${index + 1}`}
                      className={`${fieldClass} cursor-pointer`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor={`edit-bk-kode-${index}`} className={labelClass}>
                        Kode Barang
                      </label>
                      <input
                        id={`edit-bk-kode-${index}`}
                        readOnly
                        value={line.picked?.code ?? "-"}
                        className={`${fieldClass} bg-gray-50 font-mono text-xs`}
                      />
                    </div>
                    <div>
                      <label htmlFor={`edit-bk-jumlah-${index}`} className={labelClass}>
                        {utama ? "Jumlah" : `Jumlah Barang ${index + 1}`}
                      </label>
                      <input
                        {...JUMLAH_INPUT}
                        id={`edit-bk-jumlah-${index}`}
                        value={line.qty}
                        aria-invalid={!!warning}
                        aria-describedby={warning ? `edit-bk-warning-${index}` : undefined}
                        onChange={(e) => edit.updateLine(index, { qty: inputJumlah(e.target.value) })}
                        className={`${fieldClass} text-right ${warning ? "border-red-400 bg-red-50" : ""}`}
                      />
                      {warning && (
                        <p id={`edit-bk-warning-${index}`} role="alert" className="mt-1 text-xs text-red-600">
                          {warning}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {editTarget.trx.lines.length > 1 && (
            <div className="flex items-start gap-2 mt-5 px-4 py-2 bg-yellow-100 rounded-xl text-gray-800">
              <AlertCircle
                className="w-4 h-4 mt-0.5 shrink-0"
                strokeWidth={2.2}
              />
              <span className="text-sm">
                Tanggal, SPK, nama client, dan nama item/projek berlaku
                untuk semua barang di transaksi {editTarget.trx.id}.
              </span>
            </div>
          )}

          {(editError || itemError) && (
            <p
              role="alert"
              className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg"
            >
              {editError || itemError}
            </p>
          )}

          <div className="flex justify-end items-center gap-3 mt-6 pt-5 border-t border-gray-100">
            <button
              type="button"
              onClick={edit.close}
              className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 font-semibold rounded-xl transition-colors text-sm"
              disabled={editSaving}
            >
              Batal
            </button>

            <button
              type="submit"
              name="aksi"
              value="simpan"
              className="px-5 py-2.5 text-[#FF8A00] bg-white border-2 border-[#FF8A00] hover:bg-orange-50 font-semibold rounded-xl transition-colors text-sm disabled:opacity-50 flex items-center justify-center min-w-[100px]"
              disabled={editSaving}
            >
              {editSaving ? "Menyimpan..." : "Simpan"}
            </button>

            <button
              type="submit"
              name="aksi"
              value="cetak"
              className="px-5 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm disabled:opacity-50 flex items-center justify-center min-w-[140px]"
              disabled={editSaving}
            >
              Simpan + Cetak
            </button>
          </div>
        </fieldset>
      </form>
    </div>,
    document.body,
  );
}
