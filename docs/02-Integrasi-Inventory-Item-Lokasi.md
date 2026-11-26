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
| Halaman Purchasing menampilkan harga read-only, tanpa aksi isi harga | Harga akan menempel otomatis dari barang masuk, bukan diisi manual. Modal "Lengkapi" (supplier + harga) dihapus; pemetaan supplier massal tetap lewat `BulkSupplierAction`, dan pengubahan harga manual hanya ada di Superadmin (mode edit). |
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
Gudang dan Superadmin memakai komponen Data Lokasi yang sama. Tombol **Edit**
(`location.update`) membuka input hanya pada satu baris yang dipilih. **Simpan**
mengirim `PUT /locations/{id}` untuk baris tersebut dan menutup edit jika berhasil;
**Batal** membuang perubahan dan menutup edit. Baris lain tetap berupa teks,
dan tombol edit serta hapus dikunci selama ada baris yang sedang diedit.
Nama rak harus huruf A–Z; nomor rak berbentuk Kolom.Baris dengan angka mulai
dari 1 tanpa nol di depan. Validasi atau penyimpanan yang gagal menampilkan
pesan pada baris dan mempertahankan input untuk diperbaiki. Pencarian,
pengurutan, atau pindah halaman meminta konfirmasi jika ada perubahan yang
belum disimpan dan dikunci selama penyimpanan berlangsung. Hapus lokasi
memerlukan role Superadmin serta permission `location.delete`.

### `src/domains/ppic/components/DataBarang.tsx`

List dari `listItems()`. Form tambah dan edit memanggil `createItem()`
atau `updateItem()` dengan field lengkap. Tombol hapus memanggil
`deleteItem()`. Dropdown supplier di form diisi dari
`listSuppliers()` (lihat `03-Integrasi-Data-Supplier.md`).

### `src/domains/purchasing/components/DataBarang.tsx`

List dari `listItems()`. Harga hanya ditampilkan, tidak diisi dari layar ini
(harga menempel dari barang masuk). Pemetaan supplier massal memakai
`BulkSupplierAction` dengan `PUT /items/{id}` untuk supplier saja, karena
API butuh `supplierId` bukan nama supplier.

Panel Filter (kategori, satuan, supplier, lokasi, stok kosong) dikirim ke
`listItems()` lewat `toItemFilterParams`, sama seperti Data Barang Gudang.
Export CSV mengambil semua barang yang cocok dengan pencarian, filter, dan
urutan aktif lewat `fetchAllPages`, bukan hanya halaman yang tampil.

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

- `src/domains/inventory/api.ts` — fungsi baru `adjustItemStock(id, { delta, reason }, idempotencyKey?)`. Header `Idempotency-Key` dikirim bila diisi; layar Data Barang Superadmin membuat satu key per penyesuaian, memakainya ulang saat retry (isi sama), dan membuat key baru untuk penyesuaian berikutnya.
- `src/domains/inventory/types.ts` — `Item` sekarang punya `createdAt` dan `updatedAt`.
- `src/domains/inventory/components/DataBarang.tsx` — tombol "Stok" baru di kolom Aksi, membuka modal untuk input perubahan jumlah dan alasan, lalu memanggil `adjustItemStock`.

Juga diperbaiki di ketiga halaman Data Barang (Gudang, PPIC, Purchasing):
kolom Lokasi sebelumnya menampilkan `locationId` mentah (angka), sekarang
di-resolve ke kode lokasi yang bisa dibaca (misal "A04") lewat
`listLocations()`, sama seperti cara supplier di-resolve. Kolom Supplier
yang sempat hilang di halaman Gudang saat migrasi ke API asli juga
dikembalikan.

Data Barang di semua divisi memuat seluruh baris yang cocok dengan
pencarian/filter (semua halaman `GET /items`), lalu menampilkannya dalam
tabel scroll dengan header sticky. Tinggi area scroll mengikuti sisa tinggi
layar, jadi baris yang muat sebanyak mungkin tanpa mendorong footer terlalu
jauh; semua baris tetap bisa dicapai lewat scroll. Centang header memilih
semua baris terfilter; export memakai data yang sudah dimuat. Pilihan
bertahan saat pencarian, filter, atau urutan berubah, dan hilang saat layar
ditutup. Banner hijau di atas tabel menampilkan jumlah baris terpilih beserta
tombol **Bersihkan pilihan**.

Kolom **Supplier** di tabel Data Barang disembunyikan untuk semua role,
termasuk Superadmin, Gudang/Inventory, PPIC, Purchasing, dan Keuangan.
Filter supplier, pemetaan supplier massal sesuai permission, dan data supplier
dalam export tetap tersedia. Supplier di detail penerimaan barang tetap tampil.

Kolom harga pada Data Barang PPIC, Purchasing, dan Superadmin memakai label
**Harga Terbaru** dan format ribuan `id-ID` yang sama (contoh `1.000`).
Bila respons `GET /items` menyertakan tanggal harga terakhir, sel yang sama
menampilkan baris kecil **per DD-MM-YYYY** di bawah harga. Field itu belum
ada di kontrak backend (usul nama `priceUpdatedAt`, diisi saat harga menempel
dari barang masuk); selama kosong, baris tanggal disembunyikan. Nilai harga
tetap `item.price`; Superadmin masih dapat mengeditnya di mode edit bila
punya `item.set-price`.

