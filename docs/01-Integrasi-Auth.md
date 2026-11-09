# Sistem Gudang — Integrasi Auth

## Ringkasan

Halaman login dan guard dashboard yang sebelumnya memakai localStorage palsu
sekarang tersambung ke backend sungguhan lewat `POST /api/v1/auth/login`,
`POST /api/v1/auth/refresh`, dan `POST /api/v1/auth/logout`. Cakupan
pekerjaan ini hanya tiga endpoint tersebut, sesuai `docs/api-1.json`.
Endpoint role dan permission superadmin belum disentuh.

## Latar Belakang

Sebelumnya sistem login memvalidasi username dan password terhadap array
`app_users` yang disimpan mentah di localStorage, termasuk passwordnya
dalam bentuk plain text. Backend sudah punya modul auth asli dengan access
token JWT dan refresh token httpOnly cookie, jadi seluruh alur itu diganti
supaya tidak ada lagi data akun palsu di sisi frontend.

## Keputusan

| Keputusan | Alasan |
|---|---|
| Access token disimpan di variabel modul (in-memory), bukan localStorage | Refresh token sudah aman di httpOnly cookie yang diatur backend. Menyimpan access token di localStorage menambah permukaan serangan XSS tanpa manfaat, karena token bisa dipulihkan lagi lewat `refreshSession()` setiap kali aplikasi dimuat ulang. |
| `dashboard/layout.tsx` memanggil `refreshSession()` saat mount, bukan membaca localStorage | Refresh token di cookie adalah satu-satunya sumber kebenaran soal siapa yang login. Kalau refresh gagal, user diarahkan balik ke halaman login. |
| Field login diganti dari "Username" jadi "Email" | Skema `POST /auth/login` di `docs/api-1.json` mensyaratkan `email`, bukan `username`. |
| Redirect setelah login memakai `user.roleName` dan `user.isSuperadmin` dari response backend | Sebelumnya field ini tidak ada di response API dan jadi blocker; sudah ditambahkan di revisi terbaru `docs/api-1.json`. Nama route (`/dashboard/<roleName lowercase>`) diasumsikan sama dengan nilai `roleName` yang dikirim backend. |
| Panel "Akun Demo" di halaman login dihapus | Akun sekarang berasal dari database backend, bukan seed lokal, jadi kredensial demo hardcoded sudah tidak relevan dan berpotensi menyesatkan. |

## Perubahan

### `src/domains/auth/`

File baru: `types.ts` (bentuk `AuthUser` dan `LoginResult` sesuai skema
response `docs/api-1.json`) dan `api.ts` (`login`, `refreshSession`,
`logout`, `dashboardPathFor`). Domain ini jadi satu-satunya tempat yang
tahu bentuk response auth.

### `src/shared/lib/api-client.ts`

Ditulis ulang total. Isi sebelumnya (`fetchBarangById`, `createBarang`,
dll) tidak terpakai di file manapun, jadi dihapus bersih. Sekarang berisi
`apiClient.get/post/put/delete` generik yang:

- Selalu mengirim `credentials: "include"` karena refresh token dikirim
  lewat cookie lintas origin, sesuai keputusan repo backend dan frontend
  yang terpisah di `00-Architecture-in-BE.md`.
- Membongkar envelope `{ success, message, data }` / `{ success: false,
  message, errors }` dan melempar `ApiError` kalau `success` bernilai
  `false`.
- Otomatis mencoba `POST /auth/refresh` sekali kalau request pertama
  balas 401, lalu mengulang request aslinya. Kalau refresh juga gagal,
  error asli tetap dilempar ke pemanggil.

### `src/app/page.tsx` (halaman login)

Form diganti dari username/password jadi email/password, memanggil
`login()` dari domain auth, lalu redirect ke `dashboardPathFor(user)`.
Error dari backend (`ApiError.message`) ditampilkan langsung ke user.

### `src/app/dashboard/layout.tsx`

Guard halaman diganti total. Sebelumnya baca `localStorage.getItem("userRole")`
di `useEffect`, sekarang panggil `refreshSession()`. Kalau gagal, redirect
ke `/`. Kalau sukses, `user.roleName` dan `user.isSuperadmin` menentukan
menu sidebar mana yang tampil, menggantikan variabel string `userRole`
yang dulu diisi manual.

## Bug atau Celah yang Ditemukan

Setelah revisi pertama integrasi auth ini, user melaporkan: membuka tab
baru saat sudah login membuat halaman login tetap tampil dan bisa login
lagi, dan sesi yang sedang aktif di tab lama malah jadi tidak valid.

