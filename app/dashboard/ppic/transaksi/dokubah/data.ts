// Data sementara (dummy) Dokubah, dipakai halaman daftar dan halaman View.

export type BahanDokubah = {
  kode: string;
  nama: string;
  satuan: string;
  kuota: number;
  realisasi: number;
  harga: number;
  keterangan: string;
};

export type Dokubah = {
  id: number;
  spk: string;
  proyek: string;
  client: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  status: string;
  anggaran: number;
  biayaAktual: number;
  bahan: BahanDokubah[];
};

export const STATUS_OPTIONS = ["Proses", "Selesai", "Batal"];

export const dataDokubah: Dokubah[] = [
  {
    id: 1,
    spk: "SPK-2026-001",
    proyek: "Hermina Banyumanik",
    client: "PT Bintang Raya",
    tanggalMulai: "01/09/2026",
    tanggalSelesai: "30/09/2026",
    status: "Proses",
    anggaran: 150000000,
    biayaAktual: 87500000,
    bahan: [
      { kode: "BRG-001", nama: "Triplex 3mm", satuan: "Lembar", kuota: 100, realisasi: 60, harga: 85000, keterangan: "" },
      { kode: "BRG-002", nama: "Cat Putih 5kg", satuan: "Kaleng", kuota: 40, realisasi: 25, harga: 150000, keterangan: "" },
    ],
  },
];