Data Barang Superadmin menampilkan kolom **Nilai Stok** tepat di kanan
**Harga Terbaru**. Nilainya memakai **Total Nilai Stok** dari detail barang,
yaitu jumlah sisa stok × harga per satuan tiap penerimaan, dengan format
ribuan `id-ID`. Daftar dan detail memakai sumber dummy bersama sehingga
angkanya sama: saat ini `3.700.000` untuk setiap barang. Angka ini belum
mewakili stok aktual dan bukan hasil stok master × harga terbaru.

## Status dan Langkah Berikutnya

Selesai untuk cakupan Item dan Location sesuai `docs/api-1.json` terbaru,
termasuk penyesuaian stok. Yang sengaja tidak disentuh karena tidak ada
endpoint backend-nya:

- Transaksi Barang Masuk, Barang Keluar, Stock Opname (tetap dummy). Ini
  beda dari `PATCH /items/{id}/stock`: endpoint itu untuk penyesuaian
  langsung dengan alasan bebas, bukan pencatatan transaksi barang
  masuk/keluar yang terstruktur (nomor referensi, supplier, dsb).
- Edit lokasi lewat tombol **Edit** di kolom Aksi setiap baris (`location.update`),
  lalu **Simpan**/**Batal** di baris yang sama. Hapus lokasi memakai
  `DELETE /locations/{id}` dan hanya ditampilkan untuk role **Superadmin**.
  Import Excel Data Lokasi juga hanya untuk Superadmin; Gudang tetap punya
  Tambah Batch dan Tambah Data selama punya `location.create`.
- Tambah Batch mendeteksi kode yang sudah ada sejak input masih diketik.
  Daftar kode dibaca sekali lewat `GET /locations` saat modal dibuka, kode
  duplikat ditandai pada preview dan dihitung di peringatan, lalu hanya kode
  baru yang dikirim ke `POST /locations/bulk`. Bila daftar gagal dimuat,
  modal memberi tahu dan penyimpanan tetap bisa dilakukan karena backend
  tetap melewati kode duplikat dan melaporkannya di `skipped`.

## Detail Penerimaan Barang Superadmin

Kolom Aksi di Data Barang Superadmin menyediakan tombol ikon **i / Detail** untuk pengguna dengan permission `item.view`. Tombol membuka halaman `/dashboard/superadmin/master/data-barang/[id]` yang menampilkan nama dan kode barang dari `GET /api/v1/items/{id}` beserta tabel **Tanggal Masuk, Jumlah, Sisa Stok, Harga per Satuan, Nilai Stok, Supplier**. Tabel mengikuti tampilan Data Barang: header abu-abu, baris lega dengan latar selang-seling, jumlah tebal, dan inisial supplier. Riwayat ini memakai data dummy yang sama untuk setiap material, dengan beberapa tanggal, harga, dan supplier berbeda. Halaman menyediakan link kembali ke Data Barang Superadmin dan menandai data contoh secara jelas; jumlahnya tidak mewakili stok aktual. Fitur ini belum memakai endpoint riwayat penerimaan dan tidak mengubah data barang.

Kolom **Sisa Stok** di kanan Jumlah menunjukkan contoh jumlah yang masih tersisa dari setiap penerimaan, termasuk penerimaan yang stoknya sudah habis. Kolom **Nilai Stok** di kanan Harga per Satuan menghitung sisa stok × harga per satuan penerimaan tersebut. Baris **Total Nilai Stok** di bawah tabel menjumlahkan seluruh nilai stok penerimaan. Semua sisa stok dan nilai ini merupakan dummy tetap, bukan saldo aktual atau pengurangan otomatis dari transaksi backend.

Detail barang menyediakan filter **Dari tanggal**, **Sampai tanggal**, dan **Supplier** di atas tabel. Batas tanggal bersifat inklusif, dapat diisi salah satu atau keduanya, dan dapat digabung dengan pilihan supplier. **Reset filter** mengembalikan seluruh penerimaan. Header tabel tidak memiliki sort; urutan bawaan tetap tanggal terbaru lebih dulu. Bila tidak ada hasil, tabel menampilkan pesan kosong. **Total Nilai Stok** tetap menghitung seluruh penerimaan agar konsisten dengan daftar barang; saat filter aktif, total diberi keterangan **Seluruh penerimaan**.

## Import Excel Data Barang

Import Data Barang Superadmin memeriksa tiap baris sebelum dikirim ke `POST /api/v1/items/bulk`. Stok maksimal 1.000.000 dengan paling banyak 3 desimal, harga bilangan bulat maksimal 2.000.000.000, dan satu file maksimal 1.000 baris data. Nilai yang melanggar ditolak dengan pesan per baris, tidak dibulatkan diam-diam. Nomor baris di pesan sama dengan nomor baris di Excel, termasuk bila ada baris kosong di antaranya.

## Cetak label QR

Tombol **QR** per baris dan **Cetak Label QR** untuk barang terpilih membuka
dialog **Cetak label QR**. Dialog menanyakan **Jumlah label per barang**
(bilangan bulat 1–100) sehingga stok fisik yang sama bisa diberi beberapa
label, misalnya 5 kaleng memakai 5 label. Label setiap barang diulang sesuai
jumlah tersebut (`buildLabelsHtml(items, copies)`); isi QR tetap `items.code`,
jadi semua label untuk barang yang sama identik. Tombol cetak menampilkan
total label (`barang × jumlah`) dan pesan kesalahan bila dialog cetak gagal
dibuka.
