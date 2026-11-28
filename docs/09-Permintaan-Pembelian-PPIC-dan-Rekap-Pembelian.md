# Sistem Gudang — Permintaan Pembelian di PPIC dan Rekap Pembelian

## Ringkasan

Gudang membuat permintaan pembelian. PPIC meninjau dan memberi persetujuan
permintaan, lalu Purchasing langsung menyiapkan PO tanpa tombol persetujuan terpisah.
Menu **Permintaan Pembelian** di PPIC merupakan daftar untuk meninjau
permintaan Gudang, tanpa tombol pengajuan baru, edit, atau pembatalan pemohon.
Menu yang sama di Gudang tetap menyediakan pengajuan, edit, dan pembatalan
sesuai permission serta kepemilikan permintaan. Rencana PO-first di
`22-Rencana-Multi-Supplier-dan-Harga.md` menempatkan PPIC sebagai jalur utama
pemohon; sampai sekarang URL tambah PPIC mengarah kembali ke daftar tinjauan,
jadi jalur PPIC sebagai pemohon belum tersedia di UI dan perlu dikerjakan
terpisah. PPIC tetap dapat mengedit atau mengirim ulang permintaan yang
direvisi lewat halaman terkait.

## Alur Persetujuan

1. Gudang mengirim `POST /api/v1/approvals` dengan `type=purchase-request`.
   Backend mencatat langkah pengajuan otomatis dan menempatkan permintaan
   pada langkah 2 dengan status **Menunggu PPIC**.
2. PPIC dengan `purchase-request.approve` membuka **Tinjau Permintaan**
   melalui `/dashboard/ppic/transaksi/permintaan-pembelian/{id}`. PPIC dapat
   Setuju, Tolak, atau Revisi; penolakan dan revisi wajib memiliki catatan.
3. Persetujuan PPIC memajukan permintaan ke langkah 3. Backend lama masih
   memakai `pending`, `currentStepOrder=3` untuk tahap ini. Purchasing dapat
   memilih supplier dan Qty Beli, lalu menekan **Buat PO** untuk membuka form
   yang dikelompokkan per supplier dan proyek. Permintaan yang belum lolos
   PPIC belum bisa dilanjutkan ke PO.
4. Purchasing melengkapi form lalu menekan **Buat**. Tidak ada tombol
   Setuju, Tolak, atau Revisi Purchasing. Karena backend masih mensyaratkan
   `approved`, aplikasi membaca status terbaru dan menyelesaikan langkah
   Purchasing melalui `POST /api/v1/approvals/{id}/approve` saat menyimpan
   PO pertama, lalu memeriksa bahwa status benar-benar `approved` sebelum
   mengirim pemetaan supplier dan PO. Beberapa form dalam satu halaman
   berbagi proses penyelesaian ini agar endpoint tidak dipanggil berulang.
   Membuka form atau melengkapi rincian tidak mengubah status backend.

Keputusan PPIC memakai `POST /api/v1/approvals/{id}/approve`, `/reject`, atau
`/request-revision`. Backend memeriksa permission dan domain pemutus sesuai
langkah aktif. Jika penyelesaian tahap backend gagal atau status berubah,
PO tidak dikirim dan input form tetap dipertahankan.
Status persetujuan dan status pembelian ditampilkan terpisah di daftar.
Riwayat seluruh langkah dibaca dari `GET /api/v1/approvals/{id}`.

## Permission dan navigasi

Gudang menggunakan `purchase-request.create`. PPIC memakai
`purchase-request.approve` untuk keputusan permintaan, tetapi permission ini
**tidak** diberikan oleh migrasi/seeder: sesuai `src/test/integration/permissions.test.ts`,
izin tersebut saat ini melekat pada Koor Purchasing. Untuk memakai jalur
tinjauan PPIC, Koor PPIC harus diberi `purchase-request.approve` manual lewat
Superadmin → Roles (`PUT /api/v1/superadmin/roles/{id}/permissions`, replace-all,
jadi permission lama harus tetap dicentang). Purchasing memakai
`purchase-order.create` untuk menyiapkan dan menyimpan PO. Selama backend
masih memiliki langkah Purchasing, penyimpanan PO dari permintaan
`pending` langkah 3 juga memerlukan `purchase-request.approve`; akun tanpa
izin ini mendapat pesan bahwa proses tidak dapat dilanjutkan, tanpa
mengirim pemetaan atau PO. Permintaan yang sudah `approved` tidak
memerlukan panggilan persetujuan lagi. Role PPIC lainnya dapat membaca
sesuai izin menu, tetapi tidak mendapat tombol keputusan tanpa izin approve.
PPIC tidak dapat membuat permintaan baru meskipun masih memiliki permission
create dari pengaturan lama. URL tambah PPIC mengarah kembali ke daftar
peninjauan. Form bersama tetap dipakai oleh Gudang.

