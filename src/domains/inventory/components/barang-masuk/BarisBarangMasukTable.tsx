import { Minus, Plus, Trash2 } from 'lucide-react';
import SearchableSelect from '@/shared/components/SearchableSelect';
import { digitsOnly, INTEGER_INPUT } from '@/shared/lib/input';
import { cellClass, headClass } from './styles';
import { MAX_QTY, type useFormBarangMasuk } from './useFormBarangMasuk';

type TableForm = Pick<ReturnType<typeof useFormBarangMasuk>,
  'baris' | 'preview' | 'supplier' | 'pilihanMaterial' | 'itemSearch' | 'pilihMaterial' | 'patchBaris' | 'hapusBaris'>;

export default function BarisBarangMasukTable({ f }: { f: TableForm }) {
  return (
    <div className="mt-4 overflow-x-auto border-t border-l border-gray-300 rounded-sm">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-gray-100 text-gray-900 text-base">
          <tr>
            <th scope="col" className={`${headClass} w-10`}>No</th>
            <th scope="col" className={`${headClass} min-w-48 text-left`}>Nama Material</th>
            <th scope="col" className={`${headClass} min-w-24`}>Satuan/Vol</th>
            <th scope="col" className={`${headClass} min-w-24`}>Kode</th>
            <th scope="col" className={`${headClass} min-w-28`}>Rekap Pembelian</th>
            <th scope="col" className={`${headClass} min-w-36`}>Kedatangan</th>
            {!f.preview && <th scope="col" className={`${headClass} w-10`}><span className="sr-only">Hapus</span></th>}
          </tr>
        </thead>
        <tbody>
          {f.baris.length === 0 && (
            <tr><td colSpan={7} className={`${cellClass} px-4 py-8 text-center text-gray-400`}>
              Belum ada barang. Tekan Scan Barang lalu scan QR barang, atau Input Manual untuk memilih material.
            </td></tr>
          )}
          {f.baris.map((row, index) => {
            const name = row.name || `baris ${index + 1}`;
            const wrongSupplier = row.itemId !== null && row.supplierId !== f.supplier?.id;
            return (
              <tr key={row.key} className={wrongSupplier ? 'bg-red-50' : ''}>
                <td className={`${cellClass} text-center text-gray-700`}>{index + 1}</td>
                <td className={`${cellClass} font-medium text-gray-900`}>
                  {row.manual && !f.preview ? (
                    <SearchableSelect value={row.itemId === null ? '' : String(row.itemId)} onChange={(id) => f.pilihMaterial(row.key, id)}
                      options={f.pilihanMaterial(row)} onSearch={f.itemSearch.onSearch} pending={f.itemSearch.pending}
                      aria-label={`Nama material ${name}`} placeholder="Pilih material" emptyText="Material tidak ditemukan"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-100" />
                  ) : row.name}
                  {wrongSupplier && <p className="mt-1 text-xs font-normal text-red-600">Supplier barang berbeda. Ganti material atau hapus baris.</p>}
                </td>
                <td className={`${cellClass} text-center text-gray-700`}>{row.unit || '-'}</td>
                <td className={`${cellClass} text-center font-mono text-xs text-gray-600`}>{row.code || '-'}</td>
                <td className={`${cellClass} text-center`}>
                  {f.preview ? Number(row.qtyPurchased).toLocaleString('id-ID') : (
                    <input {...INTEGER_INPUT} maxLength={9} placeholder="0" value={row.qtyPurchased}
                      aria-label={`Jumlah Sesuai Rekap Pembelian ${name}`}
                      onChange={(event) => f.patchBaris(row.key, { qtyPurchased: digitsOnly(event.target.value) })}
                      className="w-full min-w-20 border border-gray-300 rounded-md px-2 py-1.5 text-center text-sm" />
                  )}
                </td>
                <td className={`${cellClass} text-center`}>
                  {f.preview ? <span className="font-semibold">{Number(row.qtyArrived).toLocaleString('id-ID')}</span> : (
                    <div className="flex items-center justify-center">
                      <button type="button" aria-label={`Kurangi ${name}`} disabled={Number(row.qtyArrived) <= 1}
                        onClick={() => f.patchBaris(row.key, { qtyArrived: String(Math.max((Number(row.qtyArrived) || 0) - 1, 1)) })}
                        className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30"><Minus className="w-4 h-4" /></button>
                      <input {...INTEGER_INPUT} maxLength={9} placeholder="0" value={row.qtyArrived}
                        aria-label={`Jumlah Sesuai Kedatangan ${name}`}
                        onChange={(event) => f.patchBaris(row.key, { qtyArrived: digitsOnly(event.target.value) })}
                        className="w-16 border border-gray-300 rounded-md py-1.5 px-2 text-center text-sm" />
                      <button type="button" aria-label={`Tambah ${name}`} disabled={Number(row.qtyArrived) >= MAX_QTY}
                        onClick={() => f.patchBaris(row.key, { qtyArrived: String((Number(row.qtyArrived) || 0) + 1) })}
                        className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30"><Plus className="w-4 h-4" /></button>
                    </div>
                  )}
                </td>
                {!f.preview && <td className={`${cellClass} text-center`}>
                  <button type="button" aria-label={`Hapus ${name}`} onClick={() => f.hapusBaris(row.key)} className="text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>}
              </tr>
            );
          })}
        </tbody>
        {f.preview && <tfoot className="bg-gray-50 font-semibold text-gray-900"><tr>
          <td colSpan={4} className={cellClass}>Total</td>
          <td className={`${cellClass} text-center`}>{f.baris.reduce((sum, row) => sum + Number(row.qtyPurchased), 0).toLocaleString('id-ID')}</td>
          <td className={`${cellClass} text-center`}>{f.baris.reduce((sum, row) => sum + Number(row.qtyArrived), 0).toLocaleString('id-ID')}</td>
        </tr></tfoot>}
      </table>
    </div>
  );
}
