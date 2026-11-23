# Sistem Gudang — Permintaan Pembelian di PPIC dan Rekap Pembelian

## Ringkasan

Gudang membuat permintaan pembelian. PPIC meninjau dan memberi persetujuan
awal, lalu Purchasing memberi persetujuan akhir sebelum membuat PO.
Menu **Permintaan Pembelian** di PPIC merupakan daftar untuk meninjau
permintaan Gudang, tanpa tombol pengajuan baru, edit, atau pembatalan pemohon.
Menu yang sama di Gudang tetap menyediakan pengajuan, edit, dan pembatalan
sesuai permission serta kepemilikan permintaan.

## Alur Persetujuan

1. Gudang mengirim `POST /api/v1/approvals` dengan `type=purchase-request`.
   Backend mencatat langkah pengajuan otomatis dan menempatkan permintaan
   pada langkah 2 dengan status **Menunggu PPIC**.
2. PPIC dengan `purchase-request.approve` membuka **Tinjau Permintaan**
   melalui `/dashboard/ppic/transaksi/permintaan-pembelian/{id}`. PPIC dapat
   Setuju, Tolak, atau Revisi; penolakan dan revisi wajib memiliki catatan.
3. Persetujuan PPIC memajukan permintaan ke langkah 3. Status tetap
   `pending`, ditampilkan sebagai **Menunggu Purchasing**, bukan persetujuan
   final. Purchasing belum dapat membaca daftar/detail permintaan yang
   belum lolos PPIC, kecuali Superadmin yang memiliki akses lintas divisi.
4. Purchasing memberi persetujuan akhir dengan endpoint persetujuan yang
   sama. Hanya sesudah status menjadi `approved`, tombol **Buat PO** tersedia.
   Backend tetap memeriksa status ini sebelum menerima pembuatan PO.

Keputusan memakai `POST /api/v1/approvals/{id}/approve`, `/reject`, atau
`/request-revision`. Permission saja tidak cukup: backend memeriksa domain
pemutus sesuai langkah aktif di dalam transaksi dengan penguncian baris.
Frontend hanya menampilkan tombol keputusan pada tahap divisinya.
Status persetujuan dan status pembelian ditampilkan terpisah di daftar.
Riwayat seluruh langkah dibaca dari `GET /api/v1/approvals/{id}`.

## Permission dan navigasi

Gudang menggunakan `purchase-request.create`. PPIC dan Purchasing memakai
`purchase-request.approve` pada tahap masing-masing; role Koor PPIC diberi
permission tersebut oleh migrasi/seeder. Role PPIC lainnya dapat membaca
sesuai izin menu, tetapi tidak mendapat tombol keputusan tanpa izin approve.
Role khusus dikelola melalui pengaturan permission Superadmin.
PPIC tidak dapat membuat permintaan baru meskipun masih memiliki permission
create dari pengaturan lama. URL tambah PPIC mengarah kembali ke daftar
peninjauan. Form bersama tetap dipakai oleh Gudang.

## Revisi dan data lama

Permintaan yang direvisi dikembalikan kepada pembuat aslinya. Gudang
memperbaiki permintaan yang sama melalui Edit, lalu mengirim ulang.
`PUT /api/v1/approvals/{id}` atau `POST /api/v1/approvals/{id}/resubmit`
memulai putaran baru dan mengembalikan permintaan ke PPIC. Revisi dari
Purchasing juga wajib melewati PPIC kembali; persetujuan putaran sebelumnya
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
mengisi satu baris form dengan barang tersebut, qty saran, satuan, dan
supplier dari master barang; Gudang tetap dapat mengubah qty dan kolom lain.
Barang yang sudah ada di form ditandai **Sudah ada** dan tidak dapat
ditambahkan dua kali. Barang tanpa batas minimum tidak pernah muncul.
Panel tertutup secara default dan hanya dimuat untuk pengguna dengan
`item.view`; daftar diambil dari `GET /api/v1/items` seluruh halaman.

Selain rekomendasi, baris tetap bisa diisi manual untuk kebutuhan proyek
atau SPK yang tidak terkait stok minimum.

## Supplier pada form permintaan

Kolom **Supplier** bersifat hanya-baca. Nilainya terisi otomatis dari
supplier terdaftar pada master barang saat barang dipilih dari pencarian,
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

Halaman Rekap Pembelian di PPIC dan Rekap Permintaan Pembelian di Purchasing
memakai judul **DAFTAR PERMINTAAN PEMBELIAN** dengan teks pengantar
**Kelola pengajuan permintaan pembelian barang.**

## Tanggal pada form permintaan

Kolom **Dikirim Tanggal** pada form tambah, edit, dan revisi dipetakan ke
field API `items[].deadlineTanggal`. Tanggal dari permintaan lama mengisi
kolom yang sama dan tetap dikirim saat menyimpan. Baris yang hanya berisi
tanggal tetap dianggap terisi dan wajib dilengkapi sebelum dikirim.

## Kolom daftar permintaan pembelian

Daftar Permintaan Pembelian di PPIC dan Gudang menampilkan Tanggal,
Bagian / Sub Bagian, Nama Pengaju, Proyek / Client, Rincian Permintaan,
Status Persetujuan, Status Pembelian, dan Aksi. Bagian dan nama pengaju berasal dari identitas
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

## Penandatangan permintaan pembelian Gudang

Form tambah, edit, dan revisi permintaan pembelian pada jalur Gudang
menampilkan kolom tanda tangan **Dibuat — Kepala Gudang** di kiri dan
**Disetujui Oleh — PPIC** di kanan, dengan ruang kosong untuk tanda tangan.
Hasil cetak permintaan dengan bagian Gudang, Gudang Bahan Baku, atau Gudang
Barang Jadi memakai penandatangan yang sama, termasuk saat dicetak dari
daftar PPIC. Untuk permintaan bagian lain, penandatangan persetujuan tetap
**Bag. Purchasing**. Penandatangan PPIC sesuai dengan persetujuan awal; Purchasing tetap memberi
persetujuan akhir melalui alur approval backend.
