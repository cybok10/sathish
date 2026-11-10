export const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export function withBase(path = "/") {
  if (/^https?:\/\//i.test(path) || path.startsWith("mailto:")) return path;
  if (path.startsWith("#")) return `${BASE}/${path}`;
  return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
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
  if (url.startsWith("/api/")) return `${API_BASE}${url.slice(4)}`;
  if (url.startsWith("/assets/") || url.startsWith("/vite.svg")) return withBase(url);
  return url;
}

export function absoluteUrl(path = "/") {
  return `${window.location.origin}${withBase(path)}`;
}
