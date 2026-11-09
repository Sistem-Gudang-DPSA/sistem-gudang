# Sistem Gudang — Alur Approval Dokubah

## Ringkasan

Dokubah sekarang punya alur persetujuan lengkap di layar View Dokubah.
Sebelumnya FE hanya bisa membuat Dokubah sebagai Draft atau langsung
Pending, tanpa tombol untuk mengirim, menyetujui, atau menolaknya.
Keputusan ini diambil bersama user backend, dan Dokubah tetap berada di luar
mesin `/approvals`.

## Keputusan

- Tombol approve dan reject ada di halaman Dokubah, bukan di inbox approval.
  Memasukkan Dokubah ke inbox bersama permintaan pembelian menunggu mesin
  approval umum, yang sengaja ditunda.
- Penolakan wajib punya catatan alasan, maksimal 500 karakter.
- Dokubah yang ditolak boleh diperbaiki dan dikirim ulang.
- Riwayat aksi disimpan beserta pelaku dan waktunya.
- Notifikasi ke pembuat belum dibuat.

## Alur

PPIC membuat Dokubah sebagai Draft, atau langsung merilisnya sebagai
Pending. Dokubah Draft atau Rejected dikirim lewat tombol Kirim untuk
Approval, dan butuh minimal satu bahan. Koor Inventory memutuskan saat status
Pending: Setuju mengubahnya menjadi Approved, dan Tolak meminta alasan lalu
mengubahnya menjadi Rejected. Material hanya bisa diubah selama statusnya
bukan Approved.

| Aksi | Permission | Dari status | Hasil |
|---|---|---|---|
| Kirim untuk Approval | `dokubah.update` | Draft atau Rejected | Pending |
| Setuju | `dokubah.approve` | Pending | Approved |
| Tolak, dengan alasan | `dokubah.approve` | Pending | Rejected |
| Edit material | `dokubah.update` | Draft, Pending, atau Rejected | tidak berubah |

## Yang Dikerjakan di FE

- `rejectDokubah` mengirim `{ note }`, dan `submitDokubah`, `approveDokubah`,
  dan `rejectDokubah` mengembalikan Dokubah lengkap dengan riwayat.
- View Dokubah menampilkan tombol sesuai status dan permission, kolom alasan
  penolakan dengan validasi, tabel Riwayat Persetujuan, dan catatan alasan
  terakhir untuk Dokubah yang ditolak. Pesan error dari backend ditampilkan
  dan tombol dinonaktifkan saat permintaan berjalan.
- Daftar Dokubah tidak memuat riwayat, karena endpoint daftar memang tidak
  mengembalikannya.

## Hasil Uji

Diuji lewat API dengan akun `staf_ppic` dan `1inventory`. Dokubah dibuat
sebagai Draft, dikirim, ditolak tanpa alasan dan ditolak dengan HTTP 400,
disetujui oleh PPIC dan ditolak dengan HTTP 403, ditolak dengan alasan,
diedit, dikirim ulang, lalu disetujui. Riwayat mencatat empat aksi berurutan
beserta pelaku dan alasan penolakan, dan edit setelah Approved ditolak dengan
HTTP 409. Layar di browser belum diuji.

## Yang Belum Ada

- Notifikasi ke pembuat saat Dokubah disetujui atau ditolak.
- Dokubah lama yang dibuat sebelum perubahan ini punya riwayat kosong.
- Mesin approval umum untuk memasukkan Dokubah ke inbox bersama.
