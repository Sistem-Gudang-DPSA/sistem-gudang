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
    expect(fetchMock.mock.calls[1][1].headers).toMatchObject({ "X-Requested-With": "XMLHttpRequest" });
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

  it("shares one refresh request between concurrent callers", async () => {
    const data = { accessToken: "new", user: { id: 1 } };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { success: true, message: "ok", data }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const { refreshSessionData, getAccessToken } = await import("./api-client");

    const [a, b] = await Promise.all([refreshSessionData(), refreshSessionData()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toEqual(data);
    expect(b).toEqual(data);
    expect(getAccessToken()).toBe("new");
  });

  it("refreshes once when several requests get 401 with the same expired token", async () => {
    const { apiClient, setAccessToken } = await import("./api-client");
    setAccessToken("old");
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      if (String(url).includes("/auth/refresh")) {
        return jsonResponse(200, { success: true, message: "ok", data: { accessToken: "new" } });
      }
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === "Bearer new"
        ? jsonResponse(200, { success: true, message: "ok", data: 1 })
        : jsonResponse(401, { success: false, message: "Token invalid" });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await Promise.all([apiClient.get("/api/v1/a"), apiClient.get("/api/v1/b"), apiClient.get("/api/v1/c")]);

    expect(fetchMock.mock.calls.filter(([u]) => String(u).includes("/auth/refresh"))).toHaveLength(1);
  });

  it("retries without refreshing when the token was renewed after the request was sent", async () => {
    const { apiClient, setAccessToken } = await import("./api-client");
    setAccessToken("old");
    let first = true;
    const fetchMock = vi.fn(async () => {
      if (first) {
        first = false;
        setAccessToken("new"); // a concurrent refresh finished while this request was in flight
        return jsonResponse(401, { success: false, message: "Token invalid" });
      }
      return jsonResponse(200, { success: true, message: "ok", data: 7 });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(apiClient.get("/api/v1/a")).resolves.toBe(7);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not refresh after a 401 from an auth endpoint (wrong password)", async () => {
    const { apiClient } = await import("./api-client");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(401, { success: false, message: "Invalid email or password" }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(apiClient.post("/api/v1/auth/login", {})).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("runs the refresh inside a Web Lock so tabs do not race on the cookie", async () => {
    const request = vi.fn((_name: string, cb: () => Promise<unknown>) => cb());
    Object.defineProperty(navigator, "locks", { value: { request }, configurable: true });
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse(200, { success: true, message: "ok", data: { accessToken: "n" } })
    ) as unknown as typeof fetch;
    const { refreshSessionData } = await import("./api-client");

    await refreshSessionData();

    expect(request).toHaveBeenCalledWith("auth-refresh", expect.any(Function));
    Object.defineProperty(navigator, "locks", { value: undefined, configurable: true });
  });
});
