# sistem-gudang

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4. Package manager: bun (`bun.lock`), npm lockfile also present.

## Structure

- `src/app` — routes (App Router). Dashboard sub-routes per domain: `ppic`, `purchasing`, `superadmin`, `gudang`.
- `src/domains` — feature modules (`ppic`, `inventory`, `purchasing`, `superadmin`, `auth`), each with its own `components`. `inventory` holds the Gudang (warehouse) division screens and the item, location and stock transaction API shared with the other divisions, because the backend calls that domain Inventory. The route and menu name stay `gudang` (`src/app/dashboard/gudang`).
- `src/shared/lib` — shared utilities.

## Commands

- `npm run dev` — dev server
- `npm run build` / `npm run start` — production build/serve
- `npm run lint` — ESLint
- `npm run test` / `npm run test:watch` — Vitest (jsdom + Testing Library)

## Conventions

- Keep new code inside the relevant `src/domains/<domain>` module; put route-only glue in `src/app`.
- No custom framework deviations — standard Next.js App Router behavior applies.

## Rules (wajib sebelum push/PR ke `dev`)

- `src/app/**/page.tsx` hanya boleh re-export: `export { default } from "@/domains/<domain>/components/<Komponen>";`. Logika (termasuk `redirect`, fetch, JSX) taruh di komponen dalam `src/domains`. Dijaga oleh `src/test/integration/routes.test.ts`.
- Jalankan `bun run lint` dan `bun run test` sebelum push. Lint harus 0 error; test harus lulus. Laporkan hasil sebenarnya, jangan klaim lulus tanpa menjalankan.
- Perubahan baru wajib diverifikasi, bukan hanya "seharusnya jalan". Tambah/ubah test bila perilaku berubah.
- Jangan menghapus atau melemahkan test agar lulus. Test gagal = perbaiki kode, atau tanyakan dulu.
- Jangan commit/push sebelum diminta user. Jangan push ke `dev` langsung; pakai branch + PR.
- Jangan mengerjakan di luar permintaan (scope creep). Perubahan tak terkait dipisah ke PR lain.
- Agent wajib membaca aturan di file ini dan menaatinya; hasil agent tetap harus ditinjau manusia sebelum merge.
