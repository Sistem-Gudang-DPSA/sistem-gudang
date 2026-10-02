# Sistem Gudang — Rencana Selanjutnya

## Ringkasan

Dokumen ini mencatat urutan pekerjaan yang belum digarap, supaya
lanjutannya tidak dimulai dari nol menyusun ulang prioritas.

## Status Saat Ini

Selesai dan tersambung ke API asli:

- Auth: login, refresh, logout (`01-Integrasi-Auth.md`).
- Superadmin: list role, kelola user penuh, yaitu list, tambah, edit, dan
  hapus.
- Item, Location, dan Supplier (`02-Integrasi-Inventory-Item-Lokasi.md`,
  `03-Integrasi-Data-Supplier.md`).
- Divisi Gudang: barang masuk, barang keluar, stock opname, laporan barang masuk, laporan barang keluar, dan rekap
  permintaan (`06-Integrasi-Modul-Gudang.md`).
- Tampilan Gudang dari Cal, Rekap Stok Opname dan Rekap Dokubah di menu
  Laporan Gudang, serta Detail Rekap Permintaan dengan sisa kuota dari
  Dokubah (`08-Tampilan-Gudang-dan-Detail-Rekap-Permintaan.md`).
- PPIC: Dokubah, SPK Internal, Rekap Dokubah, Rekap Mutasi Barang, dan
  Rekap Stok Opname PPIC, termasuk pilihan SPK dan Penanggung Jawab dari
  tracking (`07-Integrasi-PPIC-Dokubah-dan-SPK-Internal.md`).
- Permintaan Pembelian di PPIC dan Rekap Pembelian PPIC serta Purchasing
  (`09-Permintaan-Pembelian-PPIC-dan-Rekap-Pembelian.md`).

Belum disentuh atau belum selesai:

- Alur approval. Endpoint `/approvals` sudah ada di `docs/api-1.json`
  untuk approve, reject, minta revisi, dan resubmit, dan Dokubah punya
  endpoint `submit`, `approve`, dan `reject` sendiri. Belum ada layar
  untuk keduanya, dan halaman Approval PPIC masih kosong.
- Penawaran harga PPIC dan histori harga bulanan per supplier di
  Purchasing. Layar Penawaran Harga PPIC masih memakai data contoh,
  tombolnya belum berfungsi, dan backend belum punya endpoint maupun
  rancangan skema.
- Tampilan semua halaman belum pernah diuji di browser. Pengujian
  sejauh ini sampai lapisan API.

## Urutan yang Disarankan

1. **Uji manual di browser.** Mulai dari alur Dokubah, SPK Internal, dan
   halaman Gudang yang elemennya diubah. Pastikan juga menu PPIC muncul
   untuk role PPIC, karena divisi itu bergantung pada permission
   `material-request.create` atau `purchase-request.create`.
2. **Alur approval.** Rancang bersama backend untuk tiga kebutuhan:
   persetujuan permintaan pembelian, persetujuan atau penolakan Dokubah
   oleh Koor Inventory, dan persetujuan permintaan material yang
   kuotanya habis dengan status `Perlu Approval`. Dokumen ini dibuat
   setelah semua domain selesai.
3. **Rapikan sisa keputusan PPIC dan Gudang.** Pilihan Tujuan Produksi
   selain `STOCK`, konfirmasi asumsi `totalBisaPakai`, tombol Simpan
   Draft di Buat SPK Internal, tujuan tombol Edit di Detail Rekap
   Permintaan, dan apakah View Detail di Rekap Permintaan mengarah ke
   halaman detail yang baru.
4. **Penghubung backend yang masih tiruan.** Backend memakai data tiruan
   untuk tracking, dan realisasi Dokubah belum terhubung ke barang
   keluar sehingga nilainya selalu 0 kecuali di data seed.
5. **Penawaran harga PPIC dan histori harga per supplier.** Fitur yang
   butuh rancangan skema.
6. **Perapian sisa.** Pola `useApiData` dan paginasi sudah dikerjakan
   untuk daftar utama (`10-Perapian-Lint-dan-Paginasi.md`). Sisanya
   adalah paginasi untuk laporan yang menghitung ringkasan, yang butuh
   ringkasan dari backend lebih dulu, serta pemeriksaan dampak
   `globals.css` shadcn di semua halaman.

## Status dan Langkah Berikutnya

Divisi Gudang dan PPIC selesai tersambung, kecuali alur approval dan
Penawaran Harga. Lanjutkan dari poin 1 di atas. Dokumen berikutnya beri
nomor `13-<Judul-Singkat>.md` sesuai konvensi di `00-Template-Docs.md`.
