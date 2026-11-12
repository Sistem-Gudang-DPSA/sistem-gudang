# Sistem Gudang — Integrasi Data Supplier

## Ringkasan

Halaman Data Supplier di Purchasing disambungkan ke endpoint `Supplier`
di `docs/api-1.json`: list, tambah, edit, dan hapus. Sebelumnya halaman
ini hanya menyimpan satu baris data dummy di state lokal, dan tombol Edit
serta Hapus di tabel tidak punya `onClick` sama sekali.

## Keputusan

| Keputusan | Alasan |
|---|---|
| Field "Kode Supplier" ditambahkan ke form tambah/edit | Form versi dummy tidak punya field ini, tapi `POST /suppliers` mewajibkan `code`. Tanpa field ini, tidak ada cara mengisinya dari UI. |
| Tombol Edit dan Hapus yang sudah ada di tabel langsung diisi `onClick` | Tombolnya sudah ada di desain, hanya belum berfungsi. Menyambungkannya ke `updateSupplier()` dan `deleteSupplier()` bukan menambah UI baru, hanya melengkapi yang sudah dirancang. |
| Modal tambah dan edit memakai komponen serta state yang sama | Field yang dibutuhkan identik, hanya beda antara `POST` dan `PUT`. Membuat modal terpisah untuk edit akan menduplikasi seluruh markup form tanpa manfaat. |

## Perubahan

### `src/domains/purchasing/types.ts` dan `api.ts`

Tipe `Supplier` dan `CreateSupplierInput`, serta fungsi `listSuppliers`,
`createSupplier`, `updateSupplier`, `deleteSupplier`. Dipakai juga oleh
domain PPIC dan Gudang untuk dropdown supplier di form barang, lihat
`02-Integrasi-Inventory-Item-Lokasi.md`.

### `src/domains/purchasing/components/DataSupplier.tsx`

List dari `listSuppliers()`. `editingId` menentukan apakah tombol Simpan
memanggil `createSupplier()` atau `updateSupplier()`. Tombol Hapus
memanggil `deleteSupplier()` setelah konfirmasi `window.confirm`, sama
seperti pola konfirmasi hapus yang sudah dipakai di halaman Data Barang
PPIC.

## Import Excel

Tombol "Import Excel" ada di Data Supplier Purchasing dan Data Supplier
Superadmin, tampil hanya untuk user dengan permission `supplier.create`.
Alurnya: pilih file `.xlsx` atau `.xls` (maksimal 5 MB) dengan kolom
sesuai template yang bisa diunduh, cek pratinjau, lalu mapping kode,
bank, pajak, dan telepon per baris di `ImportSupplierMapping`. Kedua
layar memakai komponen yang sama.

Simpan mengirim seluruh baris ke `POST /api/v1/suppliers/bulk` dalam
satu request. Endpoint ini hanya menambah: supplier yang sudah ada tidak
diubah, dan baris dengan kode yang sudah ada di database atau terulang di
file dilewati. Maksimal 1000 baris per request. Baris yang tidak valid
membuat seluruh request ditolak (400) tanpa ada yang tersimpan.

Setelah berhasil, layar menampilkan jumlah yang ditambahkan dan yang
dilewati, misalnya "3 supplier ditambahkan, 1 dilewati karena kode
duplikat: S7". Daftar tabel ikut diperbarui.

## Status dan Langkah Berikutnya

Selesai untuk cakupan CRUD Supplier. `DataSupplierDetail.tsx` (rincian
harga barang per bulan per supplier) tetap dummy karena tidak ada
endpoint yang cocok di `docs/api-1.json`, dan bug tipe pre-existing di
file itu sudah dicatat di `02-Integrasi-Inventory-Item-Lokasi.md` bagian
Bug atau Celah.
