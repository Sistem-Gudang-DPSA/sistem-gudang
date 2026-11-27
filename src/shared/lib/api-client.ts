import { downloadBlob } from "./download";
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const REQUEST_ID_HEADER = "X-Request-Id";

// The backend echoes this id in the error body; keeping it on ApiError lets a
// bug report be matched to the server log for the exact request that failed.
const newRequestId = () => crypto.randomUUID();

export class ApiError extends Error {
  status: number;
  // a list of { row, message } for a spreadsheet import that has bad rows
  errors?: Record<string, string[]> | RowError[];
  retryAfter?: number;
  requestId?: string;

  constructor(message: string, status: number, errors?: Record<string, string[]> | RowError[], retryAfter?: number, requestId?: string) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.retryAfter = retryAfter;
    this.requestId = requestId;
  }
}

type RowError = { row: number; message: string };

type ApiEnvelope<T> =
  | { success: true; message: string; data: T }
  | { success: false; message: string; requestId?: string; errors?: Record<string, string[]> | RowError[] };

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

const CSRF_HEADER = { "X-Requested-With": "XMLHttpRequest" };

// One refresh in flight at a time: the BE rotates the refresh token, and a second
// request with the same cookie would be treated as token reuse.
let refreshPromise: Promise<unknown | null> | null = null;

// Rotates the refresh cookie and stores the new access token. Resolves to the
// response data (accessToken, user), or null when the session is gone.
export function refreshSessionData<T extends { accessToken: string }>(): Promise<T | null> {
  if (!refreshPromise) {
    const run = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { ...CSRF_HEADER, [REQUEST_ID_HEADER]: newRequestId() },
        });
        const body: ApiEnvelope<T> = await res.json();
        if (!body.success) return null;
        setAccessToken(body.data.accessToken);
        return body.data;
      } catch {
        return null;
      }
    };
    // Tabs share one cookie jar: a lock serializes their refreshes so the second tab sends the
    // already rotated cookie instead of the old one (the BE rejects the loser of that race).
    refreshPromise = (navigator.locks ? navigator.locks.request("auth-refresh", run) : run()).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise as Promise<T | null>;
}

async function refreshAccessToken(): Promise<boolean> {
  return (await refreshSessionData()) !== null;
}

// A 401 from these means bad credentials or a dead session, not an expired access token. Refreshing
// would only replay a stale cookie, which the BE treats as token reuse and answers by revoking every session.
const isAuthPath = (path: string) => path.startsWith("/api/v1/auth/");

async function request<T>(path: string, options: RequestInit = {}, retryOn401 = true): Promise<T> {
  const sentToken = accessToken;
  const requestId = newRequestId();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      // FormData sets its own multipart Content-Type with the boundary.
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...CSRF_HEADER, // the backend requires it on /auth/refresh and /auth/logout
      [REQUEST_ID_HEADER]: requestId,
      ...options.headers,
    },
  });

  const body: ApiEnvelope<T> = await res.json();

  if (!body.success) {
    if (res.status === 401 && retryOn401 && !isAuthPath(path)) {
      // Another request already refreshed while this one was in flight: just retry with the new token.
      const refreshed = (accessToken !== null && accessToken !== sentToken) || (await refreshAccessToken());
      if (refreshed) return request<T>(path, options, false);
    }
    // Rate limits report the wait in seconds; `?.` because test doubles may omit headers.
    const header = res.headers?.get("Retry-After") ?? res.headers?.get("RateLimit-Reset");
    const retryAfter = header == null ? NaN : Number(header);
    const errorRequestId = body.requestId ?? res.headers?.get(REQUEST_ID_HEADER) ?? requestId;
    throw new ApiError(body.message, res.status, body.errors, Number.isNaN(retryAfter) ? undefined : retryAfter, errorRequestId);
  }

  return body.data;
}

// Fetches a binary file (e.g. xlsx export) and saves it via a temporary link.
export async function downloadFile(path: string, fallbackName: string, retryOn401 = true): Promise<void> {
  const sentToken = accessToken;
  const requestId = newRequestId();
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      [REQUEST_ID_HEADER]: requestId,
    },
  });

  if (!res.ok) {
    if (res.status === 401 && retryOn401 && ((accessToken !== null && accessToken !== sentToken) || (await refreshAccessToken()))) {
      return downloadFile(path, fallbackName, false);
    }
    const body = await res.json().catch(() => null);
    throw new ApiError(
      body?.message ?? "Gagal mengunduh file.",
      res.status,
      body?.errors,
      undefined,
      body?.requestId ?? requestId,
    );
  }

  const name = /filename="?([^";]+)"?/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? fallbackName;
  downloadBlob(await res.blob(), name);
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined, headers }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PUT", body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined, headers }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form }),
};

// Files the backend serves (e.g. item photos) may come back as a path relative to the API host.
export const fileUrl = (path: string) => (/^(https?:|blob:|data:)/.test(path) ? path : `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`);

export function toQuery(params?: object): string {
  if (!params) return "";
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const s = query.toString();
  return s ? `?${s}` : "";
}
