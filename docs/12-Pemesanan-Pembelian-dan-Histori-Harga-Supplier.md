# Sistem Gudang — Pemesanan Pembelian dan Histori Harga Supplier

## Ringkasan

Layar Buat PO di Purchasing menyimpan pesanan sebagai `DRAFT` melalui
backend, lalu men-submit PO agar harga dan barisnya beku. Detail Data
Barang pada Data Supplier menampilkan daftar barang terkait supplier
berupa kode, nama, pajak vendor, satuan, dan kategori.

## Pemesanan Pembelian

- Tombol **Simpan Draft** memanggil `POST /purchase-orders`. Nomor PO dibuat
  backend dengan format `PO-001`, jadi kolom Nomor PO dihapus dari form.
  PO baru berstatus `DRAFT`. Layar menampilkan nomor PO, status, proyek,
  nomor SPK, dan grand total dari backend. Harga pada draft masih bisa diedit.
- Tombol **Submit PO** memanggil `POST /purchase-orders/{id}/submit` dan
  tersedia untuk PO `DRAFT` dengan `purchase-order.update`. Submit mengubah
  status menjadi `ISSUED`, mencatat `submittedAt`/`submittedBy`, dan membekukan
  baris serta `hargaSatuan`. Setelah submit, `PUT /purchase-orders/{id}` ditolak
  409 dan PO sudah boleh menerima barang.
- Rumus pajak mengikuti rancangan Imel dan sudah dipakai backend. Subtotal
  adalah jumlah dikali harga satuan dikurangi diskon rupiah per baris. DPP
  nilai lain adalah 11/12 dari subtotal, PPN adalah DPP nilai lain dikali
  persen PPN, dan grand total adalah subtotal ditambah PPN dan jasa.
  Contoh: subtotal 1.200.000 dengan PPN 12 persen menghasilkan DPP nilai
  lain 1.100.000, PPN 132.000, dan grand total 1.332.000 sebelum jasa.
- Total di layar hanya pratinjau. Nilai yang tersimpan dan dikembalikan
  adalah hasil hitung backend. `dppLain` bukan lagi input, dan backend
  menolak body yang memuatnya.
- Harga transaksi adalah `barang[].hargaSatuan` pada PO. Harga Saat Ini di
  tabel mapping hanya dijadikan nilai awal saat membuat PO dan tidak
  menimpa `items.price`; backend menyimpan `itemId` dan `noSpk` dari baris
  permintaan, bukan dari input klien.
- PO hanya bisa dibuat setelah permintaan Gudang disetujui PPIC. Karena
  backend masih memiliki langkah Purchasing, frontend menyelesaikan langkah
  tersebut sekali lewat `POST /approvals/{id}/approve` saat PO pertama
  disimpan; tidak ada tombol persetujuan Purchasing terpisah. Satu permintaan
  boleh punya beberapa PO. PIC supplier dan kode barang setiap baris
  sekarang wajib diisi karena backend mewajibkannya.
- PO tidak dibuat mandiri: tombol **Buat Pesanan Baru** dan route form PO
  tanpa permintaan sudah dihapus. PO selalu dimulai dari permintaan
  pembelian Gudang maupun PPIC.
- Role Purchasing membutuhkan permission `purchase-order.create`.

## Membagi permintaan menjadi beberapa PO

- Form Buat PO otomatis mengelompokkan baris permintaan Gudang maupun PPIC
  berdasarkan pasangan `items[].proyek` dan `items[].noSpk`. Spasi di
  awal/akhir nama proyek diabaikan. Setiap grup memiliki form tersendiri
  dengan tanggal, supplier, PIC, harga barang, diskon, PPN, dan jasa yang
  diisi terpisah. Satu PO hanya memuat satu proyek, satu SPK, dan satu
  supplier; permintaan asal tetap satu dokumen. `noSpk` berasal dari server.
