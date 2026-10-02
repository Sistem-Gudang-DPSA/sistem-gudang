# Sistem Gudang — Permintaan Pembelian di PPIC dan Rekap Pembelian

## Ringkasan

Permintaan Pembelian dipindahkan dari divisi Gudang ke divisi PPIC, karena
yang membuat permintaan adalah PPIC. Admin Gudang tidak punya permission
`purchase-request.create`, sehingga membuat permintaan dari menu Gudang
selalu gagal dengan pesan `Missing permission: purchase-request.create`.
Layar Rekap Pembelian buatan imel di PPIC dan Purchasing juga disambungkan
ke backend dan memakai data yang sama dengan Permintaan Pembelian.

## Yang Dikerjakan

- Daftar dan form Tambah Permintaan Pembelian pindah ke
  `src/domains/ppic/components` dan route-nya ke
  `/dashboard/ppic/transaksi/permintaan-pembelian`. Route lama di
  `/dashboard/gudang/transaksi` dihapus.
- Fungsi `listApprovals` dan `createPurchaseRequest` serta tipe approval
  pindah dari `gudang` ke `ppic`, supaya kode berada di domain yang
  memakainya.
- Menu sidebar diperbarui. PPIC mendapat Permintaan Pembelian dan Rekap
  Pembelian untuk permission `purchase-request.create`. Purchasing mendapat
  Rekap Pembelian untuk permission `purchase-request.approve`. Menu
  Permintaan Pembelian di Gudang dihapus.
- Rekap Pembelian PPIC dan Purchasing, Detail Permintaan Pembelian, dan
  halaman Buat PO membaca `/approvals` dengan `type=purchase-request`.

## Alur Persetujuan

PPIC membuat permintaan dan langsung masuk ke Purchasing. Purchasing
memutuskan di halaman Detail Permintaan Pembelian: Setuju, Tolak, atau
Revisi. Tolak dan Revisi wajib memakai catatan. Tombol Buat PO baru
muncul setelah status Disetujui, dan halaman Buat PO menolak permintaan
yang belum disetujui. PPIC hanya melihat status. Detail memakai
`GET /approvals/{id}/actions`, karena backend tidak punya
`GET /approvals/{id}`.

Alur ini bergantung pada workflow backend dua langkah, yaitu PPIC sebagai
pemohon lalu Purchasing sebagai penyetuju. Sebelum aturan itu diubah,
backend masih punya langkah Inventory di depan Purchasing.

## Yang Belum Tersambung

- PPIC belum bisa mengirim ulang dan mengubah permintaan yang statusnya
  Perlu Revisi. Backend mendukung resubmit dengan payload baru, tetapi
  layar edit belum dibuat.
- Riwayat aksi dari `/actions` belum ditampilkan, karena skema item
  riwayat belum didokumentasikan di OpenAPI.

- Simpan PO masih di memori dan hilang saat halaman di-refresh, karena
  backend belum punya endpoint PO.
- Lampiran Rekap Dokubah dan Kartu Stok selalu kosong, karena payload
  `purchase-request` tidak punya field lampiran.
- Backend membatasi daftar approval ke tipe yang domain pengguna punya
  langkah workflow-nya. Pastikan role Purchasing dan PPIC memang punya
  langkah untuk `purchase-request` saat uji manual.
