const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  retryAfter?: number;

  constructor(message: string, status: number, errors?: Record<string, string[]>, retryAfter?: number) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.retryAfter = retryAfter;
  }
}

type ApiEnvelope<T> =
  | { success: true; message: string; data: T }
  | { success: false; message: string; errors?: Record<string, string[]> };

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
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: CSRF_HEADER,
        });
        const body: ApiEnvelope<T> = await res.json();
        if (!body.success) return null;
        setAccessToken(body.data.accessToken);
        return body.data;
      } catch {
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise as Promise<T | null>;
}

async function refreshAccessToken(): Promise<boolean> {
  return (await refreshSessionData()) !== null;
}

async function request<T>(path: string, options: RequestInit = {}, retryOn401 = true): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      // FormData sets its own multipart Content-Type with the boundary.
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...CSRF_HEADER, // the backend requires it on /auth/refresh and /auth/logout
      ...options.headers,
    },
  });

  const body: ApiEnvelope<T> = await res.json();

  if (!body.success) {
    if (res.status === 401 && retryOn401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return request<T>(path, options, false);
    }
    // Rate limits report the wait in seconds; `?.` because test doubles may omit headers.
    const header = res.headers?.get("Retry-After") ?? res.headers?.get("RateLimit-Reset");
    const retryAfter = header == null ? NaN : Number(header);
    throw new ApiError(body.message, res.status, body.errors, Number.isNaN(retryAfter) ? undefined : retryAfter);
  }

  return body.data;
}

// Fetches a binary file (e.g. xlsx export) and saves it via a temporary link.
export async function downloadFile(path: string, fallbackName: string, retryOn401 = true): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  if (!res.ok) {
    if (res.status === 401 && retryOn401 && (await refreshAccessToken())) {
      return downloadFile(path, fallbackName, false);
    }
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.message ?? "Gagal mengunduh file.", res.status, body?.errors);
  }

  const name = /filename="?([^";]+)"?/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined, headers }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PUT", body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined }),
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
