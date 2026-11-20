# Sistem Gudang — Pemesanan Pembelian dan Histori Harga Supplier

## Ringkasan

Layar Buat PO di Purchasing dan grid harga bulanan di Detail Data Barang
supplier disambungkan ke backend. Sebelumnya PO hanya disimpan di memori
dan hilang saat halaman di-refresh, sedangkan grid harga memakai data
contoh dan tombol simpannya hanya menampilkan alert.

## Pemesanan Pembelian

- Permintaan pembelian dari Gudang atau PPIC masuk ke **Purchasing → Laporan →
  Rekap Pembelian** untuk ditinjau dan disetujui. Permintaan saja tidak muncul
  di daftar **PO Barang**.
- Daftar **Purchasing → Transaksi → PO Barang** membaca `GET /purchase-orders`
  dengan permission `purchase-order.view` dan hanya berisi PO yang sudah dibuat,
  dengan nomor PO, tanggal, supplier, dan status. Pencarian, pengurutan, filter
  tanggal, paginasi, dan ekspor halaman memakai data PO ini. Judul halaman
  **PO BARANG** tampil besar dan tebal, dengan teks pengantar
  **Kelola pemesanan pembelian barang.**
- Tombol **Buat Pesanan Baru** memerlukan `purchase-order.create`. Link
  **Lihat Permintaan** memakai `approvalRequestId` milik PO menuju detail di
  Rekap Pembelian dan memerlukan `purchase-request.approve`.

- Buat PO memanggil `POST /purchase-orders`. Nomor PO dibuat backend dengan
  format `PO-001`, jadi kolom Nomor PO dihapus dari form. Setelah berhasil,
  layar menampilkan nomor PO dan grand total dari backend.
- Rumus pajak mengikuti rancangan Imel dan sudah dipakai backend. Subtotal
  adalah jumlah dikali harga satuan dikurangi diskon rupiah per baris. DPP
  nilai lain adalah 11/12 dari subtotal, PPN adalah DPP nilai lain dikali
  persen PPN, dan grand total adalah subtotal ditambah PPN dan jasa.
  Contoh: subtotal 1.200.000 dengan PPN 12 persen menghasilkan DPP nilai
  lain 1.100.000, PPN 132.000, dan grand total 1.332.000 sebelum jasa.
- Total di layar hanya pratinjau. Nilai yang tersimpan dan dikembalikan
  adalah hasil hitung backend. `dppLain` bukan lagi input, dan backend
  menolak body yang memuatnya.
- PO dapat dibuat langsung dari **Buat Pesanan Baru** tanpa
  `approvalRequestId`. PO yang berasal dari permintaan pembelian tetap wajib
  memakai permintaan berstatus Disetujui. Satu permintaan boleh punya beberapa PO. PIC supplier dan kode barang
  setiap baris sekarang wajib diisi karena backend mewajibkannya.
- Role Purchasing membutuhkan permission `purchase-order.create`.

## Histori Harga Supplier

- Detail Data Barang ada di `/dashboard/purchasing/master/data-supplier/{id}/detail`
  karena halaman lama tidak tahu supplier mana yang dibuka. Superadmin memakai
  `/dashboard/superadmin/master/data-supplier/{id}/detail?from=superadmin` dengan komponen yang sama.
- Grid membaca `GET /suppliers/{id}/prices?tahun=` dan menyimpan lewat
  `PUT /suppliers/{id}/prices`. Pemilih tahun menentukan tahun yang diedit.
  Rata-rata tahun terpilih dan tahun sebelumnya dihitung backend.
- Sel yang diubah ditandai kuning dan baru dikirim saat Simpan Perubahan,
  dalam satu panggilan. Mengosongkan sel menghapus harganya.
- Supplier punya field Pajak Vendor, yaitu PKP atau Non PKP. Field itu ada
  di form dan tabel Data Supplier.

## Yang Belum Ada

- Tombol Download PDF di Detail Data Barang masih belum berfungsi.
- Penawaran Harga PPIC atau SPH ditunda sampai Imel memperbarui branch-nya.
- Tracking masih data tiruan di backend.

## Hasil Uji