- Purchasing menyimpan setiap form dengan tombol **Simpan Draft**.
  `POST /api/v1/purchase-orders` menerima `approvalRequestId` permintaan asal
  dan `barang[].lineIndex` indeks asli baris permintaan sebelum
  pengelompokan. Proyek dan `noSpk` dibaca backend dari baris permintaan
  yang sudah disetujui, bukan dikirim oleh form. Hanya baris yang dicentang
  yang dihitung dan dikirim; barang dari proyek lain tidak masuk PO tersebut.
- Untuk beberapa supplier pada proyek dan SPK yang sama, centang barang untuk
  supplier pertama. Setelah berhasil, tombol **Simpan Draft PO berikutnya
  untuk proyek ini** membuka kembali form untuk sisa barang. Supplier, PIC, dan
  jasa dikosongkan agar diisi untuk pesanan berikutnya. Baris yang berhasil
  disimpan langsung ditandai sudah dipesan dan tidak dikirim ulang.
- Hasil penyimpanan ditampilkan pada setiap proyek. Jika satu proyek gagal,
  pesan kegagalannya tampil dan isiannya tetap tersedia untuk dicoba lagi;
  PO proyek lain yang berhasil tetap tersimpan dan ditampilkan. Barang yang
  belum dipilih tetap menjadi sisa pesanan, bukan dihapus.
- Tombol **Simpan Draft** dinonaktifkan selama daftar PO sebelumnya dimuat, jika
  pemuatan gagal, jika proyek kosong, atau jika semua barang proyek sudah
  dipesan. Kegagalan memuat daftar PO menyediakan tombol **Coba lagi**.
  Barang tanpa proyek tetap ditampilkan dengan pesan agar permintaan asal
  diperbaiki sebelum PO dapat dibuat.
- Baris yang sudah masuk PO aktif (bukan batal) ditandai **Sudah dipesan**
  dan tidak bisa dicentang lagi. Daftar PO aktif dibaca lewat
  `GET /purchase-orders?approvalRequestId=` lalu `GET /purchase-orders/{id}`
  untuk barisnya. Backend tetap menolak baris yang sudah dipesan dengan 409.
- Detail permintaan Purchasing menampilkan tabel PO milik permintaan
  (nomor, tanggal, supplier, grand total) dan progres `purchaseStatus`.
  Nomor PO di tabel membuka halaman Detail PO Barang untuk pengguna dengan
  `purchase-order.view`.
  Bila semua baris sudah dipesan, tombol Buat PO berganti menjadi keterangan
  bahwa semua barang sudah dipesan.
- Halaman **PO Barang** (`/dashboard/purchasing/transaksi/buat-po-barang`)
  menampilkan PO yang sudah dibuat, bukan daftar permintaan. Datanya dari
  `GET /purchase-orders`: nomor PO, tanggal, supplier, dan status. Pencarian
  mencocokkan nomor PO atau nama supplier; pengurutan, filter tanggal,
  paginasi, ekspor CSV per halaman, dan cetak massal memakai data PO ini.
  Halaman butuh `purchase-order.view`; tanpa izin itu daftar kosong dengan
  pesan.
- Aksi per baris: **Lihat Detail PO** (`purchase-order.view`) dan
  **Lihat Permintaan** (`purchase-request.approve`, hanya jika PO punya
  `approvalRequestId`). Tautan permintaan membuka
  `/dashboard/purchasing/transaksi/buat-po-barang/permintaan-pembelian/{id}`;
  panah kembali menuju daftar PO Barang. Detail permintaan dari Rekap
  Pembelian tetap memakai URL lama dan kembali ke Rekap Pembelian.
