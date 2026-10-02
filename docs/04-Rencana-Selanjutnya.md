# Sistem Gudang — Rencana Selanjutnya

## Ringkasan

Dokumen ini mencatat status pekerjaan dan urutan yang belum digarap, supaya
lanjutannya tidak dimulai dari nol menyusun ulang prioritas. Status
terakhir diperbarui pada 2 Oktober 2026, setelah penggabungan folder
`gudang` ke `inventory` dan push ke remote.

## Status Saat Ini

Selesai dan tersambung ke API asli:

- Auth: login, refresh, logout (`01-Integrasi-Auth.md`).
- Superadmin: list role dan kelola user penuh, yaitu list, tambah, edit, dan
  hapus.
- Item, Location, dan Supplier (`02-Integrasi-Inventory-Item-Lokasi.md`,
  `03-Integrasi-Data-Supplier.md`).
- Divisi Gudang: barang masuk, barang keluar, stock opname, laporan barang
  masuk, laporan barang keluar, dan rekap permintaan
  (`06-Integrasi-Modul-Gudang.md`).
- Tampilan Gudang dari Cal, Rekap Stok Opname dan Rekap Dokubah di menu
  Laporan Gudang, serta Detail Rekap Permintaan dengan sisa kuota dari
  Dokubah (`08-Tampilan-Gudang-dan-Detail-Rekap-Permintaan.md`).
- PPIC: Dokubah, SPK Internal, Rekap Dokubah, Rekap Mutasi Barang, dan
  Rekap Stok Opname PPIC, termasuk pilihan SPK dan Penanggung Jawab dari
  tracking (`07-Integrasi-PPIC-Dokubah-dan-SPK-Internal.md`).
- Alur pembelian: PPIC membuat Permintaan Pembelian, Purchasing menyetujui,
  menolak, atau meminta revisi, PPIC mengirim ulang setelah revisi, dan
  riwayat persetujuan tampil di detail
  (`09-Permintaan-Pembelian-PPIC-dan-Rekap-Pembelian.md`). Workflow
  backend dua langkah, yaitu PPIC lalu Purchasing.
- Perapian lint dan paginasi sungguhan untuk daftar utama
  (`10-Perapian-Lint-dan-Paginasi.md`) serta batasan input angka dan
  teks di form utama (`11-Batasan-Input-Form.md`).
- Buat PO ke endpoint PO dengan nomor dan total dari backend, grid harga
  bulanan per supplier, dan field Pajak Vendor
  (`12-Pemesanan-Pembelian-dan-Histori-Harga-Supplier.md`). Rumus pajak
  mengikuti rancangan Imel.
- Penawaran Harga dan Estimasi Penawaran Biaya buatan Imel, dengan client
  dan projek terpisah serta Publish yang mengunci
  (`13-Penawaran-Harga-SPH.md`).
- Realisasi Dokubah di backend sekarang dihitung dari barang keluar, hanya
  untuk Dokubah yang sudah disetujui.
- Test untuk seluruh bagian aplikasi, dashboard tiap divisi dengan data
  asli, serta sidebar dan tombol yang mengikuti permission role
  (`14-Test-Menyeluruh-Dashboard-dan-Ability.md`). Laporan memakai
  ringkasan backend dan paginasi dari server.
- Kelanjutan dari backend yang sudah dipakai FE: filter `hasPurchaseOrder`
  untuk kartu "Disetujui, Belum Dibuat PO", ringkasan stok di `GET /items`
  untuk dashboard Gudang, dan `GET /locations` untuk filter lokasi di
  laporan Mutasi.
- Folder `src/domains/gudang` digabung ke `src/domains/inventory`, karena
  di backend divisi gudang bernama domain Inventory. Route, menu, dan
  tulisan Gudang tidak berubah (`05-Struktur-Routing-dan-Domain.md`).
- Kode mati dan halaman tanpa tautan dihapus, dan lint bersih tanpa
  warning.

## Posisi Branch

- `dev` sudah di-push ke remote `gh` dan memuat semua pekerjaan sampai
  catatan refactoring (commit `9fdd45a`). Semua branch kerja lokal yang
  sudah ter-merge dihapus, jadi lokal hanya tersisa `dev`.
- Branch Cal dan Imel di remote tidak diubah. Branch mereka masih memakai
  path lama `@/domains/gudang/`, jadi sebelum lanjut mereka perlu menarik
  `dev` terbaru. Setiap merge dari branch lama perlu mengganti
  `@/domains/gudang/` menjadi `@/domains/inventory/`.
