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

### `src/domains/purchasing/components/DataSupplierScreen.tsx`

Layar bersama Data Supplier. `DataSupplier.tsx` (Purchasing) dan
`superadmin/components/DataSupplier.tsx` hanya membungkusnya dengan props
`detailHref` dan `paginationActiveClass`. Tabel kedua divisi sama persis:
tanpa kolom No, tanpa filter Pajak/tombol Reset, dan tanpa edit massal di
tabel. Perubahan data lewat modal Tambah/Edit yang sama. Yang berbeda hanya
tautan detail (`?from=purchasing` atau `?from=superadmin`) dan warna halaman
aktif pada paginasi.

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
diubah. Semua kolom boleh kosong, dan kode kosong disimpan sebagai NULL.
Baris dicocokkan lewat kode, atau lewat nama bila kodenya kosong. Baris
yang sudah ada di database atau terulang di file dilewati. Maksimal 1000 baris per request. Baris yang tidak valid
membuat seluruh request ditolak (400) tanpa ada yang tersimpan.

Setelah berhasil, layar menampilkan jumlah yang ditambahkan dan yang
dilewati, misalnya "3 supplier ditambahkan, 2 dilewati karena duplikat:
S7, Toko B". Baris tanpa kode ditampilkan dengan namanya. Daftar tabel ikut diperbarui.

## Pemetaan Barang ke Supplier

Supplier tiap barang dapat diatur sekaligus lewat checklist di Data Barang
Purchasing dan Superadmin. Detail alur, endpoint, dan izinnya ada di
`21-Pemetaan-Supplier-Barang.md`.

## Status dan Langkah Berikutnya

CRUD Supplier dan daftar barang per supplier sudah memakai API.
`DataSupplierDetail.tsx` dipakai bersama oleh Purchasing dan Superadmin
dan menampilkan identitas barang tanpa kolom harga bulanan atau rata-rata.
Detail sumber data dijelaskan di `12-Pemesanan-Pembelian-dan-Histori-Harga-Supplier.md`.

## Kolom PIC pada tabel supplier

Tabel supplier di Purchasing dan Superadmin menampilkan kolom **PIC**
sebelum kolom **Kontak**. Nilainya dibaca dari field `pic` pada payload
supplier; supplier tanpa nilai ditampilkan sebagai `-`. Kolom ini belum
memakai sort karena endpoint supplier belum menerima `pic` sebagai kunci
urut. Field `pic` di form tambah/edit dan di API supplier masih menunggu
dukungan backend.

Kolom **Kode** tidak ditampilkan di tabel supplier. Kode tetap ada di
form tambah/edit karena `POST /suppliers` mewajibkannya, dan tetap dipakai
untuk mendeteksi duplikat saat import.

## Alamat dan Pajak Vendor pada form supplier

Modal Tambah/Edit di Purchasing dan Superadmin memakai textarea untuk
Alamat (maksimal 255 karakter), sehingga alamat dapat ditulis beberapa
baris. Pajak Vendor dipilih melalui dua radio button bulat **Non PKP**
dan **PKP**; pilihan aktif ditandai titik oranye, dengan satu pilihan
aktif pada satu waktu. Supplier baru memakai Non PKP secara default;
form edit mengikuti nilai supplier tersimpan. Nilai API tetap `NON_PKP`
atau `PKP`. Memilih radio pajak tidak menyimpan form; penyimpanan tetap
melalui tombol Simpan. Isian tetap ada jika penyimpanan gagal.