Diuji lewat API dengan akun seed. Permintaan pembelian dibuat PPIC dan
disetujui Purchasing. PO sebelum disetujui ditolak 409, dan PO oleh PPIC
ditolak 403. PO yang dibuat menghasilkan subtotal 1.200.000, DPP nilai lain
1.100.000, PPN 132.000, dan grand total 1.337.000 dengan jasa 5.000, sama
dengan pratinjau di layar. Mengirim `dppLain` ditolak 400. Histori harga
diuji dengan GET, PUT, dan mengembalikan nilai awal. Layar di browser
belum diuji.

## Pilihan pada form PO baru

Kolom **Kode Barang** dan **Satuan** ditampilkan sebagai teks biasa, tanpa kotak
input. Nilainya otomatis terisi saat memilih Nama Barang dari dropdown.
Sebelum material dipilih atau ketika nama barang/supplier diubah, keduanya
tampil kosong. Kode dan satuan tetap ikut dikirim saat membuat PO. Harga/Sat
juga otomatis diisi dari `price` di Data Barang saat material dipilih, baik
melalui klik maupun keyboard. Harga tetap bisa disesuaikan; mengganti nama
barang atau supplier mengosongkan harga lama. Total langsung dihitung ulang
berdasarkan jumlah, harga satuan, dan diskon.


Pada form **Buat Pesanan Baru**, dropdown **Data Supplier** menampilkan seluruh
supplier saat dibuka tanpa harus mengetik terlebih dahulu. Data dimuat dari
semua halaman `GET /api/v1/suppliers` memakai `fetchAllPages`. Pencarian dilakukan
pada daftar yang sudah dimuat; membuka ulang dropdown mengembalikan seluruh
pilihan tanpa menghapus supplier yang sedang dipilih.

Pada form **Buat Pesanan Baru**, **PIC / Telp** supplier ditampilkan sebagai
teks yang otomatis terisi setelah nama supplier dipilih, bersama nama perusahaan,
alamat/telepon, NPWP, dan bank. Tidak ada dropdown atau input PIC/Telp.
Untuk sementara kontak dummy dibuat berdasarkan ID supplier melalui
`src/domains/purchasing/data/pic-supplier.ts` dan dikirim sebagai `picSupplier`.
Supplier yang berbeda mendapat kontak/nomor telepon dummy berbeda. Memilih
ulang supplier yang sama menampilkan kontak yang sama, terlepas dari urutan daftar.
Sebelum supplier dipilih, PIC/Telp menampilkan `-`. Kolom PIC/Telp pemesan tetap
memakai data perusahaan.

**Kebutuhan Proyek** menawarkan nama dari `projectName` pada
`GET /api/v1/tracking/spk`, sumber yang sama dengan **Daftar Proyek**. Nama
berulang ditampilkan sekali dan nama kosong diabaikan. Kolom ini juga menerima
teks manual untuk kebutuhan internal, termasuk ketika tracking gagal dimuat.
Kebutuhan Proyek dikirim sebagai `kebutuhanProyek` pada
`POST /api/v1/purchase-orders` dan tersimpan bersama PO. PO langsung mengirim
payload tanpa `approvalRequestId`; backend mengembalikan `approvalRequestId: null`
dan tidak membuat permintaan pembelian baru. Daftar PO tidak menampilkan link
Lihat Permintaan untuk PO langsung. Backend memerlukan migrasi
`0039_direct_purchase_orders` agar alur ini dapat dipakai.

## Detail PO Barang

Kolom **Aksi** pada daftar **PO Barang** menyediakan **Lihat Detail PO** dengan
permission `purchase-order.view`, termasuk untuk PO langsung yang tidak memiliki
permintaan pembelian asal. Link membuka
`/dashboard/purchasing/transaksi/buat-po-barang/detail-po/{id}` dan membaca
`GET /api/v1/purchase-orders/{id}` memakai ID PO.
Struktur detail mengikuti form Buat PO: nomor/tanggal dan status di atas,
tabel Tujuan Pemesanan (Supplier) dan Pemesan berdampingan, rincian barang
di bawahnya, lalu ringkasan biaya di kanan. Seluruh bagian sudah terisi.
Alamat, telepon, NPWP, dan bank supplier berasal dari data master supplier
yang dikembalikan endpoint detail PO; pembaca tidak memerlukan akses endpoint
master supplier terpisah.
Halaman menampilkan data tersimpan: nomor dan tanggal PO, supplier, PIC/Telp,
kebutuhan proyek, status, rincian barang, jumlah, harga, diskon, pajak, jasa,
dan grand total. Nilai total header mengikuti hasil hitung backend. PO batal
juga menampilkan alasan pembatalan. Seluruh informasi tampil tanpa input edit.
Tombol kembali menuju daftar PO Barang. Jika PO berasal dari permintaan
pembelian, link ke permintaan asal hanya tampil dengan
`purchase-request.approve`.

