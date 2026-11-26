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
| Stock Opname | `/stock-opname` | Daftar dengan filter bulan dan tahun dari server, dan detail berisi stok sistem, fisik, dan selisih. Form menyediakan Simpan Draft di browser dan Submit final dengan konfirmasi karena hanya submit yang menyetel stok ke jumlah fisik. Jumlah fisik boleh desimal (maks. 3 angka di belakang koma, maks. 1.000.000). Baris yang sudah diisi, termasuk hasil scan dari halaman lain, tetap tampil di tabel dan bisa dikosongkan agar tidak ikut dikirim. |
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

- Export Stock Opname memuat satu sheet per periode. Periode yang dicentang
  dipakai bila ada; bila tidak ada yang dicentang, seluruh data terfilter
  ikut diekspor. Satu periode memakai nama file
  `Stok_Opname_Bulan_<bulan>_<tahun>.xlsx`, lebih dari satu
  `Stok_Opname.xlsx`. Kegagalan export dan cetak tampil di atas tabel.
- Export CSV Data Barang (Gudang, PPIC, Purchasing, Keuangan) memakai seluruh
  barang terfilter yang sudah dimuat, bukan hanya baris yang tampak. Nama
  file mengikuti divisi (`Data_Barang_Gudang.csv`, `Data_Barang_PPIC.csv`,
  dan seterusnya).
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
- Cetak Rekap Barang Masuk dan Barang Keluar memuat seluruh baris terfilter
  (semua hasil pencarian, filter, dan periode), bukan hanya baris yang
  tampak di area scroll. Judul tidak lagi memakai keterangan "(halaman ini)".
  Cetak Barang Keluar memakai transaksi yang dicentang; bila tidak ada yang
  dicentang, seluruh transaksi terfilter ikut dicetak.


## Draft dan submit Stok Opname

Di Gudang dan Gudang Barang Jadi, **Simpan Draft** menyimpan periode dan seluruh jumlah fisik yang telah diisi ke penyimpanan browser, termasuk nilai nol dan barang dari halaman lain atau hasil scan. Setiap draft memiliki identitas dan penyimpanan sendiri per akun dan divisi; beberapa draft pada periode yang sama dapat disimpan tanpa saling menimpa. **Tambah Data** selalu membuka form kosong untuk hitungan baru. Menyimpan kembali draft yang dilanjutkan hanya memperbarui draft tersebut.

Daftar **Draft Stok Opname** berada di bawah tabel data final, terurut dari waktu terakhir disimpan yang terbaru. Setiap baris menampilkan periode, identitas draft, jumlah dan cuplikan nama barang, waktu terakhir disimpan dalam WIB, serta **Lanjutkan Draft**. Tautan ini membuka form dengan `?draft=<id>` agar hanya draft yang dipilih yang dimuat. Draft format lama tetap muncul sebagai **Draft lama** dan dapat dilanjutkan. Daftar dan aksi draft hanya tersedia bagi pengguna dengan `stock-opname.create`.

Menyimpan draft tidak memanggil endpoint transaksi dan tidak mengubah stok. Draft hanya tersedia pada akun dan browser yang sama; membersihkan data browser menghapus draft. Bila satu draft rusak, daftar menampilkan peringatan dan tetap menampilkan draft lain yang valid. Membuka draft rusak atau yang sudah tidak ditemukan menampilkan form kosong dengan peringatan; menyimpan isian baru membuat draft terpisah dan tidak menimpa data sebelumnya.

Form sebelum submit menampilkan Nama Barang, Satuan, Kategori, dan Jumlah Fisik. Jumlah Administrasi, Jumlah Selisih, dan Keterangan tampil pada halaman detail setelah submit. Kartu scan juga menyembunyikan stok sistem, selisih, dan keterangan selama penghitungan.

