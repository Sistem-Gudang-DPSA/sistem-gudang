export async function exportToExcel({ filename, sheetName = 'Sheet1', headers, rows }: {
  filename: string; sheetName?: string; headers: string[]; rows: (string | number)[][];
}) {
  const XLSX = await import('xlsx');
  const data = [headers, ...rows];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet['!cols'] = headers.map((_, c) => ({ wch: Math.max(...data.map((r) => String(r[c] ?? '').length)) + 3 }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName);
  XLSX.writeFile(book, filename);
}