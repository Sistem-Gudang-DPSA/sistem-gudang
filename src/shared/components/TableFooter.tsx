"use client";

type Props = {
  total: number;
  unit?: string;
};

// Footer tabel scroll: jumlah data terfilter, semua ikut dicetak dan diekspor.
export default function TableFooter({ total, unit = 'data' }: Props) {
  return (
    <div className="m-4 border-t border-gray-100 pt-4 print:hidden">
      <p className="text-xs text-gray-500">
        Total {total.toLocaleString('id-ID')} {unit} terfilter. Semua ikut dicetak dan diekspor.
      </p>
    </div>
  );
}
