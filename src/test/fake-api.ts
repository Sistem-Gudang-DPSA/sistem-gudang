import { vi } from "vitest";

// Minimal fake of the backend for component tests. It replaces global fetch, so the real api-client,
// api.ts files and useApiData run unchanged. Query strings are ignored when matching routes.
//
//   const api = installFakeApi({
//     "GET /api/v1/items": paged([{ id: 1, name: "Triplex" }]),
//     "POST /api/v1/items": (req) => ({ id: 2, ...req.body }),
//     "DELETE /api/v1/items/5": fail(409, "Item dipakai"),
//   });
//   ...
//   expect(api.calls("POST /api/v1/items")[0].body).toEqual({ name: "Baru" });

export interface FakeRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
}

type Handler = unknown | ((req: FakeRequest) => unknown);

export const paged = <T,>(rows: T[], extra: Record<string, unknown> = {}) => ({
  rows,
  total: rows.length,
  page: 1,
  pageSize: 20,
  ...extra,
});

// Marker for an error response, e.g. `fail(403, "Missing permission: x")`.
export const fail = (status: number, message: string, errors?: Record<string, string[]>) => ({ __fail: true, status, message, errors });

const isFail = (v: unknown): v is ReturnType<typeof fail> => typeof v === "object" && v !== null && "__fail" in v;

export function installFakeApi(routes: Record<string, Handler> = {}) {
  const calls: FakeRequest[] = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = (init?.method ?? "GET").toUpperCase();
    const rawBody = typeof init?.body === "string" ? init.body : undefined;
    const req: FakeRequest = { method, path: url.pathname, query: url.searchParams, body: rawBody ? JSON.parse(rawBody) : undefined };
    calls.push(req);

    const handler = routes[`${method} ${url.pathname}`];
    if (handler === undefined) {
      return Response.json({ success: false, message: `Unhandled fake route: ${method} ${url.pathname}` }, { status: 404 });
    }
    const result = typeof handler === "function" ? (handler as (r: FakeRequest) => unknown)(req) : handler;
    if (isFail(result)) {
      return Response.json({ success: false, message: result.message, errors: result.errors }, { status: result.status });
    }
    return Response.json({ success: true, message: "ok", data: result ?? null });
  });

  vi.stubGlobal("fetch", fetchMock);

  return {
    fetchMock,
    all: () => calls,
    calls: (key: string) => {
      const [method, path] = key.split(" ");
      return calls.filter((c) => c.method === method && c.path === path);
    },
  };
}
