# Dokumentasi Sistem Gudang

Satu dokumen membahas satu pekerjaan atau satu keputusan besar. Lihat
`00-Template-Docs.md` sebelum menambah dokumen baru.

| Dokumen | Ringkasan |
|---|---|
| [00-Architecture-in-BE.md](00-Architecture-in-BE.md) | Fondasi backend: struktur project, koneksi database, error handling terpusat, dan arsitektur domain layered modular monolith. |
| [01-Integrasi-Auth.md](01-Integrasi-Auth.md) | Login, refresh, dan logout frontend disambungkan ke backend, menggantikan akun palsu di localStorage. |
| [02-Integrasi-Inventory-Item-Lokasi.md](02-Integrasi-Inventory-Item-Lokasi.md) | Data Barang dan Data Lokasi di Gudang, PPIC, dan Purchasing disambungkan ke endpoint Item dan Location. |
| [03-Integrasi-Data-Supplier.md](03-Integrasi-Data-Supplier.md) | Data Supplier di Purchasing disambungkan ke endpoint Supplier, termasuk tombol Edit dan Hapus yang sebelumnya tidak berfungsi. |
| [04-Rencana-Selanjutnya.md](04-Rencana-Selanjutnya.md) | Status pekerjaan data barang dan urutan modul yang belum digarap: approval, transaksi gudang, dokubah, laporan, penawaran harga. |
