import { apiUrl } from "./base";

const CSRF_KEY = "blog.csrf";

let csrfToken =
  typeof window !== "undefined" ? window.sessionStorage.getItem(CSRF_KEY) || null : null;

export function setCsrfToken(token) {
  csrfToken = token || null;
  if (typeof window === "undefined") return;
  if (token) window.sessionStorage.setItem(CSRF_KEY, token);
  else window.sessionStorage.removeItem(CSRF_KEY);
}

export function getCsrfToken() {
  return csrfToken;
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function api(path, { method = "GET", body, signal } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (csrfToken && method !== "GET" && method !== "HEAD") {
    headers["X-CSRF-Token"] = csrfToken;
  }

  const send = (target) =>
    fetch(target, {
      method,
      headers,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });

  let response;
  try {
    response = await send(apiUrl(path));
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Cannot reach the blog API. Is the server running?", 0);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // The hosting platform answers an unrouted path with its own JSON shape,
    // where `error` is an object rather than a string.
    const raw = data?.error;
    const message =
      typeof raw === "string"
        ? raw
        : typeof raw?.message === "string"
          ? raw.message
          : `Request failed (${response.status})`;
    if (response.status === 401 && path !== "/auth/login") {
      setCsrfToken(null);
    }
    throw new ApiError(message, response.status, data.details);
  }
  return data;
}

export function queryString(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function formatDate(value, { withTime = false } = {}) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatNumber(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export function submissionErrorMessage(error) {
  if (!error) return "";
  if (error.status === 403) return "Your session expired or the secure token is invalid. Please sign in again.";
  if (error.status === 401) return "Authentication required.";
  if (error.status === 429) return "Too many attempts. Please wait a moment.";
  if (error.status === 0) return error.message;
  return error.message || "Something went wrong.";
}
