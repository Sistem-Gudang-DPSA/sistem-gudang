import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const spec = JSON.parse(readFileSync(join(ROOT, "docs/api-1.json"), "utf8")) as { paths: Record<string, Record<string, unknown>> };

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const files = walk(join(ROOT, "src")).filter((f) => /(domains\/.*\/api|shared\/lib\/[^/]*)\.ts$/.test(f) && !f.endsWith(".test.ts"));

const norm = (p: string) =>
  p.replace(/\$\{toQuery\([^)]*\)\}/g, "").replace(/\?.*$/, "").replace(/\$\{[^}]*\}/g, "{param}").replace(/\/+$/, "");
// Param names are matched loosely: every {name} becomes {param}.
const normSpec = (p: string) => p.replace(/\{[^}]*\}/g, "{param}");

const calls: { method: string; path: string; file: string }[] = [];
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/apiClient\.(get|post|put|patch|delete)(?:<[^()]*>)?\(\s*[`"'](\/api\/v1[^`"']*)[`"']/g))
    calls.push({ method: m[1], path: norm(m[2]), file: f });
  for (const m of src.matchAll(/downloadFile\(\s*[`"'](\/api\/v1[^`"']*)[`"']/g))
    calls.push({ method: "get", path: norm(m[1]), file: f });
}

const contract = new Set<string>();
for (const [p, ops] of Object.entries(spec.paths))
  for (const m of Object.keys(ops)) if (["get", "post", "put", "patch", "delete"].includes(m)) contract.add(`${m} ${normSpec(p)}`);

// Contract endpoints the FE intentionally does not call (yet).
const UNUSED_ALLOWLIST: Record<string, string> = {
  "post /api/v1/superadmin/roles": "admin only, no role UI yet",
  "put /api/v1/superadmin/roles/{param}/permissions": "admin only, no role UI yet",
  "get /api/v1/approvals/{param}/actions": "not needed yet (actions come with approval detail)",
  "get /api/v1/locations/{param}": "not needed yet",
  "put /api/v1/locations/{param}": "not needed yet (no location edit UI)",
  "get /api/v1/suppliers/{param}": "not needed yet (list row used for detail)",
  "get /api/v1/purchase-orders": "not needed yet (no PO list page)",
  "get /api/v1/purchase-orders/{param}": "not needed yet (no PO detail page)",
  "get /api/v1/outbound/{param}": "not needed yet",
  "get /api/v1/material-requests": "not needed yet",
  "post /api/v1/material-requests": "not needed yet",
  "patch /api/v1/material-requests/{param}/status": "not needed yet",
  "get /api/v1/reports/inbound/{param}": "not needed yet",
  "get /api/v1/reports/outbound/{param}": "not needed yet",
  "get /health": "infra health check, not an FE call",
};

describe("FE api calls vs docs/api-1.json", () => {
  it("extracts calls", () => expect(calls.length).toBeGreaterThan(40));
  it.each(calls.map((c) => [`${c.method.toUpperCase()} ${c.path}`, c] as const))("%s exists in contract", (_n, c) => {
    expect(contract.has(`${c.method} ${normSpec(c.path)}`)).toBe(true);
  });

  it("no new unlisted unused contract endpoints", () => {
    const used = new Set(calls.map((c) => `${c.method} ${normSpec(c.path)}`));
    const unused = [...contract].filter((k) => !used.has(k));
    console.info("Contract endpoints never called by FE:\n" + unused.join("\n"));
    expect(unused.filter((k) => !(k in UNUSED_ALLOWLIST))).toEqual([]);
  });
});
