const pad = (n: number | string) => String(n).padStart(2, '0');

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const displayDate = (iso: string) => iso.slice(0, 10).split('-').reverse().join('-');

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
