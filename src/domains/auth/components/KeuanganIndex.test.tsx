import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

const redirect = vi.fn();
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));

import KeuanganIndex from "./KeuanganIndex";

describe("KeuanganIndex", () => {
  it("redirects to an existing Keuangan page", () => {
    KeuanganIndex();
    const target: string = redirect.mock.calls[0][0];
    expect(target).toBe("/dashboard/keuangan/laporan/data-barang");
    expect(existsSync(join(process.cwd(), "src/app", target, "page.tsx"))).toBe(true);
  });
});
