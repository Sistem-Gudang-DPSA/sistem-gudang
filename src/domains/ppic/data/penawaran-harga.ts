import type { PenawaranApiStatus, PenawaranBahanInput, PenawaranDetail, SavePenawaranInput } from '@/domains/ppic/types';

export type StatusPenawaran = 'Draft' | 'Publish';

export const STATUS_UI: Record<PenawaranApiStatus, StatusPenawaran> = { DRAFT: 'Draft', PUBLISH: 'Publish' };

// Names must match the backend enum exactly, and the array order is the order shown on screen.
export const KATEGORI_BAHAN = ['Lembaran & Bahan Baku', 'Supplier', 'Perabotan', 'Finishing', 'Packing', 'Tenaga'] as const;

// Nilai disimpan apa adanya dari input form (string), angka dihitung saat ditampilkan
export interface BarisBahan {
  namaBahan: string;
  satuan: string;
  panjang: string;
  lebar: string;
  tinggi: string;
  jumlahSatuan: string;
  jumlahOrder: string;
  hargaSatuan: string;
  keterangan: string;
}

export interface EstimasiPenawaran {
  namaClient: string;
  namaProyek: string;
  tanggal: string; // YYYY-MM-DD
  pekerjaan: string;
  ruangan: string;
  ukuran: string;
  jumlah: string;
  tglMulaiProduksi: string; // YYYY-MM-DD
  tglSelesaiProduksi: string; // YYYY-MM-DD
  bahan: BarisBahan[][]; // urutannya mengikuti KATEGORI_BAHAN
}

export const penawaran_harga_path = '/dashboard/ppic/master/penawaran-harga';

// Purchasing reuses these screens under its own route, so links keep the base of the page being viewed.
export const penawaranBasePath = (pathname: string) => pathname.replace(/(\/penawaran-harga).*$/, '$1');

export const estimasiPenawaranPath = (id: number | string, base = penawaran_harga_path) => `${base}/estimasi-penawaran-biaya/${id}`;

export const barisBahanKosong = (): BarisBahan => ({
  namaBahan: '', satuan: '', panjang: '', lebar: '', tinggi: '', jumlahSatuan: '', jumlahOrder: '', hargaSatuan: '', keterangan: '',
});

// The backend returns 0 for an empty number, so 0 is shown as an empty input.
const angkaKeInput = (value: number) => (value ? String(value) : '');
const inputKeAngka = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const detailKeForm = (detail: PenawaranDetail): EstimasiPenawaran => ({
  namaClient: detail.namaClient,
  namaProyek: detail.namaProyek,
  tanggal: detail.tanggal.slice(0, 10),
  pekerjaan: detail.pekerjaan ?? '',
  ruangan: detail.ruangan ?? '',
  ukuran: detail.ukuran ?? '',
  jumlah: detail.jumlah ?? '',
  tglMulaiProduksi: detail.tglMulaiProduksi?.slice(0, 10) ?? '',
  tglSelesaiProduksi: detail.tglSelesaiProduksi?.slice(0, 10) ?? '',
  bahan: KATEGORI_BAHAN.map((nama) => {
    const rows: BarisBahan[] = (detail.kategori.find((k) => k.kategori === nama)?.bahan ?? []).map((b) => ({
      namaBahan: b.namaBahan,
      satuan: b.satuan ?? '',
      panjang: angkaKeInput(b.panjang),
      lebar: angkaKeInput(b.lebar),
      tinggi: angkaKeInput(b.tinggi),
      jumlahSatuan: angkaKeInput(b.jumlahSatuan),
      jumlahOrder: angkaKeInput(b.jumlahOrder),
      hargaSatuan: angkaKeInput(b.hargaSatuan),
      keterangan: b.keterangan ?? '',
    }));
    // Each category always shows at least two rows to fill in.
    while (rows.length < 2) rows.push(barisBahanKosong());
    return rows;
  }),
});

const barisKosong = (b: BarisBahan) => Object.values(b).every((v) => v.trim() === '');

export const formKePayload = (form: EstimasiPenawaran): SavePenawaranInput => ({
  namaClient: form.namaClient.trim(),
  namaProyek: form.namaProyek.trim(),
  ...(form.tanggal ? { tanggal: form.tanggal } : {}),
  pekerjaan: form.pekerjaan,
  ruangan: form.ruangan,
  ukuran: form.ukuran,
  jumlah: form.jumlah,
  tglMulaiProduksi: form.tglMulaiProduksi || null,
  tglSelesaiProduksi: form.tglSelesaiProduksi || null,
  // Fully empty rows are dropped; the backend requires a name for every row that is sent.
  bahan: form.bahan.flatMap((rows, k) =>
    rows
      .filter((b) => !barisKosong(b))
      .map((b): PenawaranBahanInput => ({
        kategori: KATEGORI_BAHAN[k],
        namaBahan: b.namaBahan.trim(),
        satuan: b.satuan,
        panjang: inputKeAngka(b.panjang),
        lebar: inputKeAngka(b.lebar),
        tinggi: inputKeAngka(b.tinggi),
        jumlahSatuan: inputKeAngka(b.jumlahSatuan),
        jumlahOrder: inputKeAngka(b.jumlahOrder),
        hargaSatuan: Math.trunc(inputKeAngka(b.hargaSatuan)),
        keterangan: b.keterangan,
      })),
  ),
});
