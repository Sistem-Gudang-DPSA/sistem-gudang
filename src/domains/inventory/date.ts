const pad = (n: number | string) => String(n).padStart(2, '0');

// Local calendar date (en-CA formats as YYYY-MM-DD); toISOString would give the UTC date.
export const todayIso = () => new Date().toLocaleDateString('en-CA');

export const displayDate = (iso: string) => {
  // A timestamp (longer than YYYY-MM-DD) is shown on the local calendar day; date-only strings stay as-is.
  // The backend sends date-only values as midnight UTC; those are calendar dates, not moments.
  const dateOnly = /^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z$/.test(iso);
  const day = !dateOnly && iso.length > 10 && !Number.isNaN(Date.parse(iso)) ? new Date(iso).toLocaleDateString('en-CA') : iso.slice(0, 10);
  return day.split('-').reverse().join('-');
};

// Turn the Tgl/Bulan/Tahun selects into the API's startDate/endDate range.
export function toDateRange(day: string, month: string, year: string) {
  if (!day && !month && !year) return {};
  const y = year || String(new Date().getFullYear());
  if (!month) return { startDate: `${y}-01-01`, endDate: `${y}-12-31` };
  const m = pad(month);
  if (day) return { startDate: `${y}-${m}-${pad(day)}`, endDate: `${y}-${m}-${pad(day)}` };
  const last = new Date(Number(y), Number(m), 0).getDate();
  return { startDate: `${y}-${m}-01`, endDate: `${y}-${m}-${pad(last)}` };
}
