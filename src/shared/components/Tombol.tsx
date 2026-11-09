// components/ui/Tombol.tsx
import { Download, FileUp } from 'lucide-react';

const baseClass =
  'flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed';

type ButtonProps = { onClick: () => void; disabled?: boolean; label?: string };

export function ExportExcellButton({ onClick, disabled, label = 'Export Excel' }: ButtonProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={label} className={baseClass}>
      <FileUp className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export function PrintPdfButton({ onClick, disabled, label = 'Print PDF' }: ButtonProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={label} className={baseClass}>
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}