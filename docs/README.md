# Dokumentasi Sistem Gudang

Satu dokumen membahas satu pekerjaan atau satu keputusan besar. Lihat
`00-Template-Docs.md` sebelum menambah dokumen baru.

| Dokumen | Ringkasan |
|---|---|
| [00-Architecture-in-BE.md](00-Architecture-in-BE.md) | Fondasi backend: struktur project, koneksi database, error handling terpusat, dan arsitektur domain layered modular monolith. |
| [01-Integrasi-Auth.md](01-Integrasi-Auth.md) | Login, refresh, dan logout frontend disambungkan ke backend, menggantikan akun palsu di localStorage. |
| [02-Integrasi-Inventory-Item-Lokasi.md](02-Integrasi-Inventory-Item-Lokasi.md) | Data Barang dan Data Lokasi di Gudang, PPIC, dan Purchasing disambungkan ke endpoint Item dan Location. |
| [03-Integrasi-Data-Supplier.md](03-Integrasi-Data-Supplier.md) | Data Supplier di Purchasing disambungkan ke endpoint Supplier, termasuk tombol Edit dan Hapus yang sebelumnya tidak berfungsi. |
| [04-Rencana-Selanjutnya.md](04-Rencana-Selanjutnya.md) | Status pekerjaan dan urutan yang belum digarap: uji manual, alur approval, keputusan PPIC dan Gudang, serta penawaran harga. |
| [05-Struktur-Routing-dan-Domain.md](05-Struktur-Routing-dan-Domain.md) | Konvensi pemisahan routing di `src/app` dan logic fitur di `src/domains`, serta perbaikan folder `app/` root lama di branch `dev`. |
| [06-Integrasi-Modul-Gudang.md](06-Integrasi-Modul-Gudang.md) | Transaksi dan laporan divisi Gudang disambungkan ke backend: barang masuk/keluar, stock opname, permintaan pembelian, rekap, dan export xlsx. |
| [07-Integrasi-PPIC-Dokubah-dan-SPK-Internal.md](07-Integrasi-PPIC-Dokubah-dan-SPK-Internal.md) | Layar PPIC buatan imel disambungkan ke backend: Dokubah, SPK Internal, rekap mutasi, stok opname, dan pilihan dari tracking. |
| [08-Tampilan-Gudang-dan-Detail-Rekap-Permintaan.md](08-Tampilan-Gudang-dan-Detail-Rekap-Permintaan.md) | Tampilan Gudang diselaraskan dengan Cal, dan Detail Rekap Permintaan membaca sisa kuota serta tanggal dari Dokubah. |
| [09-Permintaan-Pembelian-PPIC-dan-Rekap-Pembelian.md](09-Permintaan-Pembelian-PPIC-dan-Rekap-Pembelian.md) | Permintaan Pembelian pindah dari Gudang ke PPIC karena permission, dan Rekap Pembelian PPIC serta Purchasing disambungkan ke backend. |
| [10-Perapian-Lint-dan-Paginasi.md](10-Perapian-Lint-dan-Paginasi.md) | Error lint dibersihkan dan daftar utama memakai komponen paginasi sungguhan dari server, dengan daftar yang belum dipaginasi dicatat. |
| [11-Batasan-Input-Form.md](11-Batasan-Input-Form.md) | Input angka hanya menerima digit dan input teks dibatasi panjangnya sesuai kontrak backend di semua form utama. |
| [12-Pemesanan-Pembelian-dan-Histori-Harga-Supplier.md](12-Pemesanan-Pembelian-dan-Histori-Harga-Supplier.md) | Buat PO dan grid harga bulanan supplier disambungkan ke backend, dengan rumus pajak Imel dan nomor PO dari backend. |
