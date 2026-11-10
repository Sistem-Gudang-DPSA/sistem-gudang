import type { Location } from '@/domains/inventory/types';

type Common = {
  locations: Location[];
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  error: string;
};

// Tambah/edit lokasi satu barang.
export function LokasiModal({ itemName, ...common }: Common & { itemName: string }) {
  const { locations, value, onChange, onSave, onClose, saving, error } = common;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
            TAMBAH LOKASI · {itemName}
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

        <div className="flex flex-col sm:flex-row gap-6 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Lokasi</label>
            <select
              className="w-full border border-gray-200 bg-gray-50/50 rounded-xl py-2.5 pl-4 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] focus:bg-white appearance-none text-sm transition-all duration-200"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            >
              <option value="" disabled>Pilih Lokasi</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.code}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onSave}
            disabled={saving}
            className="px-6 py-2.5 bg-[#FF8A00] text-white font-medium rounded-xl hover:bg-[#E67A00] shadow-sm shadow-[#FF8A00]/20 transition-all text-sm disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Atur lokasi sekaligus untuk barang yang dipilih.
export function LokasiBulkModal({ count, withLocation, ...common }: Common & { count: number; withLocation: number }) {
  const { locations, value, onChange, onSave, onClose, saving, error } = common;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">ATUR LOKASI · {count} BARANG</h2>
          <button onClick={onClose} aria-label="Tutup" className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">×</button>
        </div>
        <label htmlFor="bulk-lokasi" className="block text-sm font-semibold text-gray-700 mb-2">Lokasi</label>
        <select
          id="bulk-lokasi"
          className="w-full border border-gray-200 bg-gray-50/50 rounded-xl py-2.5 pl-4 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] focus:bg-white text-sm mb-3"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled>Pilih Lokasi</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.code}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mb-4">Kode tiap barang dibuat otomatis dari lokasi ini.</p>
        {withLocation > 0 && (
          <div className="mb-4 p-3 bg-amber-50 text-amber-700 text-sm rounded-lg">
            {withLocation} barang sudah punya lokasi. Kodenya akan diganti, label QR lama perlu dicetak ulang.
          </div>
        )}
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
        <div className="flex justify-end">
          <button
            onClick={onSave}
            disabled={saving}
            className="px-6 py-2.5 bg-[#FF8A00] text-white font-medium rounded-xl hover:bg-[#E67A00] shadow-sm transition-all text-sm disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : `Simpan ${count} barang`}
          </button>
        </div>
      </div>
    </div>
  );
}
