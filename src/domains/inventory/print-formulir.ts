// Bagian bersama formulir cetak barang masuk dan barang keluar: CSS, kop, tanda tangan,
// pembagian halaman, dan cetak lewat iframe tersembunyi.
import { escapeHtml } from '@/shared/lib/escape-html';
import { cetakHtml } from '@/shared/lib/print-html';

export type KopFormulir = {
  judul: string;
  kode: string;
  nomor: string;
  revisi: string;
  terbit: string;
  divisi: string;
};

export type Halaman = { nomor: number; jumlah: number; awal: number };

const LOGO = "/logo-perusahaan.jpg";
const LOGO_ALTERNATIF = "/logo-perusahaan.png";
export const BARIS_PER_HALAMAN = 6;
const FORMULIR_PER_KERTAS = 4;

const CSS_FORMULIR = `
          @page { size: A4 landscape; margin: 5mm; }
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; }
          body { font: 7pt/1.2 Arial, sans-serif; color: #000; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          /* Area formulir 148 x 105 mm termasuk margin, sekitar seperempat A4. */
          .kertas { display: grid; grid-template-columns: repeat(2, 138mm); grid-auto-rows: minmax(95mm, auto); gap: 5mm; align-items: start; break-after: page; page-break-after: always; }
          .kertas:last-child { break-after: auto; page-break-after: auto; }
          .lembar { width: 138mm; max-width: 100%; break-inside: avoid; page-break-inside: avoid; }
          .kop { height: 18mm; position: relative; }
          .logo { position: absolute; top: 0; left: 0; width: 16mm; height: 16mm; object-fit: contain; }
          h1 { margin: 0 27mm 0 17mm; padding-top: 5mm; text-align: center; font-size: 8pt; line-height: 1.2; font-weight: 700; text-decoration: underline; text-underline-offset: 0.5mm; }
          .identitas-dokumen { position: absolute; top: 1mm; right: 0; width: 26mm; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .kode-dokumen { font-size: 6pt; }
          .kode-dokumen tr { height: 4mm; }
          .kode-dokumen td { border: 1px solid #000; padding: 0.5mm 1mm; white-space: nowrap; }
          .divisi { margin: 1mm 0 0; text-align: center; font-size: 6pt; font-weight: 700; }
          .informasi { margin: 0; font-size: 6.5pt; }
          .informasi td { height: 4.5mm; padding: 0.5mm; border-bottom: 1px solid #000; vertical-align: middle; overflow-wrap: anywhere; }
          .informasi .label { font-weight: 700; white-space: nowrap; }
          .material { margin-top: 1mm; font-size: 7pt; }
          .material th, .material td { border: 1px solid #000; padding: 0.5mm; vertical-align: middle; overflow-wrap: anywhere; }
          .material thead tr { height: 4mm; }
          .material th { text-align: center; font-weight: 700; }
          .material tbody tr { height: 5mm; break-inside: avoid; page-break-inside: avoid; }
          .material thead { display: table-header-group; }
          .tengah { text-align: center; }
          .pengesahan { break-inside: avoid; page-break-inside: avoid; }
          .catatan { margin: 2mm 0 1mm; font-size: 6pt; }
          .tanda-tangan { font-size: 6pt; }
          .tanda-tangan td { width: 25%; border: 0; padding: 0; text-align: center; vertical-align: top; }
          .ruang-tanda-tangan { height: 8mm; }
          .nomor-halaman { margin: 1mm 0 0; font-size: 6pt; text-align: right; }
        `;

// Pecah baris menjadi halaman berisi BARIS_PER_HALAMAN; setiap halaman dibangun oleh buatLembar.
export function lembarPerHalaman<T>(
  baris: T[],
  buatLembar: (isi: T[], halaman: Halaman) => string,
): string {
  const jumlah = Math.max(1, Math.ceil(baris.length / BARIS_PER_HALAMAN));
  return Array.from({ length: jumlah }, (_, index) => {
    const awal = index * BARIS_PER_HALAMAN;
    return buatLembar(baris.slice(awal, awal + BARIS_PER_HALAMAN), { nomor: index + 1, jumlah, awal });
  }).join("");
}