**Submit** memvalidasi jumlah fisik, lalu menampilkan dialog konfirmasi. Tombol **Ya, Submit** mengirim baris yang diisi ke `POST /api/v1/stock-opname`; baris kosong tidak mengubah stok barang tersebut. Hanya draft yang sedang dikerjakan yang dihapus setelah submit berhasil; draft lain tetap tersedia. Jika penyimpanan draft atau submit gagal, pesan kesalahan ditampilkan dan isian tetap tersedia.

Detail hasil final diakses melalui halaman `[id]` di bawah rute daftar transaksi maupun laporan, dengan link kembali ke divisi dan daftar asal. Halaman ini memakai izin yang sama dengan daftar asalnya: `stock-opname.view` untuk transaksi Gudang dan Gudang Barang Jadi, `report.view` untuk laporan Gudang, Gudang Barang Jadi, dan Keuangan, serta `item.set-price`, `supplier.create`, atau `supplier.update` untuk Purchasing. Identitas dan hasil audit diambil dari `GET /api/v1/stock-opname/{id}`. Tombol **Download** per baris disembunyikan. Ekspor Excel pilihan periode tetap tersedia. Checkbox pilihan periode berada di kolom paling depan, sebelum No, tanpa tulisan Check; checkbox pada header memilih seluruh data terfilter, bukan hanya baris yang tampak, dan pilihan bertahan saat pencarian/filter/urutan berubah serta hilang saat layar ditutup. Banner hijau di atas tabel menampilkan jumlah periode terpilih dan tombol **Bersihkan pilihan**. Tidak ada endpoint draft baru; penyimpanan draft sepenuhnya di frontend.


## Filter sumber Rekap Barang Masuk

Pilihan **Sumber Inbound** hanya disembunyikan pada Rekap Barang Masuk Gudang. Daftar, ekspor, dan cetak mencakup semua sumber penerimaan sesuai pencarian dan periode tanggal yang aktif. Rekap Barang Masuk Gudang Barang Jadi dan Purchasing tetap menyediakan filter sumber.

## Tampilan Barang Keluar

- Kolom **Check** di daftar transaksi berada di kolom pertama, dan baris
  rincian per barang ikut rata dengan kolom header yang sama.
- Warna pembatas baris memakai `gray-200` agar lebih jelas.
- Kolom **Dokubah** di form pengisian barang disembunyikan sementara. Nilai
  Dokubah tetap ada di tipe baris dan tetap ikut tercetak bila ada.
- Kolom **Hapus** pada tabel barang hanya tampil setelah ada baris. Saat
  tabel kosong, hanya kolom No, Nama Material, Satuan/Vol, Kode, dan
  Pengambilan yang tampil, sehingga tidak ada kolom kosong berlebih.

## Informasi barang pada Data Lokasi

Data Lokasi di Gudang, Gudang Barang Jadi, dan Superadmin memakai komponen
bersama. Kolom **Informasi Barang** menampilkan jumlah jenis barang yang
ditempatkan pada tiap lokasi, cuplikan maksimal tiga nama barang, serta jumlah
barang lainnya. Ringkasan membaca `GET /api/v1/items?locationId=<id>&page=1&pageSize=3`
untuk lokasi yang tampil pada halaman; data barang tidak diambil tanpa filter lokasi.

Tombol **Lihat Barang** membuka dialog daftar barang pada lokasi terpilih.
Dialog menampilkan kode, nama dan detail barang, kategori, stok, serta satuan.
Daftar tetap mencakup barang dengan stok nol karena barang tersebut masih
memiliki penempatan lokasi. Pencarian dan paginasi dilakukan melalui
`GET /api/v1/items` dengan `locationId`, `search`, `page`, `pageSize=20`,
`sortBy=name`, dan `sortDir=asc`. Pencarian baru mengembalikan halaman ke 1.
Lokasi kosong ditampilkan secara eksplisit; kegagalan memuat data menampilkan
pesan dan tombol **Coba lagi**. Akses ringkasan dan tombol mengikuti permission
`item.view`; pengguna tanpa izin ini tetap dapat melihat data lokasi sesuai
izin lokasinya tanpa memanggil endpoint barang.
