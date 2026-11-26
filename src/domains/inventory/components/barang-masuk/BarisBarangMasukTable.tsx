import { Minus, Plus, Trash2 } from 'lucide-react';
import SearchableSelect from '@/shared/components/SearchableSelect';
import JumlahInput from '../JumlahInput';
import { cellClass, headClass } from './styles';
import { MAX_QTY, peringatanJumlahMasuk, type useFormBarangMasuk } from './useFormBarangMasuk';

type TableForm = Pick<ReturnType<typeof useFormBarangMasuk>,
  'baris' | 'preview' | 'pilihanMaterial' | 'pilihMaterial' | 'patchBaris' | 'hapusBaris'>;

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
              Belum ada barang. Tekan Scan Barang lalu scan QR barang, atau Input Manual untuk memilih baris PO.
            </td></tr>
          )}
          {f.baris.map((row, index) => {
            const name = row.name || `baris ${index + 1}`;
            const batas = Math.min(row.sisa || MAX_QTY, MAX_QTY);
            const overSisa = Number(row.qtyArrived) > row.sisa;
            return (
              <tr key={row.key} className={overSisa ? 'bg-red-50' : ''}>
                <td className={`${cellClass} text-center text-gray-700`}>{index + 1}</td>
                <td className={`${cellClass} font-medium text-gray-900`}>
                  {row.manual && !f.preview ? (
                    <SearchableSelect value={row.purchaseOrderLineId ? String(row.purchaseOrderLineId) : ''} onChange={(id) => f.pilihMaterial(row.key, id)}
                      options={f.pilihanMaterial(row)} aria-label={`Nama material ${name}`} placeholder="Pilih material"
                      emptyText="Baris PO tidak ditemukan"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-100" />
                  ) : row.name}
                  <p className="mt-1 text-xs font-normal text-gray-500">{row.poNumber}{row.noSpk ? ` · ${row.noSpk}` : ''}</p>
                  {overSisa && <p className="mt-1 text-xs font-normal text-red-600">Jumlah melebihi sisa PO ({row.sisa}).</p>}
                </td>
                <td className={`${cellClass} text-center text-gray-700`}>{row.unit || '-'}</td>
                <td className={`${cellClass} text-center font-mono text-xs text-gray-600`}>{row.code || '-'}</td>
                <td className={`${cellClass} text-center`}>{Number(row.qtyPurchased || 0).toLocaleString('id-ID')}</td>
                <td className={`${cellClass} text-center`}>
                  {f.preview ? <span className="font-semibold">{Number(row.qtyArrived).toLocaleString('id-ID')}</span> : (
                    <div className="flex items-center justify-center">
                      <button type="button" aria-label={`Kurangi ${name}`} disabled={!!peringatanJumlahMasuk(row.qtyArrived, 'kedatangan') || Number(row.qtyArrived) <= 1}
                        onClick={() => f.patchBaris(row.key, { qtyArrived: String(Number(Math.max((Number(row.qtyArrived) || 0) - 1, 1).toFixed(3))) })}
                        className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30"><Minus className="w-4 h-4" /></button>
                      <JumlahInput validate={(value) => peringatanJumlahMasuk(value, 'kedatangan')} placeholder="0" value={row.qtyArrived}
                        aria-label={`Jumlah Sesuai Kedatangan ${name}`}
                        onValueChange={(qtyArrived) => f.patchBaris(row.key, { qtyArrived })}
                        className="w-16 border border-gray-300 rounded-md py-1.5 px-2 text-center text-sm" />
                      <button type="button" aria-label={`Tambah ${name}`} disabled={!!peringatanJumlahMasuk(row.qtyArrived, 'kedatangan') || Number(row.qtyArrived) >= batas}
                        onClick={() => f.patchBaris(row.key, { qtyArrived: String(Number(Math.min((Number(row.qtyArrived) || 0) + 1, batas).toFixed(3))) })}
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
          <td className={`${cellClass} text-center`}>{f.baris.reduce((sum, row) => sum + Number(row.qtyPurchased || 0), 0).toLocaleString('id-ID')}</td>
          <td className={`${cellClass} text-center`}>{f.baris.reduce((sum, row) => sum + Number(row.qtyArrived), 0).toLocaleString('id-ID')}</td>
        </tr></tfoot>}
      </table>
    </div>
  );
}
