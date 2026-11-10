import type { ItemListRow } from '@/domains/inventory/types';

type Props = {
  item: ItemListRow;
  delta: string;
  setDelta: (value: string) => void;
  reason: string;
  setReason: (value: string) => void;
  error: string;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
};

// Sesuaikan stok satu barang (Superadmin): perubahan boleh negatif dan wajib ada alasan.
export default function AdjustStokModal({ item, delta, setDelta, reason, setReason, error, saving, onSave, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
            SESUAIKAN STOK · {item.name}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Stok saat ini: <span className="font-bold text-gray-800">{item.stock} {item.unit}</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-6 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Perubahan Jumlah</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={10}
              placeholder="Contoh: 10 atau -5"
              className="w-full border border-gray-200 bg-gray-50/50 rounded-xl py-2.5 px-4 text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200"
              value={delta}
              onChange={(e) => setDelta(e.target.value.replace(/(?!^-)\D/g, ""))}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Alasan</label>
            <input
              type="text"
              placeholder="Contoh: Penerimaan PO-2026-09-001"
              className="w-full border border-gray-200 bg-gray-50/50 rounded-xl py-2.5 px-4 text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200"
              value={reason}
              maxLength={255}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onSave}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all text-sm disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
