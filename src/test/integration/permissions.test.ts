import { describe, expect, it } from "vitest";
import { NAV_DIVISIONS } from "@/domains/auth/nav";

const SEEDED: Record<string, string> = {
  "Koor Inventory": "inbound.view inbound.create outbound.view outbound.create stock-opname.view stock-opname.create material-request.view material-request.update report.view item.view item.create item.update item.delete item.assign-location item.adjust-stock dokubah.view dokubah.approve spk-internal.view location.view location.create location.update location.delete supplier.view",
  "Staf/Koor PPIC": "purchase-request.create material-request.view material-request.create report.view item.view item.create item.update dokubah.view dokubah.create dokubah.update penawaran-harga.view penawaran-harga.create penawaran-harga.update penawaran-harga.publish spk-internal.view spk-internal.create spk-internal.allocate",
  "Koor Purchasing": "purchase-request.approve item.view item.update item.set-price purchase-order.view purchase-order.create supplier.view supplier.create supplier.update supplier.delete",
};
const granted = new Set(Object.values(SEEDED).flatMap((s) => s.split(" ")));

const navPerms = NAV_DIVISIONS.flatMap((d) => [
  ...d.anyOf.map((p) => ({ where: `${d.key} division`, p })),
  ...d.groups.flatMap((g) => g.items.flatMap((i) => (i.anyOf ?? []).map((p) => ({ where: i.href, p })))),
]);

describe("nav permissions", () => {
  it("look like resource.action", () => {
    expect(navPerms.filter((x) => !/^[a-z]+(-[a-z]+)*\.[a-z]+(-[a-z]+)*$/.test(x.p))).toEqual([]);
  });
  it("are granted to a seeded role", () => {
    expect(navPerms.filter((x) => !granted.has(x.p))).toEqual([]);
  });
});
