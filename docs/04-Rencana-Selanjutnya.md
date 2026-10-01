# Sistem Gudang — Rencana Selanjutnya

## Ringkasan

Dokumen ini mencatat urutan pekerjaan yang belum digarap, supaya
lanjutannya tidak dimulai dari nol menyusun ulang prioritas.

## Status Saat Ini

Selesai dan tersambung ke API asli:

- Auth: login, refresh, logout (`01-Integrasi-Auth.md`).
- Superadmin: list role, kelola user penuh (list, tambah, edit, hapus).
- Item, Location, dan Supplier (`02-Integrasi-Inventory-Item-Lokasi.md`,
  `03-Integrasi-Data-Supplier.md`).
- Divisi Gudang: barang masuk, barang keluar, stock opname, permintaan
  pembelian, laporan barang masuk, laporan barang keluar, dan rekap
  permintaan (`06-Integrasi-Modul-Gudang.md`).

Belum disentuh:

- Dokubah (PPIC). Belum ada endpoint, dan istilah "Dokubah" belum
  didefinisikan di dokumen mana pun.
- Rekap Stock Opname dan Rekap Dokubah di menu Laporan Gudang. Menunya
  ada, halamannya belum. Endpoint sengaja ditunda backend sampai
  halamannya ada.
- Alur approval di sisi PPIC (approve, reject, minta revisi, resubmit).
  Endpoint sudah ada di `docs/api-1.json`.
- Penawaran harga (PPIC) dan histori harga bulanan per supplier
  (Purchasing). Belum punya endpoint maupun rancangan skema.

## Urutan yang Disarankan

1. **Alur approval di PPIC.** `POST /approvals/{id}/approve`, `/reject`,
   `/request-revision`, dan `/resubmit` serta `GET /approvals/{id}/actions`
   sudah tersedia. Frontend gudang saat ini hanya membuat dan melihat
   permintaan, belum ada layar untuk menyetujui atau merevisi.
2. **Dokubah (PPIC).** Tentukan dulu arti dan field yang dibutuhkan
   bersama tim PPIC, lalu minta endpoint ke backend.
3. **Rekap Stock Opname dan Rekap Dokubah di Gudang.** Buat halamannya,
   lalu minta endpoint laporan sesuai kebutuhan tampilannya.
4. **Penawaran harga (PPIC) dan histori harga per supplier
   (Purchasing).** Fitur baru yang butuh rancangan skema.
5. **Perapian.** Ganti pola pemuatan data di PPIC, Purchasing, dan
   Superadmin dengan `useApiData`, periksa dampak `globals.css` shadcn
   di semua halaman, dan tambahkan paginasi.

## Status dan Langkah Berikutnya

Modul Gudang selesai. Lanjutkan dari poin 1 di atas. Dokumen integrasi
berikutnya beri nomor `07-Integrasi-<Nama-Modul>.md` sesuai konvensi di
`00-Template-Docs.md`.
