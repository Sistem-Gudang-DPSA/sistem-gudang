# Sistem Gudang — Rencana Selanjutnya

## Ringkasan

Dokumen ini mencatat status pekerjaan dan urutan yang belum digarap, supaya
lanjutannya tidak dimulai dari nol menyusun ulang prioritas. Status
terakhir diperbarui pada 2 Oktober 2026.

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

## Posisi Branch

- `dev` sudah memuat semua pekerjaan sampai nomor 12 dan sudah di-push.
- Branch `feat/sph-wiring` memuat pembaruan Imel dan Cal serta wiring SPH,
  dan belum di-merge. Branch itu menunggu uji di browser. Dua sisa
  pengujian sementara di branch Imel, yaitu halaman pratinjau tanpa login
  dan satu kelas CSS tes, sudah dibuang saat merge.
- Backend sudah men-push workflow dua langkah, PO, histori harga, dan
  realisasi Dokubah. Modul SPH di backend belum di-commit, dan permission
  `penawaran-harga.*` belum ada di role PPIC pada database dev, sehingga
  menu dan endpoint SPH belum bisa dipakai role PPIC.

## Belum Selesai

- Alur approval selain permintaan pembelian. Dokubah punya endpoint
  `submit`, `approve`, dan `reject` sendiri yang belum punya layar, dan
  halaman Approval PPIC masih kosong. Alur permintaan material yang
  kuotanya habis dengan status `Perlu Approval` juga belum ada. Ini
  sengaja ditunda sampai semua domain selesai diuji.
- Tracking asli. Backend masih memakai data tiruan untuk tracking dan
  menunggu kontrak sistem tracking.
- Layar daftar dan detail PO. Endpoint-nya sudah ada, tetapi FE belum
  punya layarnya.
- Arti tombol Rekap di daftar Penawaran Harga. Edit, Detail, dan Rekap
  masih menuju halaman yang sama.
- Tombol Download PDF di Detail Data Barang supplier belum berfungsi.
- Riwayat persetujuan belum menampilkan nama pelaku, karena backend hanya
  mengirim `actorId`.
- Tampilan layar baru, yaitu SPH dan cetak PDF dari Cal, belum diuji di
  browser. Layar pembelian, PO, histori harga, paginasi, dan validasi
  input sudah diuji.

## Urutan yang Disarankan

1. **Uji `feat/sph-wiring` di browser lalu merge ke `dev`.** Pastikan
   backend sudah menambahkan permission `penawaran-harga.*` ke role PPIC
   agar menu Penawaran Harga muncul.
2. **Rapikan sisa keputusan PPIC dan Gudang.** Pilihan Tujuan Produksi
   selain `STOCK`, konfirmasi asumsi `totalBisaPakai`, tombol Simpan
   Draft di Buat SPK Internal, tujuan tombol Edit di Detail Rekap
   Permintaan, dan apakah View Detail di Rekap Permintaan mengarah ke
   halaman detail yang baru.
3. **Layar daftar dan detail PO.** Endpoint sudah tersedia.
4. **Perapian sisa.** Paginasi untuk laporan yang menghitung ringkasan,
   yang butuh ringkasan dari backend lebih dulu. Cetak PDF dari Cal pada
   Rekap Permintaan hanya mencetak halaman yang tampil karena daftarnya
   sekarang dipaginasi 20 baris. Selain itu perlu pemeriksaan dampak
   `globals.css` shadcn di semua halaman, penghapusan halaman lama
   `penawaran-harga/detail-permintaan` yang tidak tertaut lagi, dan tujuh
   warning lint dari kode Cal berupa variabel dan import yang tidak terpakai.
5. **Tracking asli.** Menunggu kontrak sistem tracking dari backend.
6. **Alur approval umum.** Rancang bersama backend untuk persetujuan
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
pembelian dan tracking asli. Lanjutkan dari poin 1 di atas. Dokumen
berikutnya beri nomor `15-<Judul-Singkat>.md` sesuai konvensi di
`00-Template-Docs.md`.
