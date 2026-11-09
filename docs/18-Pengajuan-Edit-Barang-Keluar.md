# Pengajuan Edit Barang Keluar

## Ringkasan

Barang keluar harus diajukan ke superadmin sebelum dapat diedit. Tombol **Ajukan Edit** ada di baris transaksi, termasuk transaksi berisi banyak barang, sejak pencatatan sampai sebelum `createdAt + 24 jam`. Batas dihitung dari waktu pencatatan, bukan tanggal transaksi yang diinput. Tombol hilang otomatis saat batas habis.

## Alur

1. Admin gudang dengan izin `outbound.update` menekan **Ajukan Edit**. Satu transaksi hanya dapat memiliki satu pengajuan.
2. Status menjadi **Menunggu persetujuan**. Superadmin membuka **Super Admin > Transaksi > Pengajuan Edit Barang Keluar** untuk menyetujui atau menolak.
3. Setelah disetujui, admin pengaju mendapatkan tombol **Edit**. Persetujuan masih dapat dipakai jika peninjauan melewati 24 jam, karena batas 24 jam berlaku saat pengajuan.
4. Form memuat semua barang dalam transaksi agar seluruh koreksi dapat disimpan sekaligus. Satu penyimpanan berhasil menghabiskan izin edit untuk seluruh transaksi.
5. Tombol Edit dan Ajukan Edit hilang setelah penyimpanan berhasil. **Riwayat Edit** menampilkan pengaju, peninjau, waktu dan nilai sebelum/sesudah perubahan.

Pengajuan yang ditolak tidak membuka form edit atau pengajuan baru. Gagal menyimpan, misalnya karena stok tidak cukup, tidak menghabiskan izin edit. Admin lain tidak dapat memakai persetujuan milik pengaju. Tampilan gudang memuat ulang status setiap 15 detik selama menunggu dan saat tab kembali aktif. Halaman superadmin juga memperbarui daftar setiap 15 detik.

## Riwayat di superadmin

Menu **Super Admin > Laporan > Riwayat Edit Barang Keluar** memuat transaksi yang editnya sudah berhasil disimpan (`USED`), diurutkan berdasarkan waktu edit terbaru. Tabel menampilkan nomor transaksi, client/SPK, produk/proyek, admin gudang yang mengedit dan waktu edit dalam WIB. Halaman pengajuan dan halaman riwayat memiliki tautan satu sama lain.

Tombol **Lihat Perubahan** membuka rincian pengaju, superadmin yang meninjau dan waktu setiap aksi, serta tabel **Data / Sebelum / Sesudah**. Tabel rincian hanya menampilkan nilai yang berubah: tanggal, client, SPK, nama item/projek, tujuan/penerima, catatan, penggantian material, jumlah dan pengambil. Penambahan/penghapusan material juga terlihat. Material dicocokkan berdasarkan ID agar urutan baris yang berubah tidak menimbulkan riwayat palsu. Lokasi master barang saat ini tidak dianggap sebagai koreksi transaksi oleh gudang.

Persetujuan yang belum dipakai tetap berada di halaman pengajuan. Penyimpanan tanpa perubahan nilai ditampilkan dengan keterangan tersendiri; riwayat yang tidak memiliki snapshot juga diberi keterangan. Fitur riwayat memakai tabel dan endpoint yang sudah ada sehingga tidak memerlukan migrasi tambahan. Pembaca snapshot di API menangani objek JSON MySQL maupun teks JSON MariaDB, sehingga riwayat existing dapat langsung dibandingkan tanpa mengubah data tersimpan.

## Backend

Implementasi API berada di proyek pendamping `../sistem-gudang-api`. Status, peninjauan dan snapshot disimpan di tabel `outbound_edit_requests`. Unique key `outbound_id` serta penguncian header transaksi melindungi pengajuan dan konsumsi persetujuan dari permintaan bersamaan. Perubahan stok, snapshot, audit log dan status `USED` ditulis dalam transaksi database yang sama.

| Method | Endpoint | Akses |
|---|---|---|
| POST | `/api/v1/outbound/:id/edit-request` | `outbound.update`, sebelum 24 jam |
| GET | `/api/v1/outbound/edit-requests` | Superadmin |
| POST | `/api/v1/outbound/:id/edit-request/approve` | Superadmin |
| POST | `/api/v1/outbound/:id/edit-request/reject` | Superadmin |
| PUT | `/api/v1/outbound/:id` | `outbound.update`, pengaju dengan status `APPROVED` |
| GET | `/api/v1/outbound/:id/edit-history` | `outbound.view` |

`GET /outbound` dan detail transaksi mengembalikan `editRequest`, bernilai `null` sebelum diajukan. Snapshot hanya dikirim dari endpoint riwayat agar daftar tetap ringan. Transaksi lama tidak mendapat persetujuan otomatis.

## Migrasi dan verifikasi

Migrasi baru: `../sistem-gudang-api/src/db/migrations/0037_outbound_edit_requests.sql`. Deploy tabel bersama API sebelum frontend baru. Pada database development lokal, tabel ini sudah dibuat dengan menjalankan SQL `0037` secara terpisah. SQL memakai satu `CREATE TABLE IF NOT EXISTS` yang mencakup seluruh foreign key dan index sehingga aman jika dijalankan kembali oleh migrator. Riwayat migrasi tidak dimajukan atau ditandai selesai secara palsu. Migrasi lama `0035` dan `0036` masih tertunda dan masing-masing menghapus tabel `barang` dan kolom `dokubah_materials.realisasi`; tinjau keduanya sebelum menjalankan rangkaian migrasi penuh.

Jika tabel belum dibuat, daftar dan proses simpan barang keluar akan gagal dengan query ke `outbound_edit_requests`. Setelah tabel tersedia, percobaan simpan yang gagal dapat diulang; pembuatan transaksi, perubahan stok dan pencatatan idempotensi berada dalam transaksi database yang sama sehingga kegagalan tersebut tidak menyimpan transaksi sebagian. Verifikasi lokal mencakup pembacaan daftar, pembuatan dan pembacaan kembali transaksi, status pengajuan `PENDING → APPROVED → USED` dan pengulangan SQL. Seluruh data simulasi dibatalkan dengan rollback; jumlah transaksi existing tetap sama.

Tes frontend mencakup batas waktu tepat 24 jam, pengajuan, persetujuan saat tab kembali aktif, edit beberapa barang sekaligus, akses pengaju dan riwayat. Tes layanan API tanpa MySQL dijalankan dengan `npm test -- --config vitest.unit.config.ts` dari proyek API. Tes integrasi HTTP juga diperbarui untuk alur baru; akun database lokal saat ini tidak berizin membuat database pengujian terpisah sehingga tes tersebut belum dapat dijalankan.
