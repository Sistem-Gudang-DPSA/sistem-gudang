# Sistem Gudang — Catatan Refactoring

## Ringkasan

Kesimpulannya: refactoring tidak mendesak, tetapi ada beberapa perapian
terarah yang layak dikerjakan. Kode saat ini bekerja, lint dan `tsc` bersih,
tidak ada tipe `any`, dan 811 test menjadi jaring pengaman. Masalah yang ada
bukan kerusakan, melainkan pengulangan dan kebiasaan yang bila dibiarkan akan
membuat setiap fitur baru lebih mahal. Angka di bawah diukur pada 2 Oktober
2026, dengan 13.588 baris kode sumber dan 6.709 baris test.

## Temuan, Berurut Menurut Nilai

### 1. Cetak PDF dan escape HTML ditulis berulang

Sembilan berkas membuka jendela cetak lewat `window.open` dan
`document.write`, dan fungsi `escapeHtml` didefinisikan di tujuh tempat.
Ini bagian yang paling layak dipusatkan karena menyangkut keamanan: satu
salinan yang lupa meng-escape membuka celah XSS lewat nama client atau nama
bahan. Usulan: satu helper di `src/shared/lib/print.ts` yang menerima judul,
kolom, dan baris, dan meng-escape semuanya.

### 2. Domain saling bergantung

Impor antardomain tidak searah. Purchasing memakai PPIC 10 kali, PPIC memakai
Inventory 7 kali, Inventory memakai PPIC 5 kali dan Purchasing 4 kali, dan
PPIC memakai Purchasing 2 kali. Penyebab utamanya tiga hal. Pertama,
`formatAngka`, `formatRupiah`, dan `formatTanggal` hidup di
`ppic/data/dokubah.ts`, padahal enam berkas di domain lain memakainya.
Kedua, API dan tipe approval hidup di PPIC, padahal Purchasing juga
memakainya. Ketiga, helper tanggal ada di Inventory dan dipakai PPIC.
Usulan: pindahkan pemformat ke `src/shared/lib/format.ts`, dan buat modul
`approval` sendiri, yang sekaligus menjadi tempat alur approval umum nanti.

### 3. Layar yang hampir kembar

Data Barang ada tiga versi, yaitu 422, 407, dan 304 baris, dan Rekap Dokubah
ada dua versi, yaitu 352 dan 314 baris. Bedanya terutama aksi per role,
sedangkan tabel, filter, dan paginasinya sama. Usulan: ekstrak tabel dan
filter bersama, dan biarkan aksi per divisi sebagai bagian yang berbeda.
Jangan menyatukan semuanya menjadi satu komponen dengan banyak penanda,
karena itu lebih sulit dibaca daripada dua salinan.

### 4. Pola yang diulang tanpa hook atau komponen

- Pola `filterKey` dan `pageState` untuk mengatur ulang halaman saat filter
  berubah muncul di 17 berkas. Usulan: satu hook `usePagedQuery`.
- Modal ditulis langsung di 17 berkas, dan `window.confirm` atau `alert`
  dipakai 11 kali. Usulan: satu komponen `Modal` dan satu dialog konfirmasi,
  yang juga memperbaiki aksesibilitas dan memudahkan test.
- Konstanta kelas yang sama ditulis ulang, yaitu `orangeButtonClass` 9 kali
  dan `cellClass` 16 kali, dan warna oranye `#FF8A00` ada di 29 berkas.
  Usulan: token warna di tema Tailwind dan beberapa komponen kecil bersama,
  seperti `Button`, `Field`, dan `Table`.
- Komponen besar bisa dipecah. Yang terbesar adalah `BarangMasuk` 558 baris,
  `PemesananPembelian` 463, `LaporanBarangMasuk` 456, dan `BarangKeluar` 456.
  Pemecahan paling aman dimulai dari form dan modal di dalamnya.

### 5. Gaya kode belum seragam

Tidak ada formatter di repo. Gaya kutip impor terbagi 39 berkas memakai
tanda kutip tunggal dan 16 berkas tanda kutip ganda, dan penamaan berganti
antara bahasa Indonesia dan Inggris. Usulan: tambahkan Prettier dengan satu
konfigurasi, tetapi jalankan sekali pada satu waktu yang tenang, karena
diff-nya mengenai hampir semua berkas.

## Yang Tidak Perlu Direfaktor

- Struktur folder sudah rapi setelah `gudang` digabung ke `inventory`.
- Lapisan API kecil dan jelas, 342 baris untuk lima domain.
- Pola `useApiData`, `StatCard`, `Pagination`, dan `fake-api` untuk test
  sudah baik dan sebaiknya menjadi contoh bagi kode lain.
- Tidak ada tipe `any`, dan hanya enam komentar `ponytail:` yang menandai
  jalan pintas yang disengaja.

## Waktu yang Disarankan

Jangan sekarang. Cal dan Imel masih mengubah berkas yang sama, dan
perombakan besar akan membuat merge mereka konflik. Urutan yang disarankan
setelah branch mereka sinkron dengan `dev`:

1. Helper cetak dan `escapeHtml` bersama, karena menyangkut keamanan dan
   hampir tidak bersinggungan dengan pekerjaan lain.
2. Pindahkan pemformat dan modul approval keluar dari PPIC.
3. Hook `usePagedQuery`, komponen `Modal`, dan dialog konfirmasi.
4. Token warna dan komponen kecil bersama.
5. Ekstrak tabel Data Barang dan Rekap Dokubah.
6. Prettier, paling akhir.

Kerjakan satu langkah per branch, jalankan seluruh test sebelum merge, dan
jangan mencampur refactoring dengan fitur baru dalam satu commit.

## Hal Lain yang Perlu Dicatat

- Belum ada pengukuran cakupan test. Menambahkan `@vitest/coverage-v8`
  memberi angka nyata dan menunjukkan bagian yang masih tipis.
- Test berjalan di jsdom dengan data tiruan, jadi tidak menggantikan uji
  di browser. Satu alur utama per divisi layak punya uji end to end
  sungguhan, misalnya dengan Playwright, bila fiturnya sudah stabil.