## Revisi dan data lama

Permintaan yang direvisi dikembalikan kepada pembuat aslinya. Gudang
memperbaiki permintaan yang sama melalui Edit, lalu mengirim ulang.
`PUT /api/v1/approvals/{id}` atau `POST /api/v1/approvals/{id}/resubmit`
memulai putaran baru dan mengembalikan permintaan ke PPIC. Revisi dari
data lama juga wajib melewati PPIC kembali; persetujuan putaran sebelumnya
tidak dapat dipakai untuk melewati tahap baru.

Migrasi backend `0040_gudang_ppic_purchase_approval` menambahkan langkah
Gudang, PPIC, dan Purchasing serta permission bawaan. Permintaan pending
lama menunggu PPIC, sedangkan permintaan yang sudah final dan riwayatnya
tetap dipertahankan. Permintaan historis yang dibuat PPIC tetap dapat dibaca
dan diperbaiki oleh pembuat aslinya melalui URL edit/revisi lama; pengajuan
baru PPIC diblokir. Konfigurasi backend harus dimigrasikan bersama frontend.

## Lampiran

Lampiran Rekap Dokubah dan Kartu Stok belum tersedia di payload
purchase-request, sehingga tampilan detail tidak mengunggah lampiran baru.

## Rekomendasi restock

Form Tambah, Edit, dan Revisi menampilkan panel **Rekomendasi Restock** di
atas rincian barang. Panel memuat barang yang batas stok minimumnya sudah
diatur dan stoknya sama dengan atau di bawah batas tersebut, diurutkan dari
yang paling kritis. Setiap baris menampilkan nama, kode, stok, batas
minimum, satuan, supplier terdaftar, dan **Saran QTY** sebesar
`minimum − stok` (minimal 1, dibulatkan ke atas). Tombol **Tambah**
mengisi satu baris form dengan referensi barang, qty saran, dan satuan.
Di Gudang, supplier tetap kosong; qty dan kolom lain masih dapat diubah.
Barang yang sudah ada di form ditandai **Sudah ada** dan tidak dapat
ditambahkan dua kali. Barang tanpa batas minimum tidak pernah muncul.
Panel tertutup secara default dan hanya dimuat untuk pengguna dengan
`item.view`; daftar diambil dari `GET /api/v1/items` seluruh halaman.

Selain rekomendasi, baris tetap bisa diisi manual untuk kebutuhan proyek
atau SPK yang tidak terkait stok minimum.

## Supplier pada form permintaan

Kolom **Supplier** bersifat hanya-baca. Di Gudang kolom ini tetap kosong
karena supplier pesanan dipilih Purchasing. Pada form historis PPIC,
nilainya terisi otomatis dari supplier terdaftar pada master barang saat
barang dipilih dari pencarian,
dan dikosongkan lagi bila nama barang diubah. PPIC tidak memilih supplier;
supplier final ditentukan Purchasing saat membuat PO, karena satu PO
memakai satu supplier dan pemetaan supplier barang adalah kewenangan
Purchasing (`item.set-supplier`). Barang yang belum dipetakan menampilkan
kolom supplier kosong; usulan supplier lain bisa ditulis di Keterangan.

## Cetak form permintaan

