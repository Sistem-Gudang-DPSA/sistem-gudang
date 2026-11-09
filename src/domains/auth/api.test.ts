import { describe, it, expect } from "vitest";
import { dashboardPathFor, safeNextPath } from "./api";
import type { AuthUser } from "./types";

function makeUser(overrides: Partial<AuthUser>): AuthUser {
  return {
    id: 1,
    username: "user1",
    email: "user1@example.com",
    roleId: 2,
    roleName: "gudang",
    isSuperadmin: false,
    permissions: [],
    ...overrides,
  };
}

describe("dashboardPathFor", () => {
  it("routes superadmin to the superadmin dashboard regardless of roleName", () => {
    const user = makeUser({ isSuperadmin: true, roleName: "SomethingElse" });
    expect(dashboardPathFor(user)).toBe("/dashboard/superadmin");
  });

  it("routes other roles to the first division their permissions allow", () => {
    expect(dashboardPathFor(makeUser({ roleName: "Koor Inventory", permissions: ["inbound.view", "item.view"] }))).toBe("/dashboard/gudang");
    expect(dashboardPathFor(makeUser({ roleName: "Staf PPIC", permissions: ["material-request.create", "item.view"] }))).toBe("/dashboard/ppic");
    expect(dashboardPathFor(makeUser({ roleName: "Koor Purchasing", permissions: ["item.set-price", "supplier.view"] }))).toBe("/dashboard/purchasing");
  });

  it("falls back to /dashboard when the user has no division permission", () => {
    expect(dashboardPathFor(makeUser({ roleName: "Guest", permissions: [] }))).toBe("/dashboard");
  });
});

describe("safeNextPath", () => {
  it("accepts dashboard paths and rejects everything else", () => {
    expect(safeNextPath("/dashboard/gudang/laporan/barang-masuk")).toBe("/dashboard/gudang/laporan/barang-masuk");
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("/dashboardx")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});