- Backend sudah menyediakan ringkasan laporan, pencarian approvals, nama
  pelaku di riwayat, filter `hasPurchaseOrder`, ringkasan stok, dan data
  contoh. Perubahan itu masih berupa commit lokal di sisi backend dan
  menunggu user backend mem-push-nya. Tabel workflow approval sempat kosong
  di database dev karena test backend yang berjalan bersamaan, sudah
  dipulihkan, dan test backend sekarang menyimpan cadangannya. Test
  backend sebaiknya tidak dijalankan paralel di database dev yang sama.
- Berkas liar `src/domains/gudang/api.ts` beberapa kali muncul lagi karena
  tab editor lama menyimpannya kembali. Tutup tab `gudang/...` dan restart
  TypeScript server bila `tsc` melaporkan modul `@/domains/gudang/types`.

## Belum Selesai

- Alur approval selain permintaan pembelian. Dokubah punya endpoint
  `submit`, `approve`, dan `reject` sendiri yang belum punya layar, dan
  halaman Approval PPIC masih kosong. Alur permintaan material yang
  kuotanya habis dengan status `Perlu Approval` juga belum ada. Ini
  sengaja ditunda sampai semua domain selesai diuji.
- Tracking asli. Backend masih memakai data tiruan untuk tracking dan
  menunggu kontrak sistem tracking.
- Layar daftar dan detail PO. Endpoint-nya sudah ada dan dashboard
  Purchasing sudah menampilkan PO terbaru, tetapi FE belum punya layar
  daftar dan detail PO.
- Arti tombol Rekap di daftar Penawaran Harga. Edit, Detail, dan Rekap
  masih menuju halaman yang sama.
- Halaman Detail Rekap Permintaan Gudang belum tertaut dari Rekap
  Permintaan, menunggu keputusan tujuan tombol View Detail dan Edit.
- Tombol Download PDF di Detail Data Barang supplier belum berfungsi.
- Dropdown barang dan supplier masih dibatasi 100 baris.
- Tampilan layar baru belum diuji di browser: SPH, cetak PDF dari Cal,
  dashboard, paginasi laporan, filter periode baru di Rekap Dokubah PPIC
  yang berupa dua kolom tanggal, dan tombol yang tersembunyi per
  permission. Test otomatis sudah mencakupnya, tetapi uji manual tetap
  perlu.

## Urutan yang Disarankan

1. **Uji `dev` di browser.** Login sebagai `staf.ppic`, `koor.purchasing`,
   dan `koor.inventory`. Perhatikan sidebar tiap role, dashboard, SPH,
   paginasi laporan, dan tombol yang tersembunyi.
2. **Putuskan dua hal yang menggantung.** Arti tombol Rekap di daftar
   Penawaran Harga, serta tujuan tombol View Detail dan Edit di Rekap
   Permintaan Gudang, yang menentukan apakah halaman Detail Rekap
   Permintaan ditautkan atau dihapus. Satu test `it.fails` di
   `src/test/integration/routes.test.ts` menandai halaman itu dan harus
   diubah menjadi test biasa setelah diputuskan.
3. **Sinkronkan Cal dan Imel dengan `dev`.** Setelah itu pekerjaan
   perapian di nomor 5 aman dimulai.
4. **Layar daftar dan detail PO.** Endpoint sudah tersedia.
5. **Refactoring terarah** menurut `15-Catatan-Refactoring.md`: helper
   cetak dan `escapeHtml` bersama, pemformat dan modul approval keluar dari
   PPIC, hook halaman, `Modal`, token warna, tabel bersama untuk layar
   kembar, dan Prettier paling akhir. Selain itu perlu pemeriksaan dampak
   `globals.css` shadcn di semua halaman.
6. **Tracking asli.** Menunggu kontrak sistem tracking dari backend.
7. **Alur approval umum.** Rancang bersama backend untuk persetujuan
   Dokubah oleh Koor Inventory dan permintaan material yang kuotanya
   habis. Dokumen ini dibuat setelah semua domain selesai.

## Kolaborasi dengan Backend

FE dan BE bertukar informasi lewat sesi masing-masing. Masing-masing sisi
memiliki sub-agent liaison yang hanya membaca kode untuk menjawab
pertanyaan tentang layar, field, dan kontrak. Keputusan bisnis, perubahan
kode, dan izin tetap ke sesi utama dan pengguna masing-masing. Kontrak
OpenAPI backend disalin ke `docs/api-1.json` setiap kali berubah.

## Status dan Langkah Berikutnya

Semua domain tersambung ke backend, kecuali alur approval selain permintaan
pembelian dan tracking asli. Pekerjaan pembangunan sudah selesai, dan yang
tersisa adalah uji di browser, dua keputusan bisnis, sinkronisasi Cal dan
Imel, serta tracking dan approval umum. Lanjutkan dari poin 1 di atas. Dokumen
berikutnya beri nomor `16-<Judul-Singkat>.md` sesuai konvensi di
`00-Template-Docs.md`.