// Tabel material dengan header yang sama di kedua formulir; lebar dalam persen per kolom.
export function tabelMaterial(lebar: number[], isi: string): string {
  const kolom = lebar.map((w) => `<col style="width:${w}%" />`).join("");
  return `<table class="material">
        <colgroup>${kolom}</colgroup>
        <thead>
          <tr><th rowspan="2" scope="col">No</th><th rowspan="2" scope="col">Nama Material</th><th rowspan="2" scope="col">sat/vol</th><th colspan="2" scope="colgroup">Jumlah</th><th rowspan="2" scope="col">Keterangan</th></tr>
          <tr><th scope="col">Dokubah</th><th scope="col">Pengambilan</th></tr>
        </thead>
        <tbody>${isi}</tbody>
      </table>`;
}

function kopFormulir(kop: KopFormulir): string {
  const logoUrl = new URL(LOGO, window.location.origin).href;
  return `<header class="kop">
        <img class="logo" src="${escapeHtml(logoUrl)}" alt="Logo perusahaan" />
        <h1>${escapeHtml(kop.judul)}</h1>
        <div class="identitas-dokumen">
          <table class="kode-dokumen">
            <colgroup><col style="width:42%" /><col style="width:58%" /></colgroup>
            <tbody>
              <tr><td rowspan="2" class="tengah">${escapeHtml(kop.kode)}<br />${escapeHtml(kop.nomor)}</td><td>Rev:${escapeHtml(kop.revisi)}</td></tr>
              <tr><td>Terbit:${escapeHtml(kop.terbit)}</td></tr>
            </tbody>
          </table>
          <p class="divisi">${escapeHtml(kop.divisi)}</p>
        </div>
      </header>`;
}

// Satu lembar formulir: kop, tabel informasi (dari komponen), material, dan tanda tangan.
export function lembarFormulir(
  kop: KopFormulir,
  bagian: {
    informasi: string;
    material: string;
    keterangan: string;
    tandaTangan: string[];
    halaman: Halaman;
  },
): string {
  const { halaman } = bagian;
  return `<section class="lembar">
      ${kopFormulir(kop)}

      ${bagian.informasi}

      ${bagian.material}

      <footer class="pengesahan">
        <p class="catatan">${escapeHtml(bagian.keterangan)}</p>
        <table class="tanda-tangan"><tbody><tr>
          ${bagian.tandaTangan.map((label) => `<td>${escapeHtml(label)}<div class="ruang-tanda-tangan"></div>(____________________)</td>`).join("")}
        </tr></tbody></table>
        ${halaman.jumlah > 1 ? `<p class="nomor-halaman">Halaman ${halaman.nomor} dari ${halaman.jumlah}</p>` : ""}
      </footer>
    </section>`;
}

// Dokumen HTML lengkap untuk satu formulir (berisi satu atau lebih lembar).
export function dokumenFormulir(judul: string, lembar: string): string {
  return `<!doctype html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(judul)}</title>
        <style>${CSS_FORMULIR}</style>
      </head>
      <body>${lembar}</body>
    </html>`;
}

// Hingga empat formulir per A4; setiap dokumen tetap formulir sendiri.
export async function cetakFormulir(htmlDocs: string[], label: string): Promise<void> {
  const dokumen = htmlDocs.map((html) => new DOMParser().parseFromString(html, "text/html"));
  const gabungan = dokumen[0];
  for (const lanjutan of dokumen.slice(1)) {
    gabungan.body.append(...Array.from(lanjutan.body.children));
  }
  const formulir = Array.from(gabungan.body.children);
  gabungan.body.replaceChildren();
  for (let index = 0; index < formulir.length; index += FORMULIR_PER_KERTAS) {
    const kertas = gabungan.createElement("main");
    kertas.className = "kertas";
    kertas.append(...formulir.slice(index, index + FORMULIR_PER_KERTAS));
    gabungan.body.append(kertas);
  }

  return cetakHtml(`<!doctype html>${gabungan.documentElement.outerHTML}`, label, async (printDocument) => {
    // Tunggu gambar selesai dibaca agar logo tidak hilang saat dialog cetak dibuka.
    await Promise.all(
      Array.from(printDocument.images, (img) =>
        img.decode().catch(async () => {
          img.src = new URL(LOGO_ALTERNATIF, window.location.origin).href;
          try {
            await img.decode();
          } catch {
            throw new Error("Logo gagal dimuat. Letakkan logo di public/logo-perusahaan.jpg atau public/logo-perusahaan.png.");
          }
        }),
      ),
    );
  });
}
