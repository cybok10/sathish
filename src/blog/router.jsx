import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BASE, stripBase, withBase } from "./base";

const RouterContext = createContext(null);

function readLocation() {
  return {
    path: stripBase(window.location.pathname),
    search: window.location.search,
    hash: window.location.hash,
  };
}

export function RouterProvider({ children }) {
  const [location, setLocation] = useState(readLocation);

  useEffect(() => {
    const onPop = () => setLocation(readLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to, { replace = false, keepScroll = false } = {}) => {
    const target = new URL(withBase(to), window.location.origin);
    const next = `${target.pathname}${target.search}${target.hash}`;
    if (replace) window.history.replaceState(null, "", next);
    else window.history.pushState(null, "", next);
    setLocation(readLocation());
    if (!keepScroll) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, []);

  const value = useMemo(
    () => ({ ...location, navigate, base: BASE }),
    [location, navigate]
  );

  return createElement(RouterContext.Provider, { value }, children);
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) throw new Error("useRouter must be used inside RouterProvider");
  return context;
}

export function useQuery() {
  const { search } = useRouter();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function Link({ to, children, onClick, ...rest }) {
  const { navigate } = useRouter();
  const href = withBase(to);
  return createElement(
    "a",
    {
      ...rest,
      href,
      onClick: (event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        if (rest.target && rest.target !== "_self") return;
        if (/^https?:\/\//i.test(to)) return;
        event.preventDefault();
        navigate(to);
      },
    },
    children
  );
}

export function matchPath(pattern, path) {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    const expected = patternParts[i];
    const actual = pathParts[i];
    if (expected.startsWith(":")) {
      params[expected.slice(1)] = decodeURIComponent(actual);
    } else if (expected !== actual) {
      return null;
    }
  }
  return params;
}

export function slugifyHeading(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70);
}
