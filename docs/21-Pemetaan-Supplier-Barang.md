# Sistem Gudang — Pemetaan Supplier Barang

## Ringkasan

Layar Data Barang di Purchasing dan Superadmin punya checkbox per baris.
Barang yang dicentang bisa dipetakan ke satu supplier lewat tombol Atur
Supplier. Fitur ini melengkapi filter Supplier yang sudah ada, termasuk
pilihan Belum ada supplier, sehingga barang yang belum terpetakan mudah
ditemukan dan diperbaiki sekaligus.

## Alur Pengguna

- Centang barang pada satu atau beberapa halaman. Pilihan disimpan per id,
  jadi tidak hilang saat pindah halaman, mencari, atau mengurutkan.
- Tekan Edit Supplier. Tombol menampilkan jumlah barang yang dicentang.
- Pilih supplier pada dropdown yang bisa dicari, atau pilih Kosongkan
  supplier untuk menghapus supplierId.
- Bila sebagian barang terpilih sudah punya supplier, modal menampilkan
  jumlah barang yang akan diganti.
- Tekan Tinjau sebelum menyimpan. Layar tinjauan menampilkan supplier
  tujuan, jumlah barang, nama barang, kode, dan supplier saat ini untuk
  setiap barang. Tombol Kembali membuka lagi pilihan supplier, dan tombol
  Simpan baru tersedia di layar tinjauan.
- Selama menyimpan, tombol menampilkan progres jumlah barang yang sudah
  dikirim.
- Setelah selesai, layar menampilkan jumlah barang yang berhasil beserta
  nama supplier. Barang yang gagal ditampilkan lengkap dengan alasannya dan
  tetap tercentang supaya bisa dicoba ulang.
- Daftar barang dimuat ulang setelah penyimpanan.

## Endpoint dan Izin

- Setiap barang disimpan dengan `PUT /api/v1/items/{id}` yang hanya berisi
  `{ "supplierId": <id> }`, atau `{ "supplierId": null }` untuk
  mengosongkan. Field lain tidak dikirim, sehingga harga, kategori, satuan,
  dan stok tidak ikut berubah.
- Backend mensyaratkan `item.update` dan `item.set-supplier`. Tombol dan
  checkbox hanya tampil bila pengguna punya keduanya.
- Belum ada endpoint bulk untuk supplier. Frontend mengirim barang satu per
  satu secara berurutan, lalu mengumpulkan kegagalan. Pola ini cukup untuk
  puluhan barang per aksi. Bila nanti dipakai untuk ratusan barang
  sekaligus, endpoint `POST /api/v1/items/assign-supplier/bulk` perlu
  ditambahkan di backend.

## Batasan

- Satu barang hanya punya satu supplier, mengikuti field `supplierId` di
  master barang. Relasi banyak supplier per barang belum didukung.
- Pengosongan supplier juga memakai alur yang sama dan tetap memerlukan
  izin `item.set-supplier`.
- Perubahan supplier hanya menyentuh master barang. Transaksi lama dan
  riwayat harga supplier tidak berubah.

## Berkas Terkait

- `src/domains/inventory/item-supplier.ts`: pengiriman berurutan dan
  pengumpulan kegagalan.
- `src/domains/inventory/components/data-barang/BulkSupplierAction.tsx`:
  tombol, modal, dan pemanggilan API yang dipakai Purchasing dan Superadmin.
- `src/domains/inventory/components/data-barang/modals/SupplierBulkModal.tsx`:
  tampilan modal bersama.
