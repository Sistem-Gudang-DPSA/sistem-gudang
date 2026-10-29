import { Calendar } from 'lucide-react';

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = [
  { v: '01', l: 'Januari' }, { v: '02', l: 'Februari' }, { v: '03', l: 'Maret' },
  { v: '04', l: 'April' }, { v: '05', l: 'Mei' }, { v: '06', l: 'Juni' },
  { v: '07', l: 'Juli' }, { v: '08', l: 'Agustus' }, { v: '09', l: 'September' },
  { v: '10', l: 'Oktober' }, { v: '11', l: 'November' }, { v: '12', l: 'Desember' },
];
const YEARS = ['2024', '2025', '2026'];

const selectClass =
  'appearance-none border border-gray-200 rounded-xl py-2.5 pl-3 pr-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-orange-500 text-sm text-gray-700 bg-white transition-all duration-200 cursor-pointer';

function Field({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
        <Calendar className="h-4 w-4 text-gray-400" />
      </div>
    </div>
  );
}

type Props = {
  day: string;
  month: string;
  year: string;
  onDayChange: (v: string) => void;
  onMonthChange: (v: string) => void;
  onYearChange: (v: string) => void;
  onReset: () => void
  className?: string;
  // Set false when the API only filters by month and year (e.g. stock opname).
  showDay?: boolean;
};

export default function DateFilter({ day, month, year, onDayChange, onMonthChange, onYearChange, onReset, className, showDay = true }: Props) {
  return (
    <div className={className ?? 'flex flex-wrap items-center gap-2 px-5 py-3 border-b border-gray-100 bg-white'}>
      {showDay && (
        <Field>
          <select value={day} onChange={(e) => onDayChange(e.target.value)} className={`${selectClass} w-24`}>
            <option value="">Hari</option>
            {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
      )}

      <Field>
        <select value={month} onChange={(e) => onMonthChange(e.target.value)} className={`${selectClass} w-36`}>
          <option value="">Bulan</option>
          {MONTHS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
        </select>
      </Field>

      <Field>
        <select value={year} onChange={(e) => onYearChange(e.target.value)} className={`${selectClass} w-28`}>
          <option value="">Tahun</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </Field>

      {((showDay && day) || month || year) && (
        <button type="button" onClick={onReset} className="text-xs text-orange-600 font-bold hover:underline ml-1">
          Reset
        </button>
      )}
    </div>
  );
}