Form pengajuan dan edit di Gudang tidak menampilkan tombol **Cetak**. Pada form edit/revisi permintaan historis PPIC, tombol **Cetak** di samping tombol simpan mencetak isi form apa adanya,
sebelum maupun sesudah permintaan dikirim. Kop perusahaan dilengkapi kotak
identitas formulir di kanan atas: **PPIC 002**, **Rev : 00**, dan
**Terbit : MM/YY** yang diambil dari tanggal pengajuan surat (bukan tanggal
tetap). Dokumen memuat identitas pemohon (bagian, nama, jabatan, tanggal pengajuan, periode bila
diisi), tabel barang yang sudah terisi, dan kolom tanda tangan Dibuat serta
Disetujui Oleh. Baris kosong tidak ikut tercetak; bila belum ada baris
terisi, tabel menampilkan **Belum ada barang**. Isi kolom di-escape dan
pencetakan memakai `cetakLaporan` (iframe tersembunyi), bukan pop-up.

Daftar Permintaan Pembelian Gudang tidak menampilkan tombol **Cetak**. Di daftar PPIC, tombol **Cetak** tersedia pada kolom Aksi setiap permintaan bagi pengguna dengan `purchase-request.create`, `purchase-request.approve`, atau `approval.view`. Tombol mencetak data permintaan yang sudah tersimpan memakai format formulir yang sama, tanpa menyimpan atau mengajukan ulang. Jika payload permintaan tidak tersedia, tombol dinonaktifkan. Kegagalan cetak ditampilkan pada halaman dan tombol dapat dicoba lagi.

## Pilihan pemohon pada form

Kolom **Bagian/Sub bagian**, **Nama**, dan **Jabatan** pada form tambah, edit,
dan revisi permintaan historis PPIC memakai dropdown. Di Gudang, ketiganya ditampilkan sebagai kolom baca saja tanpa dropdown. Pilihan sementara berupa
data dummy di `src/domains/ppic/data/pemohon-pembelian.ts`, tanpa endpoint baru.
Ketiga pilihan berdiri sendiri dan wajib terisi sebelum mengajukan.
Nilainya dikirim sebagai `bagian`, `namaPemohon`, dan `jabatan` pada payload
permintaan. Saat membuka data lama, nilai yang belum ada di daftar dummy tetap
muncul dan dipertahankan saat disimpan.

Pada pengajuan baru di Gudang, ketiga kolom otomatis terisi dari akun login: **Bagian/Sub bagian** dari divisi akun, **Nama** dari `username`, dan **Jabatan** dari `roleName`. Jika akun tidak memiliki divisi yang dikenali, bagian memakai **Gudang**. Ketiga nilai identitas dikunci dan tidak dapat diubah di form Gudang; username dan role akun ditampilkan langsung. Edit atau revisi mempertahankan identitas pada permintaan yang tersimpan. Form edit/revisi permintaan historis PPIC tetap mempertahankan identitas tersimpan.

## Pilihan proyek pada rincian barang

Kolom **Proyek** memakai dropdown yang dapat dicari pada setiap baris form
Gudang dan PPIC. Pilihannya berasal dari kolom **Client** (`client`) pada
`GET /api/v1/tracking/spk`, sumber yang sama dengan halaman **Daftar Proyek**.
Seluruh daftar diambil tanpa `limit`; client yang kosong atau `-` diabaikan dan nama
berulang ditampilkan satu kali setelah spasi awal/akhir dihapus. Nama client
yang dipilih disimpan pada `items[].proyek` dan menjadi dasar pengelompokan PO.
Nilai proyek lama tetap ditampilkan saat edit/revisi walaupun sudah tidak ada
dalam daftar tracking. Mengganti proyek mengosongkan `noSpk` lama pada baris
agar nomor SPK sebelumnya tidak ikut dipakai untuk proyek baru.
Jika tracking gagal dimuat, form menampilkan pesan kesalahan.

## Judul halaman rekap

Halaman Rekap Pembelian di PPIC dan Permintaan Pembelian di Purchasing
memakai judul **DAFTAR PERMINTAAN PEMBELIAN** dengan teks pengantar
**Kelola pengajuan permintaan pembelian barang.** Menu Permintaan Pembelian
Purchasing berada di grup **Transaksi**, tepat di atas **PO Barang**.

