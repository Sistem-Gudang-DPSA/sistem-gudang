# Sistem Gudang — Integrasi Inventory (Item dan Lokasi)

## Ringkasan

Modul barang dan lokasi gudang di tiga divisi (Gudang, PPIC, Purchasing)
disambungkan ke endpoint `Item` dan `Location` di `docs/api-1.json`,
menggantikan data dummy yang sebelumnya di-hardcode di masing-masing
halaman. Cakupannya list, create, update, delete barang, list dan create
lokasi, serta alur assign lokasi ke barang yang belum punya lokasi.

## Latar Belakang

Backend mengelompokkan Item dan Location dalam satu modul `inventory`
(lihat `00-Architecture-in-BE.md`), tapi tiga halaman frontend
(`gudang/master/data-barang`, `ppic/master/data-barang`,
`purchasing/master/data-barang`) masing-masing punya data dummy sendiri
yang tidak konsisten satu sama lain. Ketiganya sebenarnya menampilkan
barang yang sama, hanya dengan aksi berbeda sesuai peran divisi.

## Keputusan

| Keputusan | Alasan |
|---|---|
| Satu domain `src/domains/inventory/` dipakai bersama oleh gudang, ppic, dan purchasing | Mengikuti batas modul backend. Ketiga halaman memanggil barang dan lokasi yang sama, jadi duplikasi fungsi fetch di tiga domain hanya menambah tempat yang harus disinkronkan kalau field API berubah. |
| Form "Tambah Barang" penuh (nama, satuan, kategori, harga, supplier) ditaruh di halaman PPIC | Ini satu-satunya halaman yang sebelumnya sudah punya form create barang (nama, satuan, kategori). Field harga dan supplier ditambahkan supaya lengkap sesuai skema wajib `POST /items`, tapi lokasi form itu sendiri tidak dipindah supaya perubahan tetap kecil. |
| Halaman Purchasing tetap dibatasi ke "Lengkapi" (update harga dan supplier saja) | Sebelumnya modal di halaman ini memang hanya punya field supplier dan harga, tidak ada nama/satuan/kategori. Dipertahankan sebagai partial update lewat `PUT /items/{id}` dengan payload sebagian. |
| Modal "Tambah Lokasi" di halaman Gudang memakai alur `suggest-code` lalu `assign-location` | Ini urutan yang diminta skema API: kode disarankan server berdasarkan lokasi yang dipilih, lalu bisa diedit manual sebelum dikirim lewat `PUT /items/{id}/assign-location`. Field "Stok" yang ada di modal versi dummy dihapus karena `assign-location` tidak menerima stok, dan tidak ada endpoint lain untuk mengubah stok. |
| Kode lokasi baru dihasilkan dari gabungan `namaRak + nomerRak` (misal "A" + "04" jadi "A04") | Form Data Lokasi versi dummy memang punya pola ini di data contohnya, dan API `POST /locations` mensyaratkan field `code` terpisah dari `rackName`/`rackNumber`, jadi frontend perlu menyusunnya sendiri. |
| Import Excel/CSV massal di halaman PPIC dinonaktifkan (tombolnya disembunyikan) | Fitur ini hanya menambah baris ke state lokal, tidak pernah memanggil API. Kalau tetap aktif berdampingan dengan data asli dari server, hasil import akan hilang begitu halaman dimuat ulang tanpa penjelasan ke user. Dimatikan sampai backend punya endpoint bulk-create. |

## Perubahan

### `src/domains/inventory/types.ts` dan `api.ts`

Berisi tipe `Item`, `Location`, `PaginatedResult`, dan fungsi
`listItems`, `createItem`, `updateItem`, `deleteItem`,
`listUnassignedItems`, `suggestItemCode`, `assignItemLocation`,
`listLocations`, `createLocation`, `deleteLocation`. Semua memanggil
`apiClient` dari `shared/lib/api-client.ts` (lihat
`01-Integrasi-Auth.md` untuk detail wrapper itu).

### `src/domains/inventory/components/DataBarang.tsx`

List barang sekarang dari `listItems()`. Tombol "Tambah" hanya tampil
untuk barang dengan `locationId === null`. Modalnya memuat daftar lokasi
asli lewat `listLocations()`, memanggil `suggestItemCode()` begitu user
memilih lokasi, lalu `assignItemLocation()` saat disimpan.

### `src/domains/inventory/components/DataLokasi.tsx`

