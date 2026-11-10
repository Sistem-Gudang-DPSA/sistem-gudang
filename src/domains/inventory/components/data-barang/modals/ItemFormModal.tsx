import { INTEGER_INPUT, digitsOnly } from '@/shared/lib/input';
import type { Supplier } from '@/domains/purchasing/types';

export type ItemForm = { name: string; unit: string; category: string; price: string; supplierId: string };

type Props = {
  form: ItemForm;
  setForm: (next: ItemForm) => void;
  units: string[];
  categories: string[];
  suppliers: Supplier[];
  error: string;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
};

// Form tambah/edit barang (PPIC).
export default function ItemFormModal({ form, setForm, units, categories, suppliers, error, saving, onSave, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <h2 className="text-xl font-bold text-gray-900 mb-6 uppercase tracking-wide">DATA BARANG</h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama</label>
            <input
              type="text"
              value={form.name}
              maxLength={191}
              onChange={(e) => setForm({...form, name: e.target.value})}
              placeholder="Masukan nama barang"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all sm:text-sm text-gray-900 placeholder:text-gray-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Satuan</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({...form, unit: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all appearance-none sm:text-sm text-gray-700 bg-white"
              >
                <option value="" disabled className="text-gray-400">Pilih satuan</option>
                {units.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Kategori</label>
              <select
                value={form.category}
                onChange={(e) => setForm({...form, category: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all appearance-none sm:text-sm text-gray-700 bg-white"
              >
                <option value="" disabled className="text-gray-400">Pilih Kategori</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Harga</label>
              <input
              {...INTEGER_INPUT}
              maxLength={9}
                value={form.price}
                onChange={(e) => setForm({...form, price: digitsOnly(e.target.value)})}
                placeholder="0"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all sm:text-sm text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Supplier</label>
              <select
                value={form.supplierId}
                onChange={(e) => setForm({...form, supplierId: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all appearance-none sm:text-sm text-gray-700 bg-white"
              >
                <option value="" disabled className="text-gray-400">Pilih supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-5 p-3 bg-red-50 text-red-600 text-sm rounded-xl">{error}</div>
        )}

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onCancel}
            className="px-5 py-2 border border-orange-500 text-orange-500 font-medium rounded-xl hover:bg-orange-50 transition-colors text-sm"
          >
            Batal
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2.5 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/30 transition-all text-sm disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
