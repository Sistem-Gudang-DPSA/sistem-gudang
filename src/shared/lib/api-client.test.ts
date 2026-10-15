import { describe, it, expect, vi, beforeEach } from "vitest";

function jsonResponse(status: number, body: unknown) {
  return { status, json: async () => body } as Response;
}

describe("apiClient", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("returns data when the envelope succeeds", async () => {
    const { apiClient } = await import("./api-client");
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse(200, { success: true, message: "ok", data: { id: 1 } })
    ) as unknown as typeof fetch;

    const result = await apiClient.get<{ id: number }>("/api/v1/items/1");

    expect(result).toEqual({ id: 1 });
  });

  it("throws ApiError with message, status, and field errors when the envelope fails", async () => {
    const { apiClient } = await import("./api-client");
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse(400, {
        success: false,
        message: "Validasi gagal",
        errors: { name: ["wajib diisi"] },
      })
    ) as unknown as typeof fetch;

    await expect(apiClient.post("/api/v1/items", {})).rejects.toMatchObject({
      message: "Validasi gagal",
      status: 400,
      errors: { name: ["wajib diisi"] },
    });
  });

  it("reads Retry-After seconds into ApiError.retryAfter", async () => {
    const { apiClient } = await import("./api-client");
    global.fetch = vi.fn().mockResolvedValue({
      status: 429,
      headers: new Headers({ "Retry-After": "7" }),
      json: async () => ({ success: false, message: "Terlalu banyak permintaan" }),
    }) as unknown as typeof fetch;

    await expect(apiClient.get("/api/v1/items")).rejects.toMatchObject({ status: 429, retryAfter: 7 });
  });

  it("retries the request once after a successful silent refresh on 401", async () => {
    const { apiClient, setAccessToken, getAccessToken } = await import("./api-client");
    setAccessToken("expired-token");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { success: false, message: "Token invalid" }))
      .mockResolvedValueOnce(
        jsonResponse(200, { success: true, message: "ok", data: { accessToken: "new-token" } })
      )
      .mockResolvedValueOnce(jsonResponse(200, { success: true, message: "ok", data: { id: 42 } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await apiClient.get<{ id: number }>("/api/v1/items/42");

    expect(result).toEqual({ id: 42 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain("/api/v1/auth/refresh");
    expect(getAccessToken()).toBe("new-token");
  });

  it("sends the right HTTP method and body for each verb", async () => {
    const { apiClient } = await import("./api-client");
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { success: true, message: "ok", data: null })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await apiClient.patch("/api/v1/items/1/stock", { delta: -2, reason: "rusak" });

    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(options.body)).toEqual({ delta: -2, reason: "rusak" });
  });

  it("gives up after a failed refresh instead of retrying forever", async () => {
    const { apiClient } = await import("./api-client");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { success: false, message: "Token invalid" }))
      .mockResolvedValueOnce(jsonResponse(401, { success: false, message: "Refresh invalid" }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(apiClient.get("/api/v1/items/1")).rejects.toMatchObject({
      message: "Token invalid",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
