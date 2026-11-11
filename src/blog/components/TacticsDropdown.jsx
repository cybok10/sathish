import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useRouter } from "../router";
import { ChevronRight } from "./Icons";

const PANEL = [
  {
    id: "pentesting",
    to: "/blog/tactics/pentesting",
    title: "Pentesting tactics",
    blurb:
      "A walkthrough for every protocol and service worth attacking, from recon through to post-exploitation and the fix.",
    meta: "service protocols",
  },
  {
    id: "tools",
    to: "/blog/tactics/tools",
    title: "Tools",
    blurb:
      "The toolkit, explained honestly — what each tool is for, how to install it, and where it gives false results.",
    meta: "offensive tools",
  },
  {
    id: "hardening",
    to: "/blog/tactics/hardening",
    title: "Hardening",
    blurb:
      "The defensive side of the same work: what to turn on, how to verify it, and what each control actually stops.",
    meta: "defensive guides",
  },
];

/**
 * The counts are loaded on demand rather than imported statically — the
 * content modules are large, and pulling them into the header would put
 * the whole library in the main bundle.
 */
let countsPromise = null;
function loadCounts() {
  if (!countsPromise) {
    countsPromise = import("../data/tactics.js").then((module) => ({
      pentesting: module.services.length,
      tools: module.tools.length,
      hardening: module.hardening.length,
    }));
  }
  return countsPromise;
}

/**
 * The "Tactics" dropdown.
 *
 * Opens on hover for pointer users and on click for everyone, closes on
 * Escape or an outside click, and keeps the focus ring honest by keeping
 * the trigger in the tab order rather than hiding the panel behind
 * :hover alone.
 *
 * The panel sits below the trigger, so the pointer has to cross a gap to
 * reach it. Closing is therefore deferred by a short delay, and the gap
 * is bridged in CSS — otherwise the menu disappears before you can click.
 */
export default function TacticsDropdown() {
  const { path } = useRouter();
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState(null);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const closeTimer = useRef(null);

  const isActive = path.startsWith("/blog/tactics");

  useEffect(() => {
    let cancelled = false;
    loadCounts().then((value) => {
      if (!cancelled) setCounts(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Navigating anywhere closes the panel.
  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const show = useCallback(() => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  }, []);

  return (
    <div
      className="blog-dropdown"
      ref={wrapRef}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <button
        type="button"
        ref={triggerRef}
        className="blog-dropdown__trigger"
        aria-expanded={open}
        aria-haspopup="true"
        aria-current={isActive ? "page" : undefined}
        onClick={() => setOpen((value) => !value)}
        onFocus={show}
      >
        Tactics
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <div
          className="blog-dropdown__panel"
          role="menu"
          aria-label="Tactics"
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          {PANEL.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              role="menuitem"
              className="blog-dropdown__card"
              onFocus={show}
            >
              <span className="blog-dropdown__title">
                {item.title}
                <ChevronRight size={14} />
              </span>
              <span className="blog-dropdown__blurb">{item.blurb}</span>
              <span className="blog-dropdown__meta">
                {counts ? <strong>{counts[item.id]}</strong> : "—"} {item.meta}
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
