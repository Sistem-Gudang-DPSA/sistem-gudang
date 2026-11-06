import { describe, expect, it } from "vitest";
import { permissionLabel, resourceLabel } from "./permission-label";

const perm = (code: string, resource: string, action: string, description?: string) => ({ code, resource, action, description });

describe("permissionLabel", () => {
  it("composes action and resource labels for a known code", () => {
    expect(permissionLabel(perm("report.view", "report", "view"))).toBe("Lihat Laporan");
    expect(permissionLabel(perm("purchase-request.approve", "purchase-request", "approve"))).toBe("Setujui Permintaan Pembelian");
  });

  it("uses the override when the composed label would read badly", () => {
    expect(permissionLabel(perm("item.assign-location", "item", "assign-location"))).toBe("Atur Lokasi Barang");
  });

  it("falls back to the BE description, then the code, for unknown actions or resources", () => {
    expect(permissionLabel(perm("item.read", "item", "read", "Read items"))).toBe("Read items");
    expect(permissionLabel(perm("widget.spin", "widget", "spin"))).toBe("widget.spin");
  });
});

describe("resourceLabel", () => {
  it("maps known resources and passes unknown ones through", () => {
    expect(resourceLabel("item")).toBe("Data Barang");
    expect(resourceLabel("widget")).toBe("widget");
  });
});
