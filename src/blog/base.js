export const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export function withBase(path = "/") {
  if (/^https?:\/\//i.test(path) || path.startsWith("mailto:")) return path;
  if (path.startsWith("#")) return `${BASE}/${path}`;
  return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Builds the URL for an API endpoint.
 *
 * The REST path travels in the `p` query parameter rather than in the
 * URL path, so the entire API can be served by a single function mounted
 * at `/api`. That does not depend on catch-all routing being available,
 * which some hosting setups handle inconsistently.
 *
 * `/api/blog/posts?page=2` becomes `/api?p=%2Fblog%2Fposts&page=2`.
 */
export function apiUrl(path = "/") {
  const [pathname, query = ""] = String(path).split("?");
  const search = new URLSearchParams();
  search.set("p", pathname || "/");
  if (query) {
    for (const [key, value] of new URLSearchParams(query)) search.append(key, value);
  }
  return `${API_BASE}?${search.toString()}`;
}

export function stripBase(pathname) {
  if (BASE && pathname.startsWith(BASE)) {
    const rest = pathname.slice(BASE.length);
    return rest || "/";
  }
  return pathname || "/";
}

export function assetUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  if (url.startsWith("/api/")) return apiUrl(url.slice(4));
  if (url.startsWith("/assets/") || url.startsWith("/vite.svg")) return withBase(url);
  return url;
}

export function absoluteUrl(path = "/") {
  return `${window.location.origin}${withBase(path)}`;
}
