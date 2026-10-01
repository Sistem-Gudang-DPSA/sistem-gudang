# Sistem Gudang — Tampilan Gudang dari Cal dan Detail Rekap Permintaan

## Ringkasan

Tampilan halaman Gudang diselaraskan dengan versi terbaru buatan Cal di
branch `cal/updKamisGudang`, sementara pemanggilan API dan penamaan tetap
dari frontend yang sudah tersambung ke backend. Rekap Stok Opname dan Rekap
Dokubah ditambahkan ke menu Laporan Gudang. Halaman Detail Rekap
Permintaan dari Cal dilengkapi dengan sisa kuota dan tanggal yang diambil
dari Dokubah.

## Latar Belakang

Pada `06-Integrasi-Modul-Gudang.md` tampilan laporan dari
`cal/updRabuGudang` sudah dipertahankan. Cal kemudian merapikan layar
itu lagi di `cal/updKamisGudang`, dan memastikan bahwa `cal/updRabuGudang`
boleh diabaikan. Sebagian layar Gudang yang sudah tersambung ke API
ternyata mengganti elemen tampilan Cal dengan elemen fungsional, sehingga
perlu disatukan lagi.

## Keputusan

| Keputusan | Alasan |
|---|---|
| Tampilan mengikuti Cal, sedangkan pemanggilan API dan penamaan mengikuti frontend yang tersambung ke backend | Cal memegang desain halaman Gudang. Penamaan field dijaga mengikuti backend supaya tidak menyimpang dari spec. |
| Elemen yang hanya ada karena API tetap dipertahankan, tetapi diletakkan di samping elemen Cal | Contohnya modal Detail, field Status QC, dan pilihan bulan serta tahun di Tambah Stok Opname. Menghapusnya berarti menghapus fungsi yang sudah tersambung. |
| Footer pagination Cal dipertahankan sebagai tampilan, dengan jumlah data dari API | Tombolnya belum berfungsi karena paginasi sungguhan belum dibangun, tetapi teks "Menampilkan 1 sampai N dari M" sudah akurat. |
| Input nama barang tetap berupa kolom teks dengan ikon cari, diisi lewat daftar saran dari data barang | Desain Cal memakai kolom teks. Daftar saran menjaga tampilannya sambil tetap menghasilkan `itemId` yang dibutuhkan API. |
| Status baris di Detail Rekap Permintaan ditentukan oleh sisa kuota Dokubah, bukan oleh stok gudang | Approved berarti item masih punya kuota di Dokubah sehingga boleh diambil. Kalau kuota habis, pengambilan butuh persetujuan PPIC dan Gudang. Stok gudang tetap ditampilkan di kolomnya sendiri. |
| Status kuota yang tidak cukup diberi label `Perlu Approval`, bukan `Rejected` | Kuota habis bukan penolakan, melainkan menunggu persetujuan. Alur approval dibangun setelah semua domain selesai. Label ini sementara dan boleh diganti sesuai istilah tim. |

## Perubahan

### Penyelarasan tampilan

File di `src/domains/gudang/components/`. Elemen Cal yang dikembalikan:
placeholder pencarian, footer pagination, tombol Edit, Tambah, dan Download
di Permintaan Pembelian dan Stock Opname, tiga kartu ringkasan di Laporan
Barang Masuk, gaya tombol Export dan kolom Check, serta input nama barang
di Barang Masuk dan Tambah Stok Opname. Kolom Administrasi, Fisik, dan
Selisih di Tambah Stok Opname memakai stok sistem sebagai Administrasi,
dan sisanya dihitung dari jumlah fisik karena API hanya menerima jumlah
fisik.

Beberapa hal berbeda dari Cal karena data: kolom Status dihapus dari
tabel Permintaan Pembelian dan statusnya pindah ke modal Detail. Kolom
Auditor di Rekap Stok Opname berisi `User #id`, karena API hanya
mengembalikan id pembuat.

