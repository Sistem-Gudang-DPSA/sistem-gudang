import { describe, expect, it, vi } from "vitest";
import RealisasiDokubahRedirect from "@/app/dashboard/gudang/laporan/realisasi-spk/page";
import { canAccess, NAV_DIVISIONS } from "@/domains/auth/nav";
import type { AuthUser } from "@/domains/auth/types";

const redirect = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ redirect }));

describe("Gudang Realisasi Dokubah route", () => {
  it("redirects the old URL to the current Gudang menu", () => {
    RealisasiDokubahRedirect();
    const target = "/dashboard/gudang/laporan/realisasi-dokubah";
    expect(redirect).toHaveBeenCalledWith(target);
    expect(NAV_DIVISIONS.find((d) => d.key === "gudang")?.groups.flatMap((g) => g.items)).toContainEqual(
      expect.objectContaining({ href: target, anyOf: ["dokubah.view"] }),
    );
  });

  it.each(["realisasi-spk", "realisasi-dokubah"])("requires dokubah.view for %s", (route) => {
    const user: AuthUser = {
      id: 1, username: "gudang", email: "gudang@example.com", roleId: 1,
      roleName: "Gudang", isSuperadmin: false, domainCode: "inventory", permissions: ["inbound.view"],
    };
    const path = `/dashboard/gudang/laporan/${route}`;
    expect(canAccess(user, path)).toBe(false);
    expect(canAccess({ ...user, permissions: [...user.permissions, "dokubah.view"] }, path)).toBe(true);
  });
});
