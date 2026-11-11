const pad = (n: number | string) => String(n).padStart(2, '0');

// Local calendar date (en-CA formats as YYYY-MM-DD); toISOString would give the UTC date.
export const todayIso = () => new Date().toLocaleDateString('en-CA');

// The backend sends date-only values as midnight UTC; those are calendar dates, not moments.
const isMoment = (iso: string) =>
  !/^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z$/.test(iso) && iso.length > 10 && !Number.isNaN(Date.parse(iso));

// Local first day of the current month, YYYY-MM-01.
export const monthStart = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
};

// A timestamp (longer than YYYY-MM-DD) is shown on the local calendar day; date-only strings stay as-is.
export const displayDate = (iso: string) => {
  const day = isMoment(iso) ? new Date(iso).toLocaleDateString('en-CA') : iso.slice(0, 10);
  return day.split('-').reverse().join('-');
};

// Business date (date-only column) plus the time it was recorded. createdAt is
// UTC from the API; business time is Asia/Jakarta, same as the backend.
export const displayDateTime = (date: string, createdAt: string) =>
  `${displayDate(date)} ${new Date(createdAt).toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })}`;

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