Kartu dan tabel rekap memenuhi lebar halaman. Lebar kolom dibagi secara
proporsional agar jarak Tanggal, Permintaan, Status, dan Aksi seimbang.
Header dan isi kolom sejajar; teks permintaan panjang membungkus ke baris
berikutnya. Pada layar sempit, tabel dapat digulir secara horizontal.

## Tanggal pada form permintaan

Kolom **Dikirim Tanggal** pada form tambah, edit, dan revisi dipetakan ke
field API `items[].deadlineTanggal`. Tanggal dari permintaan lama mengisi
kolom yang sama dan tetap dikirim saat menyimpan. Baris yang hanya berisi
tanggal tetap dianggap terisi dan wajib dilengkapi sebelum dikirim.

## Kolom daftar permintaan pembelian

Daftar Permintaan Pembelian di PPIC dan Gudang menampilkan Tanggal,
Bagian / Sub Bagian, Nama Pengaju, Proyek / Client, Rincian Permintaan,
Status Permintaan, dan Aksi. Kolom **Status Permintaan** memuat badge
persetujuan dan pembelian dalam satu sel, tersusun ke bawah. Permintaan
batal cukup menampilkan satu badge **Dibatalkan**. Bagian dan nama pengaju berasal dari identitas
pada permintaan yang tersimpan, bukan dari akun yang sedang melihat daftar.
Kolom Proyek / Client menampilkan semua nilai `items[].proyek` yang berbeda
pada permintaan tersebut; nama client yang berulang ditampilkan satu kali.
Rincian menampilkan jumlah baris barang, nama setiap barang, kuantitas,
satuan, dan keterangan bila tersedia. Jika permintaan memuat beberapa
proyek/client, rincian setiap barang juga menampilkan proyek/client-nya.
Isi rincian membungkus ke baris berikutnya dan tidak dipotong dengan elipsis.
Identitas atau proyek yang tidak tersedia ditampilkan sebagai `-`.
Seluruh informasi berasal dari payload daftar `GET /api/v1/approvals`
dengan `type=purchase-request`; tidak ada pemanggilan detail tambahan per baris.

Lebar kolom dibagi proporsional dengan ruang terbesar untuk rincian barang.
Teks panjang membungkus, dan tabel dapat digeser horizontal pada layar sempit.
Kolom **Aksi** memakai tombol titik tiga yang membuka ikon, dengan nama aksi
saat diarahkan atau mendapat fokus. Mode tinjau PPIC menyediakan ikon mata
untuk **Tinjau Permintaan** dan ikon printer untuk **Cetak** sesuai izin.
Mode pengaju menyediakan **Detail**, **Edit** (pensil), dan **Batalkan**
(larangan); edit dan pembatalan hanya untuk permintaan pending/perlu revisi
milik pengaju dengan `purchase-request.create`, atau Superadmin. Cetak tetap
hanya ada pada jalur PPIC bagi pengguna dengan `purchase-request.create`,
`approval.view`, atau `purchase-request.approve`. Jalur Gudang tidak
menampilkan cetak, dan tautan edit/tambah tetap mengikuti divisi asal.

## Penandatangan permintaan pembelian Gudang

Form tambah, edit, dan revisi permintaan pembelian pada jalur Gudang
menampilkan kolom tanda tangan **Dibuat — Kepala Gudang** di kiri dan
**Disetujui Oleh — PPIC** di kanan, dengan ruang kosong untuk tanda tangan.
Hasil cetak permintaan dengan bagian Gudang, Gudang Bahan Baku, atau Gudang
Barang Jadi memakai penandatangan yang sama, termasuk saat dicetak dari
daftar PPIC. Untuk permintaan bagian lain, penandatangan persetujuan tetap
**Bag. Purchasing**. Penandatangan PPIC sesuai dengan persetujuan permintaan;
tahap Purchasing yang masih diwajibkan backend diselesaikan saat PO disimpan.

## Rincian permintaan dan persiapan PO Purchasing

