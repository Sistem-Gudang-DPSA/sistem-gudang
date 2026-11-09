# Sistem Gudang — Perapian Lint dan Paginasi

## Ringkasan

Empat error lint dan satu warning dibersihkan, dan daftar utama sekarang
memakai paginasi sungguhan dari server. Sebelumnya footer paginasi hanya
teks dan tombol tiruan, sedangkan daftar memuat 100 baris pertama atau
hanya halaman default backend.

## Yang Dikerjakan

- Komponen `src/shared/components/Pagination.tsx` menampilkan
  "Menampilkan x sampai y dari total data", tombol Sebelumnya dan
  Selanjutnya, serta nomor halaman. Warna tombol aktif bisa diganti per
  divisi.
- Data Barang PPIC dan Purchasing, Data Supplier, dan Users memakai
  `useApiData` dengan `reload()` setelah simpan atau hapus. Pola lama,
  yaitu `setState` langsung di dalam `useEffect`, menjadi sumber empat error
  lint.
- Daftar yang dipaginasi dengan 20 baris per halaman: Data Barang PPIC dan
  Purchasing, Data Supplier, Users, Barang Masuk, Barang Keluar, Stock
  Opname, Rekap Permintaan Gudang, dan Permintaan Pembelian PPIC.
- Halaman kembali ke 1 saat pencarian atau filter berubah. Caranya dengan
  menyimpan filter bersama nomor halaman, bukan dengan `useEffect`.
- Seluruh endpoint tersebut sudah dicek menerima `page` dan `pageSize`.

## Yang Belum Dipaginasi

- Daftar yang menghitung ringkasan atau mengekspor dari baris yang dimuat
  tetap memuat 100 baris pertama: SPK Internal, Dokubah, Rekap Dokubah,
  Rekap Mutasi Barang, Rekap Stok Opname, dan laporan barang masuk dan
  keluar. Paginasi di sana mengubah angka ringkasan, jadi perlu ringkasan
  dari backend lebih dulu.
- Pencarian teks di Permintaan Pembelian PPIC dan Rekap Pembelian masih
  disaring di klien terhadap halaman yang sedang tampil, karena endpoint
  approvals belum punya pencarian.
- Dropdown yang memuat 100 barang atau supplier masih dibatasi 100.
- Dampak `globals.css` shadcn di semua halaman belum diperiksa.
