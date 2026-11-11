import { createPortal } from "react-dom";
import { displayDate } from "@/domains/inventory/date";
import { orangeButtonClass } from "../styles";
import type { FormBarangKeluar, ModeKeluar } from "../types";

export default function PreviewBarangKeluarModal({
  form,
  mode,
  saving,
  cetak,
  error,
  onBack,
  onConfirm,
}: {
  form: FormBarangKeluar;
  mode: ModeKeluar;
  saving: boolean;
  cetak: boolean;
  error: string;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const stok = mode === "stok";
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="preview-bk-judul"
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-full overflow-y-auto p-6 sm:p-8 relative animate-in zoom-in-95 duration-200">
        <h2 id="preview-bk-judul" className="text-[18px] font-extrabold text-black tracking-wide uppercase mb-1">
          Preview Barang Keluar
        </h2>
        <p className="text-sm text-gray-500 mb-6">Periksa data di bawah sebelum disimpan. Stok berkurang setelah dikonfirmasi.</p>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mb-6 text-sm">
          {([
            ["Tanggal", displayDate(form.tanggal)],
            ["Nama Pengambil", form.namaPengambil],
            ["Client", stok ? "Internal" : form.client],
            [stok ? "ID Stok / Internal" : "No. SPK", stok ? form.stockId : form.spk],
            ["Nama Item/Projek", form.namaItem],
            ["Tujuan", stok ? "Stok / Internal" : "Tukang / Produksi"],
          ] as const).map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <dt className="text-gray-500">{k}</dt>
              <dd className="font-semibold text-gray-900">{v || "-"}</dd>
            </div>
          ))}
        </dl>

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold">
              <tr>
                <th className="px-4 py-2.5">No</th>
                <th className="px-4 py-2.5">Nama Material</th>
                <th className="px-4 py-2.5">Kode</th>
                <th className="px-4 py-2.5">Satuan</th>
                <th className="px-4 py-2.5">Dokubah</th>
                <th className="px-4 py-2.5 text-right">Jumlah</th>
                <th className="px-4 py-2.5 text-right">Stok Sekarang</th>
                <th className="px-4 py-2.5 text-right">Sisa Setelah Keluar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {form.baris.filter((b) => b.itemId !== null).map((b, i) => {
                const qty = Number(b.qty);
                return (
                  <tr key={b.key}>
                    <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{b.name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{b.code}</td>
                    <td className="px-4 py-2.5 text-gray-600">{b.unit}</td>
                    <td className="px-4 py-2.5 text-gray-600">{b.dokubah || "-"}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-gray-800">{qty}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{b.stock}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{b.stock - qty}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 font-bold text-gray-900">
              <tr>
                <td colSpan={5} className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 text-right">
                  {form.baris.reduce((n, b) => n + (b.itemId !== null ? Number(b.qty) || 0 : 0), 0)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>

        {error && <p role="alert" className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</p>}

        <div className="flex justify-end items-center gap-3 mt-6 pt-5 border-t border-gray-100">
          <button type="button" onClick={onBack} disabled={saving}
            className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 font-semibold rounded-xl transition-colors text-sm disabled:opacity-50">
            Kembali Edit
          </button>
          <button type="button" onClick={onConfirm} disabled={saving} className={orangeButtonClass}>
            {saving ? "Menyimpan..." : cetak ? "Konfirmasi + Cetak" : "Konfirmasi Simpan"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
