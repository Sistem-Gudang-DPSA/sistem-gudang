// Kop dan kerangka cetak laporan: logo perusahaan, nama perusahaan, judul, dan tabel.
import { COMPANY_LOGO, COMPANY_LOGO_FALLBACK, COMPANY_NAME } from "./company";
import { escapeHtml } from "./escape-html";
import { cetakHtml } from "./print-html";

const CSS_LAPORAN = `
  @page { margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; color: #111; margin: 0; }
  .kop { display: flex; align-items: center; gap: 4mm; border-bottom: 2px solid #111; padding-bottom: 3mm; margin-bottom: 4mm; }
  .logo { width: 18mm; height: 18mm; object-fit: contain; flex: none; }
  .perusahaan { margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.3px; }
  h1 { margin: 1mm 0 0; font-size: 16px; text-transform: uppercase; }
  .meta { margin: 2mm 0 0; font-size: 11px; color: #444; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 4mm; }
  th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #eee; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  .c { text-align: center; }
  .r { text-align: right; }
  .sub { color: #555; font-size: 10px; }
  .b td { font-weight: bold; background: #f5f5f5; }
`;

const logoUrl = (path: string) => new URL(path, window.location.origin).href;

// Menunggu logo selesai dimuat agar tidak hilang saat dialog cetak dibuka.
export async function tungguGambarCetak(dokumen: Document): Promise<void> {
  await Promise.all(
    Array.from(dokumen.images, (img) =>
      img.decode().catch(async () => {
        img.src = logoUrl(COMPANY_LOGO_FALLBACK);
        try {
          await img.decode();
        } catch {
          throw new Error("Logo gagal dimuat. Letakkan logo di public/logo-perusahaan.jpg atau public/logo-perusahaan.png.");
        }
      }),
    ),
  );
}

export function kopLaporan(judul: string, meta: string[]): string {
  return `<header class="kop">
      <img class="logo" src="${escapeHtml(logoUrl(COMPANY_LOGO))}" alt="Logo perusahaan" />
      <div>
        <p class="perusahaan">${escapeHtml(COMPANY_NAME)}</p>
        <h1>${escapeHtml(judul)}</h1>
        ${meta.map((m) => `<p class="meta">${escapeHtml(m)}</p>`).join("")}
      </div>
    </header>`;
}

// Dokumen HTML lengkap: kop di atas, lalu isi tabel laporan.
export function dokumenLaporan(judul: string, meta: string[], isi: string, landscape = false): string {
  return `<!doctype html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(judul)}</title>
        <style>
          @page { size: ${landscape ? "landscape" : "portrait"}; }
          ${CSS_LAPORAN}
        </style>
      </head>
      <body>
        ${kopLaporan(judul, meta)}
        ${isi}
      </body>
    </html>`;
}

export function cetakLaporan(
  judul: string,
  isi: string,
  { meta = [], label = judul, landscape = false }: { meta?: string[]; label?: string; landscape?: boolean } = {},
): Promise<void> {
  return cetakHtml(dokumenLaporan(judul, meta, isi, landscape), label, tungguGambarCetak);
}
