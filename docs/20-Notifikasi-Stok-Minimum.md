# Notifikasi Stok Minimum

## Mengatur batas per barang

Di **Data Barang** Gudang (termasuk Gudang Barang Jadi), PPIC, Purchasing,
atau Superadmin, kolom **Stok Minimum** menampilkan batas masing-masing
barang. Hanya Superadmin dan pengguna divisi PPIC dengan permission
`item.update` yang dapat menekan ikon pensil untuk mengubahnya. Role lain,
termasuk Gudang, Gudang Barang Jadi, Purchasing, Keuangan, dan Produksi,
hanya dapat melihat batasnya, walaupun memiliki `item.update`. Tombol edit
hanya tersedia pada halaman Data Barang **Superadmin dan PPIC**. Halaman
Gudang, Gudang Barang Jadi, dan Purchasing selalu menampilkan stok minimum
tanpa tombol edit, termasuk ketika dibuka oleh Superadmin. Backend
juga menolak pengaturan batas oleh role lain melalui POST/PUT barang.
Batas menerima angka 0 sampai 999999999 dengan maksimal
3 angka desimal; gunakan koma untuk mengetik desimal. Kosongkan batas untuk
menonaktifkan notifikasi barang tersebut. Barang lama belum memiliki batas
sampai diatur; sistem tidak memasang angka minimum yang sama untuk semua
barang.

Misalnya, atur Triplex 2 mm dengan stok minimum **10**. Stok 11 tidak
memunculkan peringatan; stok 10 atau kurang memunculkan **Stok menipis:
Triplex 2 mm**, dengan sisa stok dan satuannya. Stok 0 atau kurang memakai
judul **Stok habis**.

## Bel notifikasi

Notifikasi stok tersedia bagi Superadmin serta pengguna dengan `item.view`
di Gudang, Gudang Barang Jadi, PPIC dan Purchasing. Klik notifikasi membuka
Data Barang di divisi pengguna dan langsung menampilkan detail barang terkait
(nama, kode, sisa stok beserta satuan, dan stok minimum), serta menandainya
dibaca. Detail mengambil stok terbaru berdasarkan ID barang, sehingga barang
tetap terbuka meskipun berada di halaman lain atau daftar sedang difilter.
Popup tampil terpisah dari animasi halaman dengan area pemuatan berukuran
stabil. Navigasi dari notifikasi stok mempertahankan posisi scroll.
Tutup detail untuk kembali ke daftar Data Barang. **Tandai semua
dibaca** hanya memengaruhi pengguna yang sedang masuk. Status dibaca
disimpan di backend dan tetap berlaku setelah refresh atau login ulang.

Bel memeriksa jumlah belum dibaca setiap 60 detik saat tab terlihat, saat
tab kembali aktif, dan saat jendela mendapat fokus. Perubahan batas stok
dari Data Barang langsung memicu pemeriksaan ulang. Notifikasi baru setelah
pemeriksaan awal juga menampilkan pesan singkat di sudut layar.

Bel menampilkan **3 notifikasi terbaru**. Tautan **Show all** membuka
`/dashboard/notifications`, yang juga tersedia melalui menu **Notifications**
di sidebar untuk setiap pengguna yang masuk. Halaman tersebut memuat semua
notifikasi yang berhak dilihat pengguna dengan paginasi 20 baris per halaman.
Filter **Semua** dan **Belum dibaca** mengambil hasil dari server; mengganti
filter mengembalikan halaman ke 1. **Tandai semua dibaca** berlaku untuk
seluruh notifikasi pengguna, termasuk yang tidak terlihat pada halaman saat
ini. Perubahan status baca di halaman dan bel saling memperbarui.

Jenis notifikasi dibedakan melalui warna, ikon dan label: stok memakai
amber, laporan masalah rose, persetujuan teal, barang keluar biru muda,
dan jenis lain indigo dengan label Informasi. Label divisi asal ditampilkan
jika API menyediakan `sourceDomain`; notifikasi stok berasal dari Inventory
(Gudang). Label asal tidak diambil dari link tujuan karena tujuan bisa
berbeda dari divisi asal.

Daftar stok berisi peringatan yang masih berlaku.
Peringatan yang sudah dibaca tetap tersedia selama stok masih menipis.
Stok yang kembali di atas batas menghapus peringatan dan mereset status
bacanya, sehingga ketika menipis lagi muncul sebagai belum dibaca.
Perubahan nilai batas juga mereset status dibaca untuk barang itu. Jumlah
stok yang berubah selama tetap di bawah batas memperbarui isi peringatan,
tanpa membuat duplikat baru untuk barang yang sama.

## Integrasi API

Semua endpoint memerlukan autentikasi. Backend menentukan penerima dan
link divisi; frontend tidak mengirim ID pengguna.

| Endpoint | Fungsi |
|---|---|
| `GET /api/v1/items` dan `GET /api/v1/items/:id` | Memuat `minimumStock`, angka atau `null` |
| `PUT /api/v1/items/:id` | Menyimpan `{ "minimumStock": 10 }`, atau `null` untuk menonaktifkan; memerlukan `item.update` dan dibatasi untuk Superadmin atau divisi PPIC |
| `GET /api/v1/notifications?page=1&pageSize=20&unreadOnly=true` | Daftar `rows`, `total`, `page`, `pageSize`, dan `unreadCount`; `pageSize` 1–100; `unreadOnly=true` hanya yang belum dibaca, `total` mengikuti filter |
| `GET /api/v1/notifications/unread-count` | `{ "count": ... }` untuk pengguna yang masuk |
| `POST /api/v1/notifications/:id/read` | Menandai satu peringatan dibaca; ID adalah ID barang |
| `POST /api/v1/notifications/read-all` | Menandai peringatan pengguna dibaca, mengembalikan `{ "updated": ... }` |

Baris notifikasi berisi `id`, `type: LOW_STOCK`, `title`, `body`, `link`,
`readAt`, `createdAt`, serta `sourceDomain` bila tersedia. Untuk `LOW_STOCK`,
ID notifikasi adalah ID barang; frontend menambahkan `?itemId=<id>` pada
link divisi dari backend bila belum tersedia. Data Barang Gudang, Gudang
Barang Jadi, PPIC, Purchasing dan Superadmin membaca parameter ini dan
memuat `GET /api/v1/items/:id` dengan permission `item.view`. Barang yang
tidak lagi tersedia menampilkan pesan kesalahan di detail. Pengguna di luar penerima stok mendapat daftar
kosong dan jumlah 0. Barang yang dihapus, tidak memiliki batas, atau sudah
di atas batas tidak termasuk notifikasi aktif; menandainya dibaca
menghasilkan 404.

## Menjalankan backend

Implementasi backend ada di `../sistem-gudang-api`. Migrasi
`0038_stock_notifications.sql` menambah kolom nullable `items.minimum_stock`
dan tabel `stock_notification_reads` untuk status baca per pengguna.
Jalankan migrasi dan backend yang memuat route `/notifications` sebelum
memakai frontend ini di lingkungan lain. Endpoint yang belum terpasang
menyebabkan pesan **Endpoint Not Found** di bel.

Untuk database pengembangan lokal, helper
`bun run scripts/apply-stock-notifications.ts` menerapkan hanya migrasi
fitur ini tanpa menjalankan migrasi lama yang masih tertunda. Helper
menolak lingkungan production dan host database nonlokal. Migrasi fitur
ini aman diulang. `bun run scripts/verify-stock-notifications.ts` menguji
perilaku terhadap MySQL lokal dengan fixture dan status baca yang seluruhnya
di-rollback.
