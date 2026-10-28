export type ChecklistDokubah = {
  id: number;
  kodeDokubah: string;
  namaClient: string;
  namaItem: string;
};

// Data contoh untuk tampilan. Ganti dengan data dari API.
const daftar: ChecklistDokubah[] = [
  { id: 1, kodeDokubah: "", namaClient: "", namaItem: "" },
  { id: 2, kodeDokubah: "", namaClient: "", namaItem: "" },
];

export const getChecklistDokubahList = (): ChecklistDokubah[] => daftar;

export const getChecklistDokubah = (id: number): ChecklistDokubah | undefined =>
  daftar.find((item) => item.id === id);