Detail permintaan pada **Permintaan Pembelian** Purchasing dan pada
**PO Barang** memakai tabel rincian yang sama: No, Tanggal, Supplier, Nama
Barang, Stok Saat Ini, QTY, Qty Beli, SAT, Proyek, Keterangan, dan Dikirim
Tanggal. Tanggal, keterangan, serta tanggal kirim berasal dari payload
permintaan. Riwayat Persetujuan tidak ditampilkan pada detail Purchasing;
detail PPIC dan Gudang tetap memakai tampilan riwayatnya.

QTY tetap menunjukkan kuantitas permintaan asli. Setelah PPIC menyetujui
(`pending`, `currentStepOrder=3`) atau pada permintaan yang sudah final
(`approved`), pengguna dengan `purchase-order.create` dapat memilih
supplier per baris melalui dropdown pencarian `GET /api/v1/suppliers`
dan mengubah **Qty Beli**, yang awalnya sama dengan QTY. Supplier wajib
dipilih untuk setiap baris yang belum dipesan. Tombol **Buat PO** langsung
tersedia setelah PPIC menyetujui, tanpa keputusan Purchasing terpisah.
Menyiapkan rincian dan membuka form tidak menerbitkan PO.

Dropdown supplier pada rincian Purchasing memuat seluruh halaman
`GET /api/v1/suppliers`, lalu menyediakan pencarian lokal pada dua bagian:
**Supplier Material** di atas berisi supplier yang sudah dipetakan pada
master material (`suppliers`), dan **Supplier Lainnya** di bawah garis
pemisah berisi supplier di luar pemetaan tersebut. Supplier tidak muncul
dua kali dan seluruh pilihan tetap bisa dipilih. Setiap material memakai
pemetaan masing-masing; pemetaan katalog tidak otomatis memilih supplier
pesanan. Jika daftar `suppliers` belum tersedia, supplier tunggal
`supplierId` dipakai sebagai pemetaan lama; daftar kosong berarti belum
ada pemetaan. Permintaan lama memakai master yang cocok secara unik
berdasarkan nama dan satuan. Jika master tidak tersedia atau akun tidak
memiliki `item.view`, bagian atas menampilkan pemetaan belum tersedia dan
supplier lainnya tetap bisa dipilih. Perilaku ini dipakai pada kedua jalur
masuk rincian Purchasing; dropdown pada form PO tetap memakai pencarian server.

Memilih **Supplier Lainnya** langsung menambahkan supplier itu ke master
material, tanpa menunggu **Generate PO**. Frontend membaca ulang
`GET /api/v1/items/{id}`, menggabungkan supplier terpilih dengan seluruh
supplier yang sudah ada, lalu menyimpan `PUT /api/v1/items/{id}/suppliers`
dengan `{ supplierIds: number[] }`. Pemetaan lama tetap dipertahankan dan
supplier tidak diduplikasi. Supplier yang berhasil tersimpan langsung
muncul di bagian **Supplier Material** pada seluruh baris material yang
sama, tetap tersedia setelah halaman dimuat ulang, dan tampil pada
**Detail Supplier Material** di Data Barang Purchasing. Memilih supplier
yang sudah dipetakan tidak menyimpan ulang. Mengganti pilihan PO tidak
menghapus supplier yang pernah ditambahkan ke material. Penambahan ini
tidak membuat stok, harga, atau transaksi PO baru.

Penyimpanan otomatis memerlukan `item.view`, `item.update`, dan
`item.set-supplier`, serta ID master material yang diketahui; untuk
permintaan lama, kecocokan nama dan satuan harus unik. Selama simpan,
pilihan supplier, penambahan/penghapusan baris supplier, dan **Generate PO**
dikunci. Jika gagal menyimpan, pilihan supplier untuk PO tetap terisi,
pemetaan material tidak dianggap berhasil, dan pesan kegagalan menyediakan
tombol **Coba lagi simpan supplier material**. Tanpa izin atau master yang
dapat dikenali, pengguna tetap bisa memilih supplier PO dan diberi tahu
bahwa pemetaan material belum disimpan.

Qty Beli wajib berupa
bilangan bulat positif, maksimal 1.000.000. Qty Beli boleh lebih kecil
atau lebih besar dari QTY permintaan asli, misalnya permintaan 12 dibeli
20. QTY asli tidak berubah. Pemetaan supplier, jumlah PO, dan perhitungan
harga menggunakan Qty Beli. Baris yang sudah masuk PO aktif dikunci
dan tidak dimasukkan kembali dalam persiapan PO. Jika daftar PO sebelumnya
gagal dimuat, persiapan dikunci dan tersedia tombol Coba lagi.

