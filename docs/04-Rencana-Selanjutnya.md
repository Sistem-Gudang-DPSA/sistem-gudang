# Sistem Gudang — Rencana Selanjutnya

## Ringkasan

Pekerjaan sampai hari ini murni seputar data barang: master Item,
Location, Supplier, plus Auth dan Superadmin dasar yang jadi
prasyaratnya. Dokumen ini mencatat urutan yang belum digarap, supaya
lanjutannya tidak dimulai dari nol menyusun ulang prioritas.

## Status Saat Ini

Selesai dan tersambung ke API asli:

- Auth: login, refresh, logout (`01-Integrasi-Auth.md`).
- Superadmin: list role, kelola user penuh (list, tambah, edit, hapus).
- Item: list, tambah, edit, hapus, assign lokasi, sesuaikan stok
  (`02-Integrasi-Inventory-Item-Lokasi.md`).
- Location: list, tambah.
- Supplier: list, tambah, edit, hapus (`03-Integrasi-Data-Supplier.md`).

Belum disentuh sama sekali, sengaja menunggu giliran:

- Dokubah (PPIC).
- Transaksi Gudang: barang masuk, barang keluar, stock opname.
- Approval / Permintaan Pembelian.
- Laporan/rekap semua divisi.
- Penawaran harga (PPIC), histori harga bulanan per supplier (Purchasing).

## Urutan yang Disarankan

1. **Approval / Permintaan Pembelian.** `GET /api/v1/approvals` (list)
   sudah ada di backend, tinggal disambungkan ke halaman
   `gudang/transaksi/permintaan-pembelian` untuk bagian tampilan datanya.
   Form "Tambah" masih tertahan karena field di form (bagian, nama
   pemohon, jabatan, tanggal, proyek, no SPK) tidak cocok dengan skema
   `payload` yang backend terima (cuma `barangId`, `qty`, `notes`).
   Perlu keputusan dari tim backend dulu: field itu ditambahkan ke skema,
   atau form di FE yang disederhanakan mengikuti skema yang ada.
2. **Transaksi Gudang (barang masuk, barang keluar, stock opname).**
   Belum ada endpoint sama sekali. Ini beda dari `PATCH
   /items/{id}/stock` yang sudah ada sekarang, karena endpoint itu
   sifatnya penyesuaian satu angka dengan alasan bebas, bukan pencatatan
   transaksi terstruktur (nomor referensi, pemasok/tujuan, status QC,
   dll).
3. **Dokubah (PPIC).** Belum ada endpoint. Field yang dibutuhkan belum
   dikonfirmasi ke tim PPIC.
4. **Laporan/rekap semua divisi.** Baru bisa digarap setelah poin 2 dan
   3 ada, karena laporan meringkas data transaksi yang belum tercatat di
   backend.
5. **Penawaran harga (PPIC) dan histori harga bulanan per supplier
   (Purchasing).** Keduanya fitur baru yang belum punya endpoint maupun
   rancangan skema data.

Urutan ini ikut urutan menu di sidebar per divisi (Master lalu Transaksi
lalu Laporan), bukan urutan sembarang, supaya satu divisi bisa
diselesaikan penuh sebelum pindah ke divisi lain kalau tim backend mau
kerja per-divisi.

## Status dan Langkah Berikutnya

Menunggu tim backend menyelesaikan salah satu dari lima poin di atas,
lalu lanjutkan dari sana. Dokumen integrasi berikutnya beri nomor
`05-Integrasi-<Nama-Modul>.md` sesuai konvensi di `00-Template-Docs.md`.
