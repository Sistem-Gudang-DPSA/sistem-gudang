import { describe, expect, it } from "vitest";
import { apiClient } from "@/shared/lib/api-client";
import { fail, installFakeApi, paged, type FakeRequest } from "./fake-api";

describe("installFakeApi", () => {
  it("answers matched routes, records calls, and fails unknown routes", async () => {
    const api = installFakeApi({
      "GET /api/v1/items": paged([{ id: 1 }]),
      "POST /api/v1/items": (req: FakeRequest) => ({ id: 2, ...(req.body as object) }),
      "DELETE /api/v1/items/5": fail(409, "Item dipakai"),
    });

    expect(await apiClient.get("/api/v1/items?page=1")).toMatchObject({ rows: [{ id: 1 }], total: 1 });
    expect(await apiClient.post("/api/v1/items", { name: "Baru" })).toEqual({ id: 2, name: "Baru" });
    expect(api.calls("POST /api/v1/items")[0].body).toEqual({ name: "Baru" });
    await expect(apiClient.delete("/api/v1/items/5")).rejects.toMatchObject({ status: 409, message: "Item dipakai" });
    await expect(apiClient.get("/api/v1/nowhere")).rejects.toMatchObject({ status: 404 });
  });
});
