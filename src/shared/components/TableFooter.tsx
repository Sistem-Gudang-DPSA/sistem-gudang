"use client";

import VisibleRowsSelect from './VisibleRowsSelect';

type Props = {
  total: number;
  visibleRows: number;
  onVisibleRowsChange: (rows: number) => void;
  unit?: string;
};

// Footer tabel scroll: jumlah data terfilter di kiri, pilihan baris terlihat di kanan.
export default function TableFooter({ total, visibleRows, onVisibleRowsChange, unit = 'data' }: Props) {
  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-gray-500">
        Total {total.toLocaleString('id-ID')} {unit} terfilter. Semua ikut dicetak dan diekspor.
      </p>
      <VisibleRowsSelect value={visibleRows} onChange={onVisibleRowsChange} />
    </div>
  );
}
