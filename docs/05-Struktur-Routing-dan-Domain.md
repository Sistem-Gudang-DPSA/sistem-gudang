# Sistem Gudang — Struktur Routing dan Domain

## Ringkasan

Dokumen ini menjelaskan konvensi struktur folder yang dipakai di proyek ini,
yaitu pemisahan antara routing App Router di `src/app` dan logic fitur di
`src/domains`. Dokumen ini juga mencatat perbaikan branch `dev` yang masih
membawa folder `app/` lama di root, peninggalan sebelum proyek direstruktur
ke `src/`.

## Latar Belakang

Proyek ini awalnya dibuat dengan Next.js App Router langsung di `app/` root,
lalu direstruktur supaya route dan logic fitur terpisah rapi (lihat riwayat
commit "fix: restructure folder to more readable" di branch
`cal-lapbrgmskGdg`). Branch `dev` sempat menerima pekerjaan baru di folder
`app/` lama secara paralel sebelum restrukturisasi itu di-merge, sehingga
setelah merge, `dev` punya dua App Router sekaligus: `app/` di root dan
`src/app/`. Next.js tidak mendukung dua App Router aktif bersamaan di satu
proyek, jadi ini berpotensi membuat build gagal atau routing ambigu.

## Keputusan

| Keputusan | Alasan |
|---|---|
| Satu-satunya App Router yang dipakai adalah `src/app`. | Konsisten dengan `AGENTS.md` dan menghindari konflik routing dengan Next.js. |
| Route di `src/app` hanya berisi glue tipis, biasanya `export { default } from "@/domains/<domain>/components/<Nama>"`. | Memisahkan definisi URL dari logic fitur, supaya logic bisa dites dan dipakai ulang tanpa terikat pada satu route. |
| Logic dan UI fitur ditulis di `src/domains/<domain>/components`. | Satu tempat jelas untuk mencari kode sebuah fitur, terlepas dari path URL-nya. |
| Isi `app/` root yang sudah ada padanannya persis di `src/` dihapus langsung, tanpa migrasi ulang. | Filenya identik byte demi byte, jadi menyalinnya lagi hanya menambah risiko drift. |
| Isi `app/` root yang belum punya padanan dimigrasikan dulu ke `src/domains` sebelum folder `app/` dihapus. | Menghapus tanpa memindah akan menghilangkan pekerjaan yang belum sempat direstruktur. |

## Perubahan

### Pola route glue

Contoh nyata yang sudah ada di repo, di `src/app/dashboard/ppic/transaksi/dokubah/page.tsx`:

```tsx
export { default } from "@/domains/ppic/components/Dokubah";
```

Komponen sesungguhnya ada di `src/domains/ppic/components/Dokubah.tsx`. Pola
ini yang diikuti setiap kali menambah route baru: buat komponennya di
`src/domains/<domain>/components`, lalu re-export dari file route di
`src/app`.

### Migrasi `app/dashboard/ppic/laporan/rekap-dokubah`

Satu-satunya file di `app/` root yang punya isi asli dan belum ada di
`src/` adalah halaman laporan Rekap Dokubah PPIC. File ini dipindah dengan:

- Logic dan UI (287 baris) dipindah ke
  `src/domains/ppic/components/RekapDokubah.tsx` tanpa perubahan perilaku.
- Route barunya di `src/app/dashboard/ppic/laporan/rekap-dokubah/page.tsx`
  hanya berisi re-export ke komponen tersebut.

### Migrasi `app/dashboard/ppic/master/penawaran-harga`

Halaman Penawaran Harga PPIC (103 baris, daftar permintaan) dan halaman
detailnya di `detail-permintaan` (139 baris) sempat tidak dicek sebelum
`app/` dihapus di iterasi pertama pembersihan folder, sehingga hilang dari
`dev` walau masih dilink dari menu navigasi di
`src/app/dashboard/layout.tsx`. Keduanya dipindah ke:

- `src/domains/ppic/components/PenawaranHarga.tsx`
- `src/domains/ppic/components/PenawaranHargaDetailPermintaan.tsx`

dengan route glue tipis masing-masing di
`src/app/dashboard/ppic/master/penawaran-harga/page.tsx` dan
`src/app/dashboard/ppic/master/penawaran-harga/detail-permintaan/page.tsx`.

### Penghapusan `app/` root

Sisa file lain di `app/` root dihapus setelah setiap pasangan file
dibandingkan isinya (bukan cuma jumlah baris), dan masuk salah satu dari
kategori berikut:

- File placeholder kosong (0 byte), belum ada isinya di kedua sisi.
- File dengan isi identik dengan versi yang sudah ada di `src/app` atau
  `src/domains` (misalnya `app/favicon.ico` dan `app/globals.css` sama
  persis dengan `src/app/favicon.ico` dan `src/app/globals.css`).
- File yang isinya sudah dievolusikan di `src/domains` menjadi versi
  tersambung API asli, menggantikan versi mock lama di `app/` (misalnya
  `DataBarang.tsx`, `DataSupplier.tsx`, `Users.tsx`). Ini bukan kehilangan
  fitur, karena versi baru punya lebih banyak handler dan integrasi API
  dibanding versi lama, sesuai commit history "feat: connect X to backend
  api" di branch `cal-lapbrgmskGdg`.

## Status dan Langkah Berikutnya

Branch `dev` sekarang hanya punya satu App Router di `src/app`, sudah
diverifikasi lolos `next build`, `eslint`, dan `vitest run`, termasuk
setelah migrasi susulan halaman Penawaran Harga. Beberapa error lint yang
tersisa (`react-hooks/set-state-in-effect` di `DataSupplier.tsx` dan
`Users.tsx`) sudah ada sebelum perubahan ini dan tidak berkaitan dengan
restrukturisasi folder, jadi belum diperbaiki di sini.

## Folder Gudang Digabung ke Inventory

Divisi Gudang di sisi backend bernama domain Inventory, dan role-nya Koor
Inventory dan Staf Inventory. Di FE sebelumnya ada dua folder untuk hal yang
sama: `src/domains/inventory` hanya berisi API dan tipe barang dan lokasi,
sedangkan `src/domains/gudang` berisi layar divisi dan API transaksinya.
Keduanya digabung ke `src/domains/inventory`: komponen layar ada di
`components`, `api.ts` dan `types.ts` memuat barang, lokasi, barang masuk,
barang keluar, stock opname, dan permintaan material, dan `date.ts` serta
`quota.ts` ikut pindah beserta test-nya.

Route dan menu tetap bernama `gudang`. URL `/dashboard/gudang`, folder
`src/app/dashboard/gudang`, kunci divisi `gudang` di `nav.ts`, dan tulisan
Gudang di layar tidak berubah. Dokumen lama yang menyebut
`src/domains/gudang` sudah disesuaikan ke `src/domains/inventory`.

