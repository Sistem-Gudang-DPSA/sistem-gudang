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
| [13-Penawaran-Harga-SPH.md](13-Penawaran-Harga-SPH.md) | Penawaran Harga dan Estimasi Penawaran Biaya buatan Imel disambungkan ke backend, dengan keputusan client dan projek terpisah serta Publish yang mengunci. |
| [14-Test-Menyeluruh-Dashboard-dan-Ability.md](14-Test-Menyeluruh-Dashboard-dan-Ability.md) | Test untuk seluruh bagian aplikasi, dashboard tiap divisi dengan data asli, serta sidebar dan tombol yang mengikuti permission role. |
| [15-Catatan-Refactoring.md](15-Catatan-Refactoring.md) | Hasil pengukuran kode dan daftar refactoring yang layak dikerjakan, berurut menurut nilai, beserta waktu yang disarankan. |
| [16-Alur-Approval-Dokubah.md](16-Alur-Approval-Dokubah.md) | Alur kirim, setujui, dan tolak Dokubah di layar View Dokubah dengan alasan penolakan wajib, kirim ulang, dan riwayat aksi. |
| [17-Rencana-Audit-Log.md](17-Rencana-Audit-Log.md) | Catatan kondisi audit log, apa yang belum tercatat, dan pembagian tugas backend dan frontend untuk layar Log Aktivitas, belum dikerjakan. |
| [18-Pengajuan-Edit-Barang-Keluar.md](18-Pengajuan-Edit-Barang-Keluar.md) | Pengajuan edit 24 jam, persetujuan superadmin, satu kali edit dan riwayat sebelum/sesudah, beserta migrasi API. |
| [20-Notifikasi-Stok-Minimum.md](20-Notifikasi-Stok-Minimum.md) | Batas stok minimum per barang, pengaturan di Data Barang, notifikasi bel, dan status dibaca per pengguna. |
| [22-Rencana-Multi-Supplier-dan-Harga.md](22-Rencana-Multi-Supplier-dan-Harga.md) | Rencana multi supplier dan multi harga dari permintaan sampai realisasi: PPIC sebagai gerbang, harga beku saat submit PO, penerimaan per baris PO, FIFO dari layer biaya, dan SPK yang turun sampai inbound. |

## Kontrak API

Sumber kontrak ada di `docs/api/*.json`, dipecah per area/modul mengikuti pola
`*.openapi.ts` di backend. File `docs/api-1.json` adalah hasil generate yang
dibaca langsung oleh `src/test/integration/api-contract.test.ts`, jadi jangan
diedit manual.

Setiap mengubah fragmen, regenerasi dengan:

```sh
bun run build:api-contract
```

`scripts/build-api-contract.ts` menggabungkan fragmen sesuai daftar `FRAGMENTS`
yang berurutan, lalu menulis JSON dengan urutan kunci stabil, indentasi 2 spasi,
dan newline akhir. Urutan path sengaja dipertahankan apa adanya: fragmen
`reports-ringkas.json` dan `*-lanjutan.json` memisahkan blok yang muncul di
tengah/akhir spec agar tidak terjadi reordering. Setelah regenerate, cek
`git diff docs/api-1.json` sebelum menjalankan test kontrak.
