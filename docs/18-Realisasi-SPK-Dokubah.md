# Realisasi SPK: Data Barang Keluar Sekarang, Dokubah Nanti

Issue: #38

## Ringkasan

Halaman Realisasi SPK (`/dashboard/gudang/laporan/realisasi-dokubah`) memakai
tampilan baru dari PR #36 (daftar per SPK, ringkasan, halaman rincian per SPK),
tetapi datanya sementara diambil dari **barang keluar**, bukan dari dokubah PPIC.
Halaman daftar dan rincian menampilkan notice tentang hal ini.

URL lama `/dashboard/gudang/laporan/realisasi-spk` mengalihkan ke URL Gudang
di atas. Kedua URL memerlukan permission `dokubah.view`.

## Akses Purchasing

Menu **Purchasing → Laporan → Realisasi SPK** membuka
`/dashboard/purchasing/laporan/realisasi-spk` dengan permission `report.view`.
Route ini me-re-export layar Gudang yang sama, termasuk pencarian, filter,
centang baris, Export Excel, dan Print PDF. Baris tidak membuka rincian divisi lain.
Ekspor memakai baris yang dicentang, atau seluruh hasil pencarian dan filter
jika tidak ada yang dicentang. Sumber datanya tetap `GET /outbound/usage`
dan `GET /items`; akses endpoint mengikuti permission backend.

## Latar Belakang

PR #36 menghitung realisasi dari dokubah berstatus `APPROVED`. Modul PPIC belum
dipakai, sehingga belum ada dokubah dan halaman kosong. Sampai PPIC berjalan,
data diambil dari `GET /outbound/usage`.

## Cara Kerja Sementara

- Satu baris per No. SPK yang punya barang keluar pada periode filter.
- Realisasi = jumlah barang keluar x harga barang saat ini (dari Data Barang).
- Anggaran, sisa anggaran, status Untung/Rugi, dan jumlah SPK overbudget
  ditampilkan `-`, karena anggaran hanya ada di dokubah.
- Pencarian, urutan, dan paginasi dikerjakan di browser, karena data per periode
  diambil sekaligus.
- Rincian per SPK dibuka lewat No. SPK di URL (di-encode, karena No. SPK bisa
  berisi `/`).
- Export Excel dan PDF menandai sumber data sebagai Barang Keluar.

## Cara Beralih ke Dokubah

Lakukan setelah PPIC rutin membuat dan menyetujui dokubah.

1. Ganti `loadRealisasiList` dan `loadRincianSpk` di
   `src/domains/inventory/components/RealisasiSPK.tsx` dengan versi dokubah dari
   commit `2a26f4e` (`listDokubahRows`, `getDokubah`, `toRealisasiRow`).
2. Kembalikan id baris dan URL rincian ke id dokubah (angka), serta paginasi,
   pencarian, dan urutan ke server.
3. Isi kembali kartu ringkasan dari `summary` API dokubah.
4. Hapus `SUMBER_DATA_NOTICE`, label sumber di export, dan komentar
   `TODO(realisasi-dokubah)`.
5. Putuskan apakah data barang keluar tetap ditampilkan berdampingan.