- Cetak massal: kolom centang berada di depan tabel; centang PO (per baris
  atau semua di halaman), tombol **Print** mengambil detail tiap PO lewat
  `GET /purchase-orders/{id}` lalu membuka satu dialog cetak. Pilihan bertahan lintas halaman, pencarian, filter tanggal,
  dan urutan; hilang saat layar ditutup. Banner hijau di atas tabel
  menampilkan jumlah PO terpilih dan tombol **Reset pilihan PO**. Jika satu detail gagal dimuat, seluruh cetak
  dibatalkan dan pesan menampilkan PO yang berhasil dan gagal.
- **Rekap Permintaan Pembelian** di Purchasing dan PPIC membaca
  `GET /approvals?type=purchase-request` sehingga memuat permintaan yang
  diajukan Gudang maupun PPIC. Halaman ini sengaja tetap berupa daftar
  permintaan; PO yang sudah dibuat ada di halaman PO Barang.
- Tombol **Buat PO** di detail permintaan yang dibuka dari PO Barang membawa
  `?from=permintaan-po-barang`, sehingga kembali dari form menuju detail
  permintaan versi PO Barang (sidebar tetap di PO Barang), bukan Rekap
  Permintaan Pembelian.
- Di halaman Detail PO, tautan **Lihat Permintaan Pembelian Asal** memakai
  URL PO di atas, sehingga panah kembali menuju daftar PO Barang, bukan
  Rekap Pembelian.
- Daftar **Rekap Permintaan Pembelian** memakai gaya tabel yang sama dengan
  daftar lain: kartu putih, pencarian, baris bergaris tipis, badge status
  berwarna, dan paginasi.
- Status permintaan tampil sebagai badge di samping judul detail, sehingga
  tetap terlihat walau pengguna tidak memiliki tombol aksi (approve atau
  buat PO).
- Baris tombol aksi memakai `flex-wrap`, jadi tetap tersusun tanpa meluber
  di layar sempit.
- Setelah PO tersimpan, hasil tetap tampil pada kelompok proyeknya agar
  Purchasing dapat melanjutkan proyek lain. Tombol kembali membuka halaman
  asal sesuai jalur navigasi.

## Detail PO dan cetak PO

- Halaman **Detail PO Barang** ada di
  `/dashboard/purchasing/transaksi/buat-po-barang/detail-po/{id}` dan membaca
  `GET /api/v1/purchase-orders/{id}`. Halaman butuh `purchase-order.view`;
  link ke permintaan asal hanya tampil untuk `purchase-request.approve`.
  Isinya mengikuti form Buat PO: nomor/tanggal dan status di atas, tabel
  Tujuan Pemesanan (Supplier) dan Pemesan berdampingan, rincian barang, lalu
  ringkasan biaya. Alamat, telepon, NPWP, dan bank supplier berasal dari data
  yang dikembalikan endpoint detail PO. PO batal menampilkan alasannya.
- Status `DRAFT`, `ISSUED`, `PARTIALLY_RECEIVED`, dan `RECEIVED` mengikuti
  kontrak backend: tiga status penerimaan turunan dari baris inbound aktif.
  Detail PO menampilkan `No SPK`, `Diterima`, dan `Sisa` per barang, serta
  tanggal submit bila ada. PO `DRAFT` menampilkan ajakan submit dan tautan
  edit untuk pemilik `purchase-order.update`.
- Setelah PO tersimpan, layar sukses menampilkan nomor dan grand total serta
  tombol **Cetak PO**. Tombol ini hanya mencetak PO yang sudah tersimpan
  (`printPurchaseOrder`), termasuk saat mencetak ulang setelah dialog cetak
  gagal. Mencetak tidak membuat PO baru atau mengubah status PO.
- Template A4 portrait untuk cetak satu PO maupun cetak massal menyediakan
  ruang kosong 4 cm dari tepi atas kertas untuk kop fisik, tanpa mencetak kop
  atau logo perusahaan. Label **Nomor PO** tetap ada dengan nilai kosong;
  tanggal PO mengikuti data tersimpan. Template memuat tabel supplier dan pemesan, rincian barang, `No SPK`, dan
  harga, DPP/PPN/jasa/grand total, enam catatan pemesanan, dan kolom tanda
  tangan kosong. PO `DRAFT` diberi penanda belum disubmit; PO batal tetap
  memuat alasan pembatalan. Angka dan total selalu berasal dari PO backend.

