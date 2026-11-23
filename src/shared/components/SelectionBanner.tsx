"use client";

type Props = {
  // Jumlah seluruh baris terpilih, termasuk yang tersembunyi karena pencarian/filter.
  count: number;
  unit?: string;
  onClear?: () => void;
  clearLabel?: string;
  disabled?: boolean;
  className?: string;
};

// Banner hijau di atas tabel: penanda jumlah baris terpilih lintas pencarian.
export default function SelectionBanner({
  count,
  unit = 'baris',
  onClear,
  clearLabel = 'Bersihkan pilihan',
  disabled = false,
  className = '',
}: Props) {
  if (count <= 0) return null;
  return (
    <div
      role="status"
      className={`mx-5 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700 ${className}`}
    >
      <span className="font-medium">{count.toLocaleString('id-ID')} {unit} dipilih</span>
      {onClear && (
        <button type="button" onClick={onClear} disabled={disabled} className="font-semibold underline underline-offset-2 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed">
          {clearLabel}
        </button>
      )}
    </div>
  );
}
