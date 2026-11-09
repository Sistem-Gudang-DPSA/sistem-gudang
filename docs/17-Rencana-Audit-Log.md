# Rencana Audit Log dan Layar Log Aktivitas

Dokumen ini adalah catatan untuk pekerjaan berikutnya. Belum ada yang dikerjakan di sisi frontend maupun backend. Isinya hasil analisis backend tentang apa yang sudah dan belum tercatat, ditambah pembagian tugas antara backend dan frontend.

## Kondisi Saat Ini

Tabel `audit_logs` di backend menyimpan user, aksi (CREATE, UPDATE, DELETE), nama tabel, id baris, nilai sebelum, nilai sesudah, dan waktu. Tidak ada IP maupun user agent. Log selalu ditulis di transaksi yang sama dengan perubahan datanya, sehingga tidak ada perubahan tanpa jejak.

Sudah tercatat: stock opname, penyesuaian stok, inbound, outbound, material request, Dokubah, SPK internal, penawaran harga, purchase order, harga supplier, dan seluruh langkah persetujuan. Pengecualian: ubah bahan Dokubah, update penawaran, dan harga supplier hanya menyimpan nilai sesudah.

Belum tercatat: tambah, ubah, dan hapus barang, pengaturan lokasi barang, kategori dan satuan termasuk ubah nama, lokasi, supplier, user, peran, izin, serta login, logout, refresh, dan login gagal. Import barang hanya dicatat satu baris per permintaan, dengan id barang pertama sebagai penanda dan tanpa daftar barang.

Tidak ada endpoint untuk membaca log, tidak ada izin untuk itu, dan tidak ada layar frontend. Log hanya bisa dilihat langsung di database.

## Pembagian Tugas

Urutan yang disarankan backend, dikerjakan berurutan.

| No | Pihak | Tugas | Ukuran |
|---|---|---|---|
| 1 | Backend | Catat perubahan master data barang, assign-location, kategori, satuan, lokasi, dan supplier, dengan nilai sebelum dan sesudah. Handler dijalankan dalam transaksi, lalu `record` dipanggil di dalamnya. Sekitar 10 handler dengan pola sama, tanpa migrasi, dengan tes. | Sedang |
| 2 | Backend | Tambah `GET /audit-logs` dengan izin baru `audit.view`, filter user, tabel, id, aksi, dan rentang tanggal, paginasi, urut terbaru. Index pada `(table_name, record_id)` dan `created_at` ditambahkan kalau log sudah besar. | Sedang |
| 3 | Backend | Perbaiki log import barang supaya memuat daftar id barang yang dibuat, bukan id pertama saja. | Kecil |
| 4 | Frontend | Layar "Log Aktivitas" untuk superadmin: tabel waktu, pengguna, aksi, tabel, dan id, dengan filter, paginasi, dan tampilan perbandingan nilai sebelum dan sesudah. Menu baru, fungsi API, dan tes. Dikerjakan setelah tugas 2 selesai. | Sedang |
| 5 | Backend | Catat user, peran, izin, dan login. Field dipilih eksplisit supaya hash password dan token tidak ikut. Login gagal butuh jenis aksi baru. | Besar, butuh keputusan produk |
| 6 | Backend | Simpan IP dan user agent: dua kolom baru lewat migrasi dan konteks request yang disalurkan ke setiap pemanggil `record`. | Besar, belakangan |

## Hal yang Perlu Diperhatikan

Handler barang, lokasi, dan supplier saat ini memakai koneksi database langsung, jadi perlu varian yang menerima transaksi. Risikonya ada di tes yang sudah ada, bukan di logikanya.

Izin `audit.view` hanya dibuat saat seed bersih. Untuk database yang sudah berjalan, baris izin dan hubungan ke peran harus ditambahkan manual, sama seperti izin `item.set-supplier`.

Catatan keputusan produk yang masih terbuka: apakah login dan perubahan akun perlu dicatat, dan siapa yang boleh membaca log selain superadmin.

## Kontrak Rencana GET /audit-logs

Kontrak ini hasil rencana backend dan belum ada kodenya. Dokumen backend yang setara adalah `docs/44-Rencana-Audit-Log.md` di repo backend.

Izin yang dipakai adalah `audit.view`, dan superadmin melewati pengecekan izin. Parameternya `page`, `pageSize` (maksimal 100), `userId`, `tableName`, `recordId`, `action` (CREATE, UPDATE, atau DELETE), `startDate` dan `endDate` (format YYYY-MM-DD, keduanya inklusif), serta `sortDir` yang bawaannya `desc` sehingga yang terbaru tampil dulu. Parameter kosong dianggap tidak dikirim, dan nilai yang tidak valid menghasilkan 400.

Respons berbentuk `data { rows, total, page, pageSize }`. Tiap baris memuat `id`, `userId`, `username` (kosong bila pelaku tidak ada), `action`, `tableName`, `recordId`, `oldValues`, `newValues` (kosong bila tidak disimpan), dan `createdAt`. Layar Log Aktivitas di frontend bisa dibangun langsung dari bentuk ini setelah tugas 2 selesai.
