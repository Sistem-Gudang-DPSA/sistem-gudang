import { QrCode } from 'lucide-react';

type Props = { headline: string; lines: string[]; onPrint: () => void };

// Hasil Ganti kode (satu atau banyak barang) dengan tombol cetak ulang label. Konfirmasi memakai window.confirm di pemanggil.
export default function RecodeNotice({ headline, lines, onPrint }: Props) {
  return (
    <div className="mx-5 mt-5 p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-start justify-between gap-3">
      <div>
        <span>{headline}</span>
        {lines.length > 0 && (
          <ul className="mt-1 font-mono text-xs space-y-0.5">
            {lines.map((line) => <li key={line}>{line}</li>)}
          </ul>
        )}
      </div>
      <button
        type="button"
        onClick={onPrint}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-300 text-green-700 text-xs font-bold rounded-lg hover:bg-green-100 transition-colors"
      >
        <QrCode className="w-3.5 h-3.5" strokeWidth={2.5} />
        Cetak label
      </button>
    </div>
  );
}