## Simpan dan cetak PO

Pada form **Buat Pesanan Baru**, tombol **Cetak + Buat Purchase Order** memerlukan
`purchase-order.create`. Sistem menyimpan PO ke backend terlebih dahulu,
lalu otomatis membuka dialog print dengan data PO yang sudah tersimpan,
termasuk nomor PO dan total hasil hitung backend. Pembatalan dialog print
tidak membatalkan PO. Tombol dinonaktifkan selama proses simpan untuk mencegah
pengiriman ganda.

Template A4 portrait mengikuti dokumen PO: kop dan logo perusahaan,
nomor/tanggal PO, tabel supplier dan pemesan berdampingan, kebutuhan proyek,
rincian barang dan harga, DPP/PPN/jasa/grand total, catatan pemesanan, dan
kolom tanda tangan kosong. Nomor, tanggal, barang, dan total selalu berasal
dari PO yang dibuat; tanda tangan tidak diisi otomatis. Logo ditunggu selesai
dimuat sebelum dialog cetak dibuka.

Jika simpan gagal, dialog print tidak dibuka. Jika simpan berhasil tetapi
cetak gagal, halaman tetap menampilkan PO berhasil dibuat beserta pesan
kesalahan dan tombol **Cetak Ulang PO**. Tombol ini hanya mencetak PO yang
sudah tersimpan, tanpa membuat PO baru. Setelah dialog ditutup, tombol yang
sama juga bisa dipakai untuk mencetak ulang.

Template cetak memakai kop dengan telepon, fax, email, dan situs perusahaan;
judul PO berada di bawah kop dengan kotak kontrol dokumen **KEU 001**, revisi
**00**, terbit **08/25**. Tanggal PO ditulis dengan nama bulan Indonesia.
Angka harga memakai pemisah ribuan koma dan jumlah memakai dua angka desimal,
sesuai contoh dokumen; baris DPP menampilkan subtotal × 11/12 = DPP dengan
pemisah ribuan titik. Catatan mengikuti enam butir pada contoh, termasuk
Menyesuaikan Lokasi. Bagian tanda tangan mencantumkan nama tercetak
Yosef Boyke Dharma sebagai Direktur Utama; ruang tanda tangan tetap kosong.

## Cetak PO dari daftar

Daftar **PO Barang** menyediakan kolom **Check** dan tombol **Print** untuk
pengguna dengan `purchase-order.view`. Centang PO yang ingin dicetak; centang
pada judul kolom memilih atau melepas semua PO pada halaman itu. Pilihan dapat
mencakup beberapa halaman dan direset ketika pencarian atau filter tanggal
berubah. **Reset pilihan** mengosongkan seluruh pilihan. Print dinonaktifkan
jika belum ada PO yang dipilih atau ketika dokumen sedang disiapkan.

Print mengambil detail terbaru setiap PO terpilih melalui
`GET /api/v1/purchase-orders/{id}` dan membuka satu dialog cetak. Setiap PO
memakai template yang sama dengan Cetak + Buat Purchase Order, lengkap dengan
kop, supplier, rincian barang, total, dan tanda tangan. Setiap PO dimulai pada
halaman baru; PO panjang dapat menggunakan lebih dari satu halaman. PO berstatus
CANCELLED tetap dapat dicetak dan diberi penanda **DIBATALKAN** beserta alasannya.

Jika ada detail yang gagal dimuat, seluruh proses cetak dibatalkan dan pesan
menampilkan PO yang berhasil dimuat serta setiap PO yang gagal beserta alasannya.
Tidak ada PO yang dilewati tanpa pemberitahuan. Jika dialog cetak gagal dibuka,
pilihan tetap tersedia agar bisa dicoba kembali. Cetak tidak membuat PO baru
atau mengubah status PO; menutup atau membatalkan dialog tidak menghapus PO.
