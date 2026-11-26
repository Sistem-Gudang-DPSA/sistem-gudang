import { describe, expect, it } from "vitest";
import { fail, installFakeApi } from "@/test/fake-api";
import { bulkAssignItemSupplier } from "./item-supplier";

describe("bulk assign item supplier", () => {
  it("updates every item with only supplierId and reports the success count", async () => {
    const api = installFakeApi({
      "PUT /api/v1/items/1": { id: 1 },
      "PUT /api/v1/items/2": { id: 2 },
    });

    const result = await bulkAssignItemSupplier([1, 2], 7);

    expect(result).toEqual({ assigned: 2, failed: [] });
    expect(api.calls("PUT /api/v1/items/1").at(-1)?.body).toEqual({ supplierId: 7 });
    expect(api.calls("PUT /api/v1/items/2").at(-1)?.body).toEqual({ supplierId: 7 });
    expect(Object.keys(api.calls("PUT /api/v1/items/1")[0].body as object)).toEqual(["supplierId"]);
  });

  it("keeps going when one item fails and reports why", async () => {
    const api = installFakeApi({
      "PUT /api/v1/items/1": { id: 1 },
      "PUT /api/v1/items/2": fail(400, "Supplier tidak ditemukan."),
      "PUT /api/v1/items/3": { id: 3 },
    });

    const result = await bulkAssignItemSupplier([1, 2, 3], 7);

    expect(result).toEqual({ assigned: 2, failed: [{ id: 2, reason: "Supplier tidak ditemukan." }] });
    expect(api.calls("PUT /api/v1/items/3")).toHaveLength(1);
  });

  it("clears the supplier when supplierId is null", async () => {
    const api = installFakeApi({ "PUT /api/v1/items/4": { id: 4 } });

    const result = await bulkAssignItemSupplier([4], null);

    expect(result).toEqual({ assigned: 1, failed: [] });
    expect(api.calls("PUT /api/v1/items/4")[0].body).toEqual({ supplierId: null });
  });

  it("reports progress after each item", async () => {
    installFakeApi({
      "PUT /api/v1/items/1": { id: 1 },
      "PUT /api/v1/items/2": { id: 2 },
    });
    const progress: string[] = [];

    await bulkAssignItemSupplier([1, 2], 7, (done, total) => progress.push(`${done}/${total}`));

    expect(progress).toEqual(["1/2", "2/2"]);
  });
});
