import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { NAV_DIVISIONS } from "@/domains/auth/nav";

const SRC = join(process.cwd(), "src");
const DASH = join(SRC, "app/dashboard");
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const pages = walk(DASH).filter((f) => f.endsWith(`${sep}page.tsx`));
const routeOf = (f: string) => "/dashboard" + relative(DASH, f).split(sep).slice(0, -1).map((s) => "/" + s).join("");
const routes = pages.map(routeOf);
const reexportPages = pages.filter((f) => routeOf(f) !== "/dashboard"); // /dashboard overview is an inline component
const toRegex = (route: string) => new RegExp("^" + route.replace(/\[[^\]]+\]/g, "[^/]+") + "$");
const exists = (href: string) => routes.some((r) => toRegex(r).test(href));

const nonTest = walk(SRC).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.includes(`${sep}test${sep}`));
const sources = nonTest.map((f) => ({ f, src: readFileSync(f, "utf8") }));

describe("dashboard pages", () => {
  it.each(reexportPages.map((f) => [routeOf(f), f]))("%s re-exports an existing module", (_r, f) => {
    const m = readFileSync(f, "utf8").match(/export\s*\{\s*default\s*\}\s*from\s*["']@\/([^"']+)["']/);
    expect(m, "page must be `export { default } from \"@/...\"`").not.toBeNull();
    const base = join(SRC, m![1]);
    expect(["", ".tsx", ".ts", "/index.tsx", "/index.ts"].some((e) => existsSync(base + e) && statSync(base + e).isFile())).toBe(true);
  });

  const hrefs = NAV_DIVISIONS.flatMap((d) => d.groups.flatMap((g) => g.items.map((i) => i.href)));
  it.each(hrefs)("nav href %s has a page", (h) => expect(exists(h)).toBe(true));
});

// Routes reached by a link built from a path constant + suffix (so the full literal never appears).
// Reachability heuristic: a route is linked if its full literal appears, or its last static segment
// appears as "/segment" inside some source file (composed links like `${dokubah_path}/view-dokubah/${id}`).
const navSet = new Set(hrefs());
function hrefs() {
  return NAV_DIVISIONS.flatMap((d) => d.groups.flatMap((g) => g.items.map((i) => i.href)));
}
const literals = sources.flatMap(({ src }) => [...src.matchAll(/["'`](\/dashboard[^"'`]*)["'`]/g)].map((m) => m[1].replace(/\$\{[^}]*\}/g, "x")));
const linked = (route: string, self: string) => {
  if (navSet.has(route)) return true;
  if (route === "/dashboard") return true;
  if (literals.some((l) => l.replace(/\?.*/, "") === route || toRegex(route).test(l.replace(/\?.*/, "")))) return true;
  const seg = route.split("/").filter((s) => !s.startsWith("[")).pop()!;
  return sources.some(({ f, src }) => f !== self && !f.includes(`${sep}app${sep}`) && src.includes(`/${seg}`));
};

// Division landing pages are reached via the dashboard cards / dashboardPathFor, not nav items.
const ALLOW = new Set(["/dashboard/gudang", "/dashboard/ppic", "/dashboard/purchasing", "/dashboard/superadmin", "/dashboard/superadmin/users"]);
// Known unlinked leftovers.
const KNOWN_ORPHANS = [
  "/dashboard/ppic/master/penawaran-harga/detail-permintaan",
  "/dashboard/gudang/laporan/rekap-permintaan/detail-rekap-permintaan",
];

describe("orphan routes", () => {
  const orphans = routes.filter((r) => !ALLOW.has(r) && !linked(r, join(DASH, r.replace("/dashboard", ""), "page.tsx")));
  it("only known orphans exist", () => {
    console.info("Orphan routes:", orphans);
    expect(orphans.filter((r) => !KNOWN_ORPHANS.includes(r))).toEqual([]);
  });
  it.fails("BUG: detail-permintaan page is unlinked leftover", () => {
    expect(orphans).not.toContain(KNOWN_ORPHANS[0]);
  });
  it.fails("BUG: detail-rekap-permintaan page is unlinked", () => {
    expect(orphans).not.toContain(KNOWN_ORPHANS[1]);
  });
});
