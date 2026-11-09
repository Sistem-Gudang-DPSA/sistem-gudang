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

## Status dan Langkah Berikutnya

Selesai untuk cakupan CRUD Supplier. `DataSupplierDetail.tsx` (rincian
harga barang per bulan per supplier) tetap dummy karena tidak ada
endpoint yang cocok di `docs/api-1.json`, dan bug tipe pre-existing di
file itu sudah dicatat di `02-Integrasi-Inventory-Item-Lokasi.md` bagian
Bug atau Celah.
