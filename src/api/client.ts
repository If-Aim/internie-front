// src/api/client.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function buildUrl(path: string) {
  return path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export async function apiPublic(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };

  return fetch(buildUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });
}
export async function api<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("accessToken");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers["Authorization"] = token.startsWith("Bearer ")
      ? token
      : `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem("accessToken");
    window.location.href = "/login";
    throw new ApiError(res.status, `HTTP ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new ApiError(res.status, `HTTP ${res.status}`, bodyText);
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const bodyText = await res.text().catch(() => "");
    throw new ApiError(200, `Expected JSON, got ${ct}`, bodyText);
  }

  return (await res.json()) as T;
}

export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData,
  init: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("accessToken");

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers["Authorization"] = token.startsWith("Bearer ")
      ? token
      : `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path), {
    ...init,
    method: init.method ?? "POST",
    headers,
    body: formData,
    credentials: "include",
  });

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem("accessToken");
    window.location.href = "/login";
    throw new ApiError(res.status, `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new ApiError(res.status, `HTTP ${res.status}`, bodyText);
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const bodyText = await res.text().catch(() => "");
    return bodyText as unknown as T;
  }

  return (await res.json()) as T;
}


export class ApiError extends Error {
  status: number;
  bodyText?: string;

  constructor(status: number, message: string, bodyText?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.bodyText = bodyText;
  }
}