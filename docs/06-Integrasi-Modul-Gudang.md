# Sistem Gudang — Integrasi Modul Gudang

## Ringkasan

Seluruh halaman transaksi dan laporan divisi Gudang disambungkan ke
backend: Barang Masuk, Barang Keluar, Stock Opname, Permintaan
Pembelian, Laporan Barang Masuk, Laporan Barang Keluar, dan Rekap
Permintaan. Sebelumnya semua halaman ini memakai data dummy.
`docs/api-1.json` disinkronkan ulang dengan spec backend terbaru
(42 path, sebelumnya 24).

## Keputusan

| Keputusan | Alasan |
|---|---|
| Nama field mengikuti backend (`source`, `referenceNo`, `qtyArrived`, dan seterusnya), bukan istilah lama di UI | Backend membangkitkan spec dari skema validasinya, jadi tipe frontend yang mengikuti spec tidak bisa menyimpang diam-diam. |
| Harga di Stock Opname read-only, diambil dari harga master barang | Harga ditetapkan Purchasing. Petugas gudang hanya menghitung jumlah fisik. Backend mengisi `systemPrice` dan `physicalPrice` dari `items.price`. |
| Form Barang Masuk hanya untuk barang yang sudah lolos QC (`statusQc` `PASS`) | Pengecekan QC dilakukan sebelum input. Form tidak punya pilihan Status QC. |
| Filter tanggal berupa rentang `startDate` dan `endDate` di semua halaman | Sepakat dengan backend. Berlaku juga untuk `GET /approvals`. |
| Export Excel dibuat backend, cetak PDF memakai `cetakHtml` | Data laporan dipaginasi, jadi export harus dari server. PDF cukup dari cetak browser. `cetakHtml` mencetak lewat iframe tersembunyi, jadi tidak ada pop-up yang bisa diblokir. |
| Rekap Permintaan memakai tabel `material-requests` sendiri, bukan `approvals` | Kolomnya (SPK, klien, item produksi, group tukang, status) tidak cocok dengan `purchase-request`. |
| Checkbox "Pilih" di Rekap Permintaan hanya untuk export dan cetak | Ada baris terpilih: hanya baris itu yang diekspor dan dicetak. Tidak ada yang terpilih: seluruh hasil filter. |
| Hook `useApiData` menggantikan pola `setLoading(true)` di dalam `useEffect` | Aturan lint `react-hooks/set-state-in-effect` melarang pola lama. Status memuat dihitung dari respons terakhir. |
| Tipe `ItemListRow` dipisah dari `Item` | `GET /items` (list) mengembalikan `locationCode` dan `supplierName` tanpa `createdAt` dan `updatedAt`. Endpoint item lain kebalikannya. |

## Perubahan

### `src/domains/inventory/api.ts`, `types.ts`, `date.ts`

Fungsi dan tipe untuk `/inbound`, `/inbound/returns`, `/outbound`,
`/stock-opname`, `/approvals` (purchase-request), `/reports/inbound`,
`/reports/outbound`, `/reports/requests`, `/material-requests/{id}`, dan
tiga endpoint export. `date.ts` berisi `toDateRange()` yang mengubah
pilihan Tgl, Bulan, dan Tahun menjadi `startDate` dan `endDate`.

### `src/shared/lib/api-client.ts` dan `use-api-data.ts`

`downloadFile()` mengunduh file biner (xlsx), membaca nama file dari
`Content-Disposition`, dan mencoba refresh token sekali jika 401.
`useApiData()` menjalankan pengambilan data setiap kali kuncinya
berubah dan mengabaikan respons yang sudah kedaluwarsa.

### Halaman

| Halaman | Endpoint | Catatan |
|---|---|---|
| Barang Masuk | `/inbound`, `POST /inbound/batch` | Pilih supplier dulu, lalu tambah barang lewat Scan Barang (scanner atau kamera) atau Input Manual. Barang dengan supplier berbeda ditandai merah. Semua baris tampil di Preview, lalu disimpan sekali lewat `/inbound/batch` dengan header `Idempotency-Key`. Tabel menampilkan kolom Supplier. Form Barang Kembali tidak ada. |
| Barang Keluar | `/outbound` | Form punya Asal Gudang dan Tujuan/Penerima (wajib). Tabel diratakan satu baris per barang. Saat Preview terbuka, panel scan dan kamera ditutup dan scan baru diabaikan sampai Kembali Edit. Konfirmasi ditolak selama scan tertunda, memvalidasi ulang form, dan mengambil ulang stok (`GET /items/{id}`) hanya untuk baris yang qty-nya melebihi stok. |
| Stock Opname | `/stock-opname` | Daftar dengan filter bulan dan tahun dari server, dan detail berisi stok sistem, fisik, dan selisih. Form konfirmasi sebelum menyimpan karena stok disetel ke jumlah fisik. Jumlah fisik boleh desimal (maks. 3 angka di belakang koma, maks. 1.000.000). Baris yang sudah diisi, termasuk hasil scan dari halaman lain, tetap tampil di tabel dan bisa dikosongkan agar tidak ikut dikirim. |
| Laporan Barang Masuk dan Keluar | `/reports/inbound`, `/reports/outbound` | Kartu per kategori memakai `summary` dari backend (abaikan filter sumber). Kartu total Barang Masuk memakai `filteredSummary` (qty dan jumlah transaksi, mengikuti semua filter) agar cocok dengan tabel. Ada kolom Lokasi. |
| Rekap Permintaan | `/reports/requests`, `/material-requests/{id}` | Export mendukung mode filter dan mode `ids`. |

Pada form Barang Keluar **SPK** dan **Stok / Internal** di Gudang maupun
Gudang Barang Jadi, **Nama Pengambil** otomatis memakai huruf kapital di
awal setiap kata saat diketik atau ditempel. Misalnya `pak mul`, `PAK MUL`,
dan `pAk mUL` menjadi `Pak Mul`. Nama yang sudah disesuaikan dipakai pada
Preview, catatan pengambil dan PIC tiap baris saat disimpan, serta cetakan.

Jumlah **Rekap Pembelian** dan **Kedatangan** pada form Barang Masuk menerima
angka desimal dengan koma, maksimal 3 angka di belakang koma. Huruf, titik,
tanda plus/minus, koma ganda, dan presisi berlebih ditolak dengan pesan di
kolom tanpa mengubah nilai sebelumnya. Pesan validasi hanya menyebut
kesalahan yang perlu diperbaiki, misalnya "Lengkapi angka desimal." atau
"Maksimal 100.000.". Kedatangan wajib lebih dari 0 dan
maksimal 100.000; rekap pembelian wajib diisi, minimal 0 dan maksimal
999999999. Nilai yang tidak valid menghalangi Preview. Tombol tambah dan
scan ulang menambah 1 hingga batas kedatangan; tombol kurang mengurangi 1
dengan batas 1, sedangkan pecahan di bawah 1 dapat diketik langsung.
Preview menampilkan desimal dengan koma dan `POST /inbound/batch` menerima
`qtyArrived` serta `qtyPurchased` sebagai angka JSON. Spec lokal
`docs/api-1.json` masih mencantumkan keduanya sebagai integer; dukungan
desimal di backend perlu diverifikasi sebelum dipakai di produksi.

### Penggabungan branch `cal/updRabuGudang`

Tampilan laporan dari branch tersebut dipertahankan. Fungsi dan tipe
yang memanggil `/api/v1/gudang/laporan/...` tidak dibawa karena
endpoint itu tidak ada di backend. Branch itu juga menambah shadcn
(`components.json`, `ui/button.tsx`, `lib/utils.ts`) dan mengubah
`globals.css`. Font `body` dikembalikan ke Arial karena tema shadcn
menimpanya.

## Bug atau Celah

- `globals.css` dari shadcn menimpa `--border` dan aturan dark mode
  lama, sehingga warna border dan tema seluruh aplikasi bisa berubah.
  Tampilan semua halaman perlu diperiksa manual.
- Paket `cn@0.4.0` terpasang sebagai dependensi. Util `cn` biasanya
  dibuat dari `clsx` dan `tailwind-merge`. Perlu dicek.
- `GET /approvals` belum punya pencarian teks yang berfungsi.
- Daftar dimuat 100 baris pertama, belum ada paginasi.
- Stock Opname belum punya endpoint edit atau export, dan Permintaan
  Pembelian belum punya alur `resubmit` di frontend.
- Error lint `set-state-in-effect` masih ada di PPIC (`DataBarang`),
  Purchasing (`DataBarang`, `DataSupplier`), dan Superadmin (`Users`).
  Solusinya sama, pakai `useApiData`.
- Alur lewat browser dan penyimpanan ke backend belum diuji dari UI.
  Verifikasi baru sebatas `tsc`, tes unit, `next build`, dan pemanggilan
  GET serta validasi yang ditolak ke server backend.

## Status dan Langkah Berikutnya

Modul Gudang selesai tersambung. Berikutnya lihat
`04-Rencana-Selanjutnya.md`.

Permintaan Pembelian tidak lagi ada di Gudang. Halamannya pindah ke PPIC, lihat `09-Permintaan-Pembelian-PPIC-dan-Rekap-Pembelian.md`.

## Export di Stock Opname dan Data Barang

- Export Stock Opname memuat satu sheet per periode yang dicentang di halaman
  tersebut (satu periode memakai nama file `Stok_Opname_Bulan_<bulan>_<tahun>.xlsx`,
  lebih dari satu `Stok_Opname.xlsx`). Kegagalan export dan cetak tampil di
  atas tabel.
- Export CSV Data Barang (Gudang dan Keuangan) mengambil semua barang sesuai
  pencarian dan filter aktif lewat `fetchAllPages`, bukan hanya halaman yang
  tampil. Nama file mengikuti divisi (`Data_Barang_Gudang.csv`,
  `Data_Barang_Keuangan.csv`).
- `toCsv` (`src/shared/lib/csv.ts`) mengutip semua kolom dan menambah `'` di
  depan teks berawalan `=`, `+`, `-`, `@` agar tidak dibaca Excel sebagai rumus.

## Cetak Laporan

- Semua cetak memakai `cetakHtml` (`src/shared/lib/print-html.ts`), yaitu
  iframe tersembunyi yang membuka dialog cetak browser. Tidak ada lagi
  `window.open` dan `document.write`, sehingga tidak ada pop-up yang
  diblokir dan menu halaman tidak ikut tercetak.
- Cetak Kartu Stok dan Realisasi SPK memakai kop laporan bersama di
  `src/shared/lib/print-laporan.ts`: logo perusahaan, nama
  `PT DHARMA PUTRA SEJAHTERA ABADI`, judul laporan, dan periode. Nama
  perusahaan dibaca dari `src/shared/lib/company.ts` dan dipakai juga oleh
  dokumen PO.
- Logo ditunggu selesai dimuat sebelum dialog cetak dibuka. Bila logo gagal
  dimuat, berkas cadangan `public/logo-perusahaan.png` dipakai, dan pesan
  kegagalan tampil di layar, bukan lewat `alert`.
- Berkas cetak Kartu Stok dan Realisasi SPK ada di
  `src/domains/inventory/export/`, sehingga `src/shared` tidak lagi
  mengimpor tipe dan komponen domain.
- Tabel laporan diberi lebar `calc(100% - 2mm)`. Tanpa jarak itu, border
  kanan kolom terakhir menempel tepat di tepi area cetak dan terpotong di
  PDF.
