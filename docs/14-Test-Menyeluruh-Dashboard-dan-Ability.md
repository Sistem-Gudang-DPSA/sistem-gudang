# Sistem Gudang — Test Menyeluruh, Dashboard, dan Ability

## Ringkasan

Dokumen ini mencatat tiga pekerjaan yang dikerjakan bersama. Pertama, test
untuk seluruh bagian aplikasi supaya bagian yang tertinggal atau terlepas
terdeteksi. Kedua, dashboard tiap divisi yang sebelumnya berisi angka
karangan kini memakai data asli. Ketiga, ability: menu sidebar dan tombol
di dalam halaman sekarang mengikuti permission role.

## Test

Jumlahnya 67 file dengan 811 test lulus. Satu test `it.fails` menandai
halaman Detail Rekap Permintaan Gudang yang belum tertaut, karena tujuan
tombol View Detail masih menunggu keputusan.

- `src/test/fake-api.ts` mengganti `fetch` global sehingga api-client,
  fungsi `api.ts`, dan `useApiData` berjalan apa adanya. Rute ditulis
  sebagai `"GET /api/v1/items"`, dan `api.calls(...)` mencatat method,
  path, query, dan body yang dikirim.
- Test integrasi di `src/test/integration` memastikan setiap panggilan API
  FE ada di kontrak `docs/api-1.json`, setiap halaman menunjuk komponen
  yang ada, setiap tautan menu punya halaman, tidak ada halaman yatim, dan
  setiap permission menu dimiliki minimal satu role seed.
- Test unit mencakup helper data, `Pagination`, `useApiData`, dan semua
  `api.ts`.
- Test layar mencakup setiap layar di Gudang, PPIC, Purchasing, dan
  Superadmin: muat data, keadaan kosong dan error, filter dan paginasi,
  payload simpan, validasi, batasan input, dan permission.
- Test `nav.test.ts` memakai daftar permission asli akun seed backend,
  sehingga perubahan seed yang merusak sidebar terlihat.

Dari proses ini ditemukan dan diperbaiki: pesan sukses dan error yang
tampil bersamaan di Estimasi Penawaran, tombol Edit material untuk Dokubah
yang sudah disetujui, tombol Simpan Draft yang tidak berfungsi, pilihan
baris di Rekap Permintaan yang bertahan saat filter berubah, error
ringkasan stok opname yang ditelan, paginasi Data Barang Gudang yang
hilang, dan pengecekan password minimal 8 karakter di Users.

## Dashboard

Halaman utama `/dashboard` menyapa pengguna dan hanya menampilkan pintasan
ke divisi dan halaman yang boleh dibuka. Dashboard Gudang, PPIC, dan
Purchasing memakai kartu `StatCard` yang masing-masing memuat datanya
sendiri, sehingga satu permintaan yang gagal tidak mengosongkan halaman.
Kartu dan tabel hanya tampil untuk user yang punya permission endpoint-nya.

- Gudang: total barang, barang masuk dan keluar hari ini, permintaan
  material menunggu, dan pergerakan terakhir. Kartu stok menipis dihapus
  karena backend tidak punya stok minimum.
- PPIC: Dokubah menunggu, SPK Internal, permintaan pembelian yang perlu
  revisi dan yang menunggu Purchasing, penawaran harga draft, dan
  permintaan pembelian terbaru.
- Purchasing: permintaan menunggu persetujuan, disetujui tetapi belum
  dibuat PO, PO bulan ini, total supplier, PO terbaru, dan permintaan yang
  perlu tindakan.

## Ability

- Sidebar: divisi Gudang tidak lagi terbuka hanya karena `report.view`,
  karena permission itu dipakai bersama oleh laporan PPIC.
- Konteks user tersedia lewat `useAuthUser` dan `useCan` di
  `src/domains/auth/user-context.tsx`. Superadmin lolos semuanya, dan
  layar tanpa konteks user juga lolos karena route guard dan API tetap
  menolak.
- Tombol aksi disembunyikan bila user tidak punya permission yang
  dibutuhkan endpoint-nya, dan form yang membutuhkan izin menampilkan pesan
  "Anda tidak punya izin". Pemetaan permission dibaca dari rute backend.
- Edit harga barang di Purchasing membutuhkan `item.update` dan
  `item.set-price` sekaligus, karena backend mensyaratkan keduanya saat
  harga berubah.

## Perubahan Lain

- Laporan memakai `summary` backend atas seluruh data, bukan jumlah dari
  100 baris pertama, dan daftar utama dipaginasi dari server. Pencarian
  Permintaan Pembelian dikirim ke backend, dan riwayat persetujuan
  menampilkan nama pelaku.
- Filter Periode di Rekap Dokubah PPIC berubah dari pilihan bulan menjadi
  dua kolom tanggal, karena pilihan bulan dibangun dari baris yang dimuat.
- Kode mati dihapus: `rekapold.tsx`, `Dokubah.tsx` milik Purchasing, dan
  halaman lama Detail Permintaan di Penawaran Harga.

## Yang Belum Ada

- Dropdown barang dan supplier masih dibatasi 100 baris.
- Lokasi di filter Rekap Mutasi masih dibangun dari 100 baris pertama,
  karena belum ada endpoint daftar lokasi untuk laporan.
- Halaman Detail Rekap Permintaan Gudang belum tertaut.
- Test belum menjalankan browser sungguhan. Pengujian di browser tetap
  dilakukan manual.
