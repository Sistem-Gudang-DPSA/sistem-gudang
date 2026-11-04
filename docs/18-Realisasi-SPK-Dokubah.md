# Realisasi SPK: Barang Keluar Sekarang, Dokubah Nanti

Issue: #38

## Ringkasan

Halaman Realisasi SPK (`/dashboard/gudang/laporan/realisasi-spk`) menghitung
realisasi dari **barang keluar** (`GET /outbound/usage`). Versi berbasis
**dokubah** sudah ditulis, tetapi ditunda karena modul PPIC belum dipakai.

## Latar Belakang

Commit `2a26f4e` (branch `cal/updateRabu4Nov`, masuk lewat PR #36) mengganti
sumber data ke dokubah berstatus `APPROVED`: anggaran (`totalAnggaran`) vs
realisasi (`totalRealisasiNilai`) per SPK, ringkasan global, dan halaman detail
per SPK. Database dev belum punya dokubah sama sekali, sehingga halaman kosong.

Karena PPIC belum mulai mengisi dokubah, sumber data dikembalikan ke barang
keluar. Halaman detail per SPK (`realisasi-spk/[id]`,
`DetailRealisasiSPK.tsx`) dihapus dari kode dan tetap ada di riwayat git.

## Yang Tetap dari PR #36

- `fetchAllPages` dengan batas 4 request bersamaan, dipakai juga oleh halaman
  ini untuk memuat seluruh barang.
- Perubahan Calvin di luar Realisasi SPK: Detail Kartu Stok, Laporan Barang
  Keluar, dan export Excel.

## Cara Mengaktifkan Versi Dokubah

Lakukan setelah PPIC rutin membuat dan menyetujui dokubah.

1. Ambil berkas dari commit `2a26f4e`:
   `git show 2a26f4e:<path>` untuk
   `src/domains/inventory/components/DashboardRealisasiSpk.tsx`,
   `RealisasiSPK.tsx`, `DetailRealisasiSPK.tsx`,
   `src/shared/components/ExportRealisasi.tsx`, dan
   `src/app/dashboard/gudang/laporan/realisasi-spk/[id]/page.tsx`.
2. Terapkan lagi perbaikan dari PR #36: `page.tsx` hanya re-export, tanpa
   `setState` di `useEffect` (pakai `key={id}`), dan test untuk logika dokubah.
3. Putuskan apakah barang keluar tetap ditampilkan berdampingan dengan dokubah.
4. Hapus komentar `TODO(realisasi-dokubah)` di `DashboardRealisasiSpk.tsx`.
