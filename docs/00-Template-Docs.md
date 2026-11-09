# Template Dokumentasi

Salin file ini untuk memulai dokumen baru di folder `docs/`. Satu dokumen
membahas satu pekerjaan atau satu keputusan besar. Kalau pekerjaan
berikutnya adalah topik baru, buat file baru dengan nomor urut berikutnya.
Jangan menumpuk beberapa topik berbeda dalam satu file.

## Aturan Penamaan File

`NN-Judul-Singkat.md`, nomor dua digit berurutan, judul pakai kapital di
tiap kata dan tanda hubung sebagai spasi. Contoh: `05-Modul-Inventory.md`.

Setelah file baru dibuat, tambahkan satu baris ke tabel di
`docs/README.md` berisi link ke file itu dan ringkasan 15 sampai 20 kata.
Ini yang menjaga folder `docs/` tetap gampang dijelajahi begitu jumlah
dokumen bertambah banyak.

## Gaya Penulisan

Tulis kalimat lengkap yang bisa dipahami sekali baca. Hindari dua pola ini:

- **Tanda kurung untuk menambahkan penjelasan.** Kalau penjelasan itu
  penting, satukan ke kalimat utama. Kalau tidak penting, hapus.
- **Tanda hubung panjang (—) sebagai pengganti kata sambung.** Ganti
  dengan kata yang menyatakan hubungan sebenarnya: karena, sehingga, yang
  berarti, misalnya, yaitu. Pembaca tidak perlu menerka apa maksud tanda
  hubung itu.

Contoh sebelum dan sesudah:

> Sebelum: CORS diubah jadi daftar origin (dipisah koma) supaya siap kalau
> nanti ada FE + admin panel di domain berbeda — `cors()` sudah terima
> array secara native.
>
> Sesudah: CORS diubah menjadi daftar origin yang dipisah koma, supaya
> siap kalau nanti ada frontend dan admin panel di domain berbeda. Package
> `cors()` sudah menerima array secara native, jadi tidak perlu perubahan
> tambahan.

Prioritaskan narasi yang bisa langsung dipahami maksudnya tanpa pembaca
perlu menafsirkan ulang. Tabel dan code block tetap boleh dipakai untuk
data yang memang berbentuk tabular atau kode, itu bukan sasaran aturan di
atas.

## Struktur Standar

Pakai heading level 2 (`##`) berikut sesuai kebutuhan dokumen. Boleh
lewati bagian yang tidak relevan, jangan dipaksakan ada isinya.

### Judul dan Ringkasan

```markdown
# <Nama Proyek> — <Judul Dokumen>

## Ringkasan
Dua sampai empat kalimat: apa yang dikerjakan, kenapa, dan cakupannya.
Pembaca yang cuma baca bagian ini harus tahu inti dokumennya.
```

### Latar Belakang

Masalah atau kebutuhan yang mendorong pekerjaan ini. Lewati bagian ini
kalau pekerjaannya rutin dan tidak butuh konteks tambahan.

### Keputusan

Keputusan desain penting beserta alasannya. Pakai tabel kalau lebih dari
tiga poin, pakai daftar kalau sedikit. Setiap baris harus jelas
keputusannya apa dan kenapa dipilih, bukan cuma "opsi A dipilih".

### Perubahan

Detail teknis, dipecah pakai heading level 3 (`###`) per komponen, file,
atau modul yang berubah. Ini bagian paling teknis dan biasanya paling
panjang. Sebutkan file yang terlibat di awal tiap subbagian.

### Bug atau Celah yang Ditemukan

Kalau ada bug yang ditemukan dan diperbaiki selama pekerjaan ini, catat di
sini: apa gejalanya, apa akar masalahnya, dan bagaimana perbaikannya.
Ini sering jadi bagian paling berharga buat pembaca di masa depan yang
menemukan gejala serupa.

### Pengujian

Cakupan test yang ditambahkan atau diubah, dan hasil akhirnya. Tabel
berisi nama file test dan apa yang dicakupnya biasanya paling mudah
dibaca.

### Status dan Langkah Berikutnya

Apa yang sudah selesai, apa yang belum, dan urutan prioritas berikutnya.
Kalau dokumen berikutnya akan melanjutkan sebagian poin ini, sebutkan
nama file dokumen lanjutannya begitu file itu sudah dibuat.

## Hal yang Tidak Perlu Diulang

Kalau suatu fakta sudah didokumentasikan lengkap di dokumen lain, jangan
tulis ulang isinya. Cukup rujuk nama filenya dan bagiannya, misalnya
"detail skema database ada di `04-RBAC-Redesign.md` bagian Skema
Database". Dokumentasi yang berulang di banyak file gampang jadi usang
di satu tempat tapi tidak di tempat lain.