### `RekapStokOpname.tsx` dan `RekapDokubah.tsx`

Dua halaman baru di menu Laporan Gudang, dengan route
`gudang/laporan/stock-opname` dan `gudang/laporan/dokubah`. Rekap Stok Opname
memakai `GET /stock-opname` dengan filter `search`, `month`, dan `year`,
serta modal detail berisi stok sistem, fisik, dan selisih. Rekap Dokubah
dibahas di `07-Integrasi-PPIC-Dokubah-dan-SPK-Internal.md`.

### `DetailRekapPermintaan.tsx` dan `quota.ts`

Halaman baru di `gudang/laporan/rekap-permintaan/detail-rekap-permintaan`.
Kerangka dan pemuatan detail permintaan berasal dari Cal. Bagian yang
dilengkapi:

- **Sisa Kuota Dokubah.** Dokubah dicari berdasarkan SPK permintaan,
  lalu bahan dengan `kodeBarang` yang sama dengan kode item permintaan
  menghasilkan sisa kuota, yaitu kuota dikurangi realisasi.
- **Tanggal Mulai dan Tanggal Selesai.** Diambil dari Dokubah yang sama,
  sebelumnya keduanya memakai tanggal permintaan.
- **Status.** Fungsi `getQuotaStatus` di `gudang/quota.ts` mengembalikan
  `Approved`, `Perlu Approval`, atau `Belum Terdata`. Nilai terakhir
  dipakai kalau tidak ada Dokubah untuk SPK itu atau item tidak ada di
  bahannya.

Kegagalan mencari Dokubah, misalnya karena pengguna tidak punya
`dokubah.view`, tidak menggagalkan halaman. Kuota hanya dianggap tidak
diketahui.

## Bug atau Celah yang Ditemukan

- Kode Cal berisi komentar `// mengambil sisa item yang dideklarasikan di
  dokubah` di dalam baris tabel. Karena berada di dalam JSX, komentar itu
  dirender sebagai teks dan memicu error lint. Komentar itu adalah
  penanda logika yang belum selesai, dan hilang setelah kolomnya diisi.
- `listItems({})` tanpa `pageSize` hanya mengambil baris bawaan, sehingga
  stok sebagian barang bisa tidak ketemu. Sekarang memakai `pageSize: 100`.
- Tombol Edit di tiap baris Detail Rekap Permintaan belum berfungsi dan
  tujuannya belum ditentukan.
- Tombol View Detail di Rekap Permintaan masih membuka modal, belum
  mengarah ke halaman detail yang baru.

## Pengujian

| File | Cakupan |
|---|---|
| `src/domains/gudang/quota.test.ts` | Approved saat kuota cukup termasuk pas, Perlu Approval saat kuota kurang atau habis, Belum Terdata saat tidak ada Dokubah. |

Total ada 23 tes unit yang lulus, ditambah `tsc` dan `next build` yang
bersih. Perbandingan tampilan dengan `cal/updKamisGudang` dilakukan lewat
kode, yaitu teks, placeholder, dan class pada setiap komponen. Sisa
selisihnya adalah isi sel data. Logika kuota belum diuji dengan data
nyata karena data seed backend tidak punya permintaan material yang SPK-nya
ada di Dokubah. Tampilan di browser belum diuji.

## Status dan Langkah Berikutnya

Tampilan Gudang sudah selaras dengan Cal dan Detail Rekap Permintaan
membaca Dokubah. Langkah berikutnya, secara berurutan:

1. Uji manual di browser untuk semua halaman Gudang, terutama yang
   elemennya diubah.
2. Tentukan apakah tombol View Detail di Rekap Permintaan mengarah ke
   halaman detail yang baru.
3. Bangun alur approval PPIC dan Gudang untuk status `Perlu Approval`.
   Rancangannya perlu dibahas bersama backend, karena `/approvals` belum
   punya jenis untuk kasus ini.

Daftar lengkap pekerjaan sisanya ada di `04-Rencana-Selanjutnya.md`.