Akar masalahnya: `src/app/page.tsx` (halaman login) tidak pernah mengecek
apakah sesi yang masih berlaku sudah ada sebelum menampilkan form. Setiap
kunjungan ke `/` langsung menampilkan form, walau refresh-token httpOnly
cookie dari sesi sebelumnya masih valid. Backend merotasi refresh token
setiap kali `POST /auth/login` dipanggil, jadi login kedua ini mencabut
token yang dipegang tab pertama.

Perbaikannya di halaman login itu sendiri: begitu komponen dimuat, panggil
`refreshSession()` lebih dulu. Kalau berhasil, langsung `router.replace()`
ke dashboard yang sesuai tanpa pernah menampilkan form. Form login hanya
dirender kalau `refreshSession()` gagal, sama seperti pola guard yang
sudah dipakai `dashboard/layout.tsx`.

Celah ini luput dari test pertama karena test yang ada saat itu cuma
menguji fungsi murni (`apiClient`, `dashboardPathFor`), bukan perilaku
komponen halaman. Sudah ditambahkan test komponen untuk menutup celah ini,
lihat bagian Pengujian.

## Pengujian

Proyek ini sebelumnya tidak punya test framework sama sekali. Vitest
ditambahkan (`vitest.config.mts`, script `bun run test` /
`bun run test:watch`) khusus untuk menguji logic yang kalau salah tidak
langsung kelihatan dari tampilan, mengikuti konvensi test co-located yang
sama dengan backend (lihat `00-Architecture-in-BE.md` bagian Pengujian).
`@testing-library/react`, `@testing-library/dom`, dan `jsdom` ditambahkan
belakangan, khusus untuk menguji perilaku komponen halaman, bukan cuma
fungsi murni.

| File test | Yang dicakup |
|---|---|
| `src/shared/lib/api-client.test.ts` | Envelope sukses mengembalikan `data`. Envelope gagal melempar `ApiError` dengan `message`, `status`, dan `errors`. Request yang balas 401 mencoba `POST /auth/refresh` sekali, lalu mengulang request asli kalau refresh berhasil. Kalau refresh juga gagal, error asli dilempar tanpa mengulang tanpa henti. |
| `src/domains/auth/api.test.ts` | `dashboardPathFor`: user dengan `isSuperadmin: true` selalu ke `/dashboard/superadmin` apapun `roleName`-nya. User lain diarahkan ke `/dashboard/<roleName lowercase>`. |
| `src/app/page.test.tsx` | Reproduksi bug di atas: kalau `refreshSession()` berhasil saat halaman login dimuat, form login tidak pernah muncul dan user langsung diarahkan ke dashboard. Kalau `refreshSession()` gagal, form tampil normal dan tidak ada redirect. |

Jalankan dengan `bun run test`. Halaman lain (dashboard layout, form-form
domain) masih belum punya test karena isinya sebagian besar wiring form
ke API tanpa branching logic sendiri; kalau nanti ada logic tambahan di
sana, tambahkan test baru di file `*.test.tsx` bersebelahan dengan
komponennya, mengikuti pola `page.test.tsx` di atas.

## Status dan Langkah Berikutnya

Login, refresh, dan logout sudah tersambung, lolos build, type-check, dan
test otomatis di atas. Belum diuji end-to-end melawan backend sungguhan
karena backend belum jalan saat pekerjaan ini dilakukan, hanya dev server
FE saja yang dijalankan untuk memastikan tidak ada error render.

**Update:** `GET /superadmin/roles` sudah ditambahkan backend. Form
"Tambah User" di Superadmin yang sebelumnya disembunyikan sekarang aktif
kembali, lihat `src/domains/superadmin/api.ts` dan
`src/domains/superadmin/components/Users.tsx`.

**Update kedua:** `GET /superadmin/users`, `PUT /superadmin/users/{id}`,
dan `DELETE /superadmin/users/{id}` juga sudah ditambahkan. Halaman
Kelola Data User sekarang menampilkan user asli dari database (bukan
lagi cuma yang dibuat di sesi browser), dengan tombol Edit dan Hapus
yang berfungsi.

Belum dikerjakan, masih menunggu backend:

- Asumsi bahwa `roleName` persis sama dengan segmen URL dashboard
  (`gudang`, `ppic`, `purchasing`) belum diverifikasi ke backend. Kalau
  penamaan role di database berbeda kapitalisasi atau kata, redirect di
  `dashboardPathFor` perlu disesuaikan.