List dari `listLocations()`, form tambah memanggil `createLocation()`.
Tidak ada tombol edit atau hapus karena desain aslinya juga tidak punya
tombol itu, jadi tidak ditambahkan sebagai fitur baru di luar permintaan.

### `src/domains/ppic/components/DataBarang.tsx`

List dari `listItems()`. Form tambah dan edit memanggil `createItem()`
atau `updateItem()` dengan field lengkap. Tombol hapus memanggil
`deleteItem()`. Dropdown supplier di form diisi dari
`listSuppliers()` (lihat `03-Integrasi-Data-Supplier.md`).

### `src/domains/purchasing/components/DataBarang.tsx`

List dari `listItems()`. Tombol "Lengkapi" memanggil `updateItem()`
dengan payload `{ price, supplierId }` saja. Field supplier di form
diganti dari input teks bebas jadi dropdown supplier asli, karena API
butuh `supplierId` bukan nama supplier.

## Bug atau Celah yang Ditemukan

`src/domains/purchasing/components/DataSupplierDetail.tsx` (harga per
bulan per barang) memakai indexing dinamis `item[\`harga${month}\`]` pada
objek yang tipenya sudah didefinisikan penuh, sehingga TypeScript menolak
build produksi dengan `TS7053`. Ini murni bug tipe yang sudah ada sebelum
pekerjaan integrasi API ini dan tidak berkaitan dengan endpoint apapun di
`docs/api-1.json`, jadi halaman ini tetap memakai data dummy. Perbaikannya
hanya cast lewat `unknown as Record<string, string>` di titik-titik
indexing itu supaya build tidak gagal, bukan perubahan logika.

## Pengujian

Test otomatis untuk halaman-halaman ini sendiri belum ditulis karena
sebagian besar logikanya adalah wiring form ke API, bukan business logic
yang berdiri sendiri. Yang sudah diuji otomatis adalah lapisan yang
dipakai bersama semua halaman ini, lihat tabel di
`01-Integrasi-Auth.md` bagian Pengujian.

Verifikasi manual yang dilakukan: `tsc --noEmit` bersih, `next build`
sukses menghasilkan semua route statis, dan `next dev` dijalankan
sebentar untuk memastikan halaman login serta `gudang/master/data-barang`
merender tanpa error runtime di server log. Belum ada uji coba melawan
backend sungguhan karena backend belum dijalankan saat pekerjaan ini
dilakukan.

## Update: field yang tadinya kurang sekarang sudah dilengkapi backend

Setelah dokumen ini pertama ditulis, backend menambah dua hal yang
sebelumnya jadi catatan "Belum Dikerjakan": `PATCH /items/{id}/stock`
untuk mengubah stok lewat delta bertanda plus/minus dengan alasan wajib,
dan field `createdAt`/`updatedAt` di response Item. Sudah disambungkan:

- `src/domains/inventory/api.ts` — fungsi baru `adjustItemStock(id, { delta, reason })`.
- `src/domains/inventory/types.ts` — `Item` sekarang punya `createdAt` dan `updatedAt`.
- `src/domains/inventory/components/DataBarang.tsx` — tombol "Stok" baru di kolom Aksi, membuka modal untuk input perubahan jumlah dan alasan, lalu memanggil `adjustItemStock`.

Juga diperbaiki di ketiga halaman Data Barang (Gudang, PPIC, Purchasing):
kolom Lokasi sebelumnya menampilkan `locationId` mentah (angka), sekarang
di-resolve ke kode lokasi yang bisa dibaca (misal "A04") lewat
`listLocations()`, sama seperti cara supplier di-resolve. Kolom Supplier
yang sempat hilang di halaman Gudang saat migrasi ke API asli juga
dikembalikan.

## Status dan Langkah Berikutnya

Selesai untuk cakupan Item dan Location sesuai `docs/api-1.json` terbaru,
termasuk penyesuaian stok. Yang sengaja tidak disentuh karena tidak ada
endpoint backend-nya:

- Transaksi Barang Masuk, Barang Keluar, Stock Opname (tetap dummy). Ini
  beda dari `PATCH /items/{id}/stock`: endpoint itu untuk penyesuaian
  langsung dengan alasan bebas, bukan pencatatan transaksi barang
  masuk/keluar yang terstruktur (nomor referensi, supplier, dsb).
- Edit dan hapus lokasi (tidak ada tombolnya di desain awal, dan
  `DELETE /locations/{id}` belum dipakai di frontend manapun).
