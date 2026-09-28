import { describe, it, expect } from "vitest";
import { dashboardPathFor } from "./api";
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

  it("routes other roles to /dashboard/<roleName lowercased>", () => {
    expect(dashboardPathFor(makeUser({ roleName: "Gudang" }))).toBe("/dashboard/gudang");
    expect(dashboardPathFor(makeUser({ roleName: "PPIC" }))).toBe("/dashboard/ppic");
    expect(dashboardPathFor(makeUser({ roleName: "purchasing" }))).toBe("/dashboard/purchasing");
  });
});
