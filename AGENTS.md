# sistem-gudang

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4. Package manager: bun (`bun.lock`), npm lockfile also present.

## Structure

- `src/app` — routes (App Router). Dashboard sub-routes per domain: `ppic`, `purchasing`, `superadmin`, `gudang`.
- `src/domains` — feature modules (`ppic`, `inventory`, `purchasing`, `superadmin`, `gudang`, `auth`), each with its own `components`.
- `src/shared/lib` — shared utilities.

## Commands

- `npm run dev` — dev server
- `npm run build` / `npm run start` — production build/serve
- `npm run lint` — ESLint
- `npm run test` / `npm run test:watch` — Vitest (jsdom + Testing Library)

## Conventions

- Keep new code inside the relevant `src/domains/<domain>` module; put route-only glue in `src/app`.
- No custom framework deviations — standard Next.js App Router behavior applies.