**Stok Saat Ini** dibaca melalui `GET /api/v1/items/{id}` untuk `itemId`
yang tersimpan, dengan permission `item.view`. Permintaan lama tanpa
`itemId` dicocokkan melalui pencarian `GET /api/v1/items` berdasarkan nama
dan satuan yang sama persis tanpa membedakan huruf besar/kecil. Hanya
kecocokan tunggal yang digunakan; barang ambigu, tidak ditemukan, atau
gagal dimuat ditampilkan **Tidak tersedia**, bukan stok nol.

Tombol **Buat PO** membuka form PO terisi, tanpa langsung menerbitkan PO.
Barang dikelompokkan menurut pasangan proyek dan `noSpk`, lalu per supplier;
kombinasi yang berbeda memiliki form terpisah. Nama barang, satuan, proyek,
SPK, supplier, kode barang dari master bila tersedia, dan **Qty Beli**
diteruskan ke form.
Jumlah pesanan dan perhitungan total memakai Qty Beli. Indeks baris asli
(`lineIndex`) dipertahankan walaupun barang terbagi ke beberapa form.
Data persiapan disimpan di `sessionStorage` tab browser dengan token acak
pada parameter `draft`; data yang hilang atau berbeda dari permintaan
terbaru meminta pengguna menyiapkan ulang dari detail. Parameter `from`
tetap menjaga tujuan kembali ke detail asal.

Pengguna melengkapi tanggal PO, PIC supplier, kode barang bila belum ada,
dan harga, lalu menekan **Buat** pada setiap form. Sebelum
`POST /api/v1/purchase-orders`, form memanggil
`PUT /api/v1/approvals/{id}/mapping` (`purchase-order.create`) dengan
`{ lines: [{ lineIndex, suppliers: [{ supplierId, qty }] }] }`, hanya untuk
barang yang dipilih dalam form itu. Pemetaan mengikat supplier dan Qty Beli
yang harus sama dengan `barang[].jumlah` pada PO. Baris lain tidak diubah.
Jika pemetaan atau penerbitan PO gagal, form menampilkan pesan dan tetap
menyimpan input untuk diperbaiki atau dicoba lagi.

## Perlu Tindakan pada dashboard Purchasing

Bagian **Perlu Tindakan** menampilkan maksimal lima permintaan pembelian
yang sudah disetujui PPIC dan siap diproses menjadi PO oleh Purchasing
(`status=pending`, `currentStepOrder=3`). Permintaan yang masih menunggu
PPIC atau sudah selesai diputuskan tidak masuk daftar ini. Data dibaca
dari `GET /api/v1/approvals` dengan `type=purchase-request` dan
`status=pending`; seluruh halaman dibaca sebelum penyaringan tahap dan
pembatasan lima baris karena endpoint belum menyediakan filter tahap.
Urutan mengikuti respons API. Tombol **Tinjau** membuka detail permintaan
di Rekap Permintaan Pembelian Purchasing. Bagian ini hanya tampil untuk
pengguna dengan `purchase-order.create`. Kartu **Siap Diproses** memakai
daftar yang sama dan menghitung seluruh permintaan yang siap, sebelum
pembatasan lima baris.

## Supplier pada permintaan pembelian Gudang

Form tambah, edit, dan revisi permintaan pembelian Gudang tidak menetapkan
supplier. Kolom Supplier tetap kosong dengan petunjuk **Diisi Purchasing**;
memilih barang dengan mouse atau keyboard maupun menambah rekomendasi
restock tidak menyalin supplier master barang. Saat mengedit permintaan
lama, supplier pada payload lama juga tidak diisi ulang atau dikirim oleh
Gudang. Referensi `itemId`, satuan, dan kuantitas barang tetap digunakan.
Penentuan supplier pesanan dilakukan per baris oleh Purchasing pada
rincian permintaan, terpisah dari supplier katalog barang.