## Detail Barang Supplier

- Detail Data Barang ada di `/dashboard/purchasing/master/data-supplier/{id}/detail`.
  Superadmin memakai `/dashboard/superadmin/master/data-supplier/{id}/detail?from=superadmin`
  dengan komponen yang sama.
- Panah kembali di samping judul membuka daftar supplier pada divisi asal.
  Tabel dibatasi lebar 48rem dengan jarak kolom dan baris rapat; pada layar
  kecil, tabel dapat digeser horizontal.
- Tabel hanya menampilkan No, Kode Barang, Nama Barang, Pajak Vendor,
  Satuan, dan Kategori. Pencarian mencakup kode dan nama barang.
- Harga bulanan, kolom rata-rata, pemilih tahun, dan aksi Simpan Perubahan
  tidak ditampilkan. Halaman tidak lagi mengedit histori harga.
- Daftar dan identitas supplier tetap dibaca lewat
  `GET /suppliers/{id}/prices?tahun=<tahun sekarang>`, satu kali tanpa
  permintaan tahun sebelumnya. Data harga yang ikut dikembalikan tidak
  ditampilkan atau diubah oleh halaman ini.
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

## Edit PO Barang Purchasing

Hanya baris PO berstatus `DRAFT` yang menampilkan tombol **Edit** untuk akun
dengan `purchase-order.update`. Form berada di
`/dashboard/purchasing/transaksi/buat-po-barang/edit-po/{id}` dan memerlukan
`purchase-order.view` serta `purchase-order.update`. PO yang sudah disubmit
atau dibatalkan tidak membuka form.

Form edit memakai susunan yang sama dengan form Buat PO: proyek dan
tanggal di atas, tabel supplier serta pemesan berdampingan, tabel barang
dengan `No SPK` read-only, lalu kotak total harga, DPP, PPN, dan jasa.
Bagian supplier/pemesan dan perhitungan total memakai komponen bersama agar
kedua form konsisten. Kolom **Pilih** awalnya mencentang semua barang; hanya
barang yang tetap dipilih yang dihitung dan disimpan, dengan minimal satu
barang.

Form memuat nilai tersimpan dan dapat mengubah tanggal PO, PIC supplier,
kode/nama/satuan setiap barang, jumlah, harga satuan, diskon, PPN, dan jasa.
Supplier dan kebutuhan proyek tampil read-only: supplier ditetapkan saat PO
dibuat dan `PUT /purchase-orders/{id}` menolak `supplierId`, sementara SPK
diambil dari baris PO. Jumlah pembelian boleh melebihi permintaan asli,
dengan batas 1.000.000. Nomor PO dibuat sistem dan referensi
permintaan asal tetap. Data pemesan menggunakan identitas perusahaan
bersama, sedangkan total dihitung ulang otomatis dengan rumus yang sama
seperti form pembuatan PO.

**Simpan Perubahan** mengirim `PUT /api/v1/purchase-orders/{id}` dengan
seluruh isian dan daftar barang. Backend hanya menerima perubahan pada PO
`DRAFT` dan menyinkronkan pemetaan supplier untuk PO terkait permintaan
dalam transaksi yang sama; pemetaan PO lain tidak diambil alih. Kegagalan
menampilkan pesan dan mempertahankan isian. Setelah berhasil, tersedia
tautan detail PO dan tombol **Submit PO** yang memanggil
`POST /api/v1/purchase-orders/{id}/submit`. **Batal** kembali ke daftar PO
Purchasing. PO yang sudah disubmit atau dibatalkan tidak menyediakan tombol
atau form edit.
