# Sistem Gudang — Pemetaan Supplier Barang

## Ringkasan

Satu material bisa dipetakan ke beberapa supplier tanpa menduplikasi barang
atau stok. Purchasing dan Superadmin memakai modal **Edit Supplier** yang
sama di Data Barang. Aksi tersedia dengan `item.update` dan
`item.set-supplier`.

## Alur Pengguna

- Centang satu atau beberapa barang lalu tekan **Edit Supplier**.
- Jika hanya satu barang dipilih, supplier yang sudah dipetakan otomatis
  terpilih. Tambah supplier lewat dropdown yang bisa dicari; hilangkan
  centang untuk melepas salah satu supplier. Supplier tidak dapat dipilih
  dua kali.
- Jika beberapa barang dipilih, tentukan daftar supplier yang akan berlaku
  untuk semuanya. Daftar ini mengganti seluruh pemetaan masing-masing
  barang; bukan menambahkan supplier diam-diam ke daftar lama.
- Pilih **Kosongkan supplier** bila ingin melepas semua supplier.
- Tekan **Tinjau** untuk memeriksa nama supplier tujuan, barang, kode, dan
  seluruh supplier saat ini. **Kembali** mempertahankan pilihan.
- Tekan **Simpan**. Progress dan hasil seluruh barang ditampilkan. Barang
  yang gagal disertai alasannya dan tetap tercentang untuk dicoba ulang;
  barang yang berhasil dimuat ulang dari server.

## Detail Supplier per Material

Tabel Data Barang Purchasing menyediakan kolom **Aksi** dengan tombol
**Detail** untuk pengguna dengan `item.view`. Tombol membuka halaman
`/dashboard/purchasing/master/data-barang/[id]` yang memuat material melalui
`GET /api/v1/items/{id}`. Halaman menampilkan nama material, kode barang,
satuan, dan seluruh supplier dari `suppliers`. Untuk respons lama tanpa
array tersebut, supplier utama dikenali sebagai `Supplier #<id>`. Daftar
kosong menampilkan pesan belum ada pemetaan. Link **Kembali ke Data Barang**
menuju daftar Purchasing. Kolom Supplier pada tabel utama tetap disembunyikan.

## Kontrak API

`PUT /api/v1/items/{id}/suppliers` menerima:

```json
{ "supplierIds": [7, 8] }
```

`[]` mengosongkan semua supplier. Maksimal 100 ID positif yang unik.
Backend memvalidasi semua ID dan mengganti pemetaan satu barang dalam satu
transaksi; supplier tidak dikenal menyebabkan 404 tanpa menyimpan sebagian.
Permission wajib: `item.update` dan `item.set-supplier`.

`GET /items`, `GET /items/{id}`, dan pencarian berdasarkan kode mengembalikan
`suppliers: [{ "id": 7, "name": "Supplier A" }, ...]`.
`supplierId` tetap menjadi supplier utama untuk klien lama. Supplier utama
lama dipertahankan jika masih dipilih; jika dilepas, backend memakai ID
pertama dalam pilihan, atau null bila kosong. Barang lama yang hanya punya
`supplierId` tetap terbaca tanpa perlu dipetakan ulang.

Filter `GET /items?supplierId=...` mencakup semua supplier yang dipetakan,
bukan hanya supplier utama. Detail Data Supplier juga menampilkan material
untuk supplier tambahan. Supplier yang memiliki riwayat harga tetap mengikuti
aturan histori tahun sebelumnya.

## Transaksi

Di Barang Masuk, supplier pada header boleh salah satu dari supplier yang
dipetakan ke material. Input manual dan scan memvalidasi daftar tersebut.
Setiap baris `POST /inbound/batch` mengirim `supplierId` yang dipilih;
backend memvalidasi hubungan lalu menyimpan supplier transaksi itu.
`POST /inbound` serta baris `pass`/`retur` pada `/inbound/scan-batch` juga
menerima supplier terpilih. Klien lama yang tidak mengirimnya tetap memakai
supplier utama. Riwayat transaksi dan harga yang sudah tercatat tidak ditulis
ulang saat pemetaan master berubah. Harga pada PO tetap mengikuti supplier
PO dan barisnya; perubahan ini tidak mengubah alur penetapan harga PO.

## Penyimpanan dan Deployment

Backend memakai tabel `item_suppliers` dengan kunci unik material–supplier.
Field `items.supplierId` tetap tersedia untuk kompatibilitas. Jalankan migrasi
backend `0041_item_suppliers.sql` sebelum frontend yang memakai endpoint baru
dideploy. Backend dan frontend harus dirilis bersama sesuai kontrak ini.
