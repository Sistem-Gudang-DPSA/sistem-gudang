import JumlahPengambilanInput from "./JumlahPengambilanInput";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { useItemSearch } from "@/domains/inventory/use-item-search";
import SearchableSelect from "@/shared/components/SearchableSelect";
import { peringatanJumlah, MAX_JUMLAH, tambahSatu } from "../form-utils";
import { formCellClass, formHeadClass } from "../styles";
import type { BarisForm } from "../types";

// Tabel barang yang keluar: nama material (manual dipilih dari dropdown), dokubah, dan jumlah per baris.
export default function BarisBarangKeluarTable({
  baris,
  flashItemId,
  itemSearch,
  pilihanMaterial,
  onPilihMaterial,
  patchBaris,
  setBaris,
}: {
  baris: BarisForm[];
  flashItemId: number | undefined;
  itemSearch: ReturnType<typeof useItemSearch>;
  pilihanMaterial: (b: BarisForm) => { value: string; label: string }[];
  onPilihMaterial: (key: string, itemId: string) => void;
  patchBaris: (key: string, patch: Partial<BarisForm>) => void;
  setBaris: (fn: (baris: BarisForm[]) => BarisForm[]) => void;
}) {
  return (
    <div className="mt-4 overflow-x-auto border-t border-l border-gray-300 rounded-sm">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-gray-100 text-gray-900 font-medium text-base">
          <tr>
            <th scope="col" className={`${formHeadClass} w-10`}>
              No
            </th>
            <th
              scope="col"
              className={`${formHeadClass} min-w-48 text-left`}
            >
              Nama Material
            </th>
            <th scope="col" className={`${formHeadClass} min-w-24`}>
              Satuan/Vol
            </th>
            <th scope="col" className={`${formHeadClass} min-w-24`}>
              Kode
            </th>
            <th scope="col" className={`${formHeadClass} min-w-28`}>
              Dokubah
            </th>
            <th scope="col" className={`${formHeadClass} min-w-36`}>
              Pengambilan
            </th>
            <th scope="col" className={`${formHeadClass} w-10`}>
              <span className="sr-only">Hapus</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {baris.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className={`${formCellClass} px-4 py-8 text-center text-gray-400`}
              >
                Belum ada barang. Tekan Scan Barang lalu scan QR
                barang, atau Input Manual untuk memilih material.
              </td>
            </tr>
          )}
          {baris.map((b, i) => {
            // Baris manual yang belum dipilih materialnya belum punya nama untuk label tombolnya
            const nama = b.name || `baris ${i + 1}`;
            const lebihStok =
              b.itemId !== null && Number(b.qty) > b.stock;
            const warning = peringatanJumlah(b.qty) || (lebihStok ? `Jumlah melebihi stok ${b.stock} ${b.unit}.` : "");
            return (
              <tr
                key={b.key}
                id={
                  b.itemId === null
                    ? undefined
                    : `bk-baris-${b.itemId}`
                }
                className={
                  flashItemId === b.itemId
                    ? "bg-green-50 transition-colors"
                    : "transition-colors"
                }
              >
                <td
                  className={`${formCellClass} text-center text-gray-700`}
                >
                  {i + 1}
                </td>
                {b.manual ? (
                  <td className={`${formCellClass} px-1 py-1`}>
                    <SearchableSelect
                      value={
                        b.itemId === null ? "" : String(b.itemId)
                      }
                      onChange={(itemId) =>
                        onPilihMaterial(b.key, itemId)
                      }
                      onSearch={itemSearch.onSearch}
                      pending={itemSearch.pending}
                      options={pilihanMaterial(b)}
                      placeholder="Pilih material"
                      emptyText="Material tidak ditemukan"
                      aria-label={`Nama material ${nama}`}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </td>
                ) : (
                  <td
                    className={`${formCellClass} px-2 py-2 font-medium text-gray-900`}
                  >
                    {b.name}
                  </td>
                )}
                <td
                  className={`${formCellClass} px-2 text-center text-gray-700`}
                >
                  {b.unit}
                </td>
                <td
                  className={`${formCellClass} px-2 text-center font-mono text-xs text-gray-600`}
                >
                  {b.code}
                </td>
                <td className={`${formCellClass} px-2 text-center`}>
                  <input
                    type="text"
                    value={b.dokubah}
                    onChange={(e) =>
                      patchBaris(b.key, { dokubah: e.target.value })
                    }
                    placeholder="Isi Dokubah"
                    aria-label={`Dokubah ${nama}`}
                    className="w-full min-w-28 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                  />
                </td>
                <td className={`${formCellClass} px-2 py-1.5`}>
                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      aria-label={`Kurangi ${nama}`}
                      disabled={!!peringatanJumlah(b.qty) || Number(b.qty) <= 1}
                      onClick={() =>
                        patchBaris(b.key, {
                          qty: String(
                            Math.max(Number(b.qty) - 1, 1),
                          ),
                        })
                      }
                      className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <JumlahPengambilanInput
                      value={b.qty}
                      aria-label={`Pengambilan ${nama}`}
                      warning={warning}
                      title={
                        b.itemId === null
                          ? undefined
                          : `Stok ${b.stock} ${b.unit}`
                      }
                      onValueChange={(qty) => patchBaris(b.key, { qty })}
                      className={`w-16 border rounded-md py-1.5 px-2 text-center text-sm ${warning ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                    />
                    <button
                      type="button"
                      aria-label={`Tambah ${nama}`}
                      disabled={!!peringatanJumlah(b.qty) || Number(b.qty) >= MAX_JUMLAH}
                      onClick={() =>
                        setBaris((bs) => tambahSatu(bs, b.key))
                      }
                      className="p-1 text-gray-500 hover:text-gray-900"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {b.itemId !== null && (
                    <p
                      className={`mt-0.5 text-center text-xs ${lebihStok ? "text-red-600" : "text-gray-400"}`}
                    >
                      stok {b.stock}
                    </p>
                  )}
                </td>
                <td className={`${formCellClass} px-2 text-center`}>
                  <button
                    type="button"
                    aria-label={`Hapus ${nama}`}
                    onClick={() =>
                      setBaris((bs) =>
                        bs.filter((x) => x.key !== b.key),
                      )
                    }
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
