import { useState } from "react";
import { API_BASE, BASE, withBase } from "../base";
import { Link, useRouter } from "../router";
import TacticsDropdown from "./TacticsDropdown";
import {
  CloseIcon,
  GithubIcon,
  LinkedinIcon,
  MailIcon,
  MenuIcon,
  RssIcon,
  SearchIcon,
  ShieldIcon,
} from "./Icons";

const NAV = [
  { label: "Home", to: `${BASE || ""}/` },
  { label: "About", to: `${BASE || ""}/#about` },
  { label: "Projects", to: `${BASE || ""}/#project` },
  { label: "Experience", to: `${BASE || ""}/#experience` },
  { label: "Mentorship", to: `${BASE || ""}/mentorship` },
  { label: "Blog", to: `${BASE || ""}/blog` },
  { label: "Contact", to: `${BASE || ""}/#contact` },
];

export function BlogHeader() {
  const { path, navigate } = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const submit = (event) => {
    event.preventDefault();
    const value = query.trim();
    navigate(`/blog/search${value ? `?q=${encodeURIComponent(value)}` : ""}`);
    setOpen(false);
  };

  const isBlogIndex = path === "/blog";
  const isSearch = path === "/blog/search";
  // The tactics library lives under /blog but has its own nav entry, so it
  // must not also light up the "Blog" link.
  const isTactics = path.startsWith("/blog/tactics");

  return (
    <header className="blog-header">
      <div className="blog-container blog-header-inner">
        <a className="blog-brand" href={withBase("/")}>
          <span className="blog-brand-mark">SM</span>
          <span>
            <span className="blog-brand-name">Sathish M</span>
            <span className="blog-brand-sub">Security Research</span>
          </span>
        </a>

        <nav className="blog-nav" aria-label="Primary">
          {NAV.map((item) => {
            const isCurrent =
              item.label === "Blog"
                ? isBlogIndex || isSearch || (path.startsWith("/blog/") && !isTactics)
                : false;
            return (
              <a
                key={item.label}
                href={item.to}
                aria-current={isCurrent ? "page" : undefined}
              >
                {item.label}
              </a>
            );
          })}
          <TacticsDropdown />
        </nav>

        <div className="blog-header-actions">
          <button
            type="button"
            className="blog-icon-btn"
            aria-label="Search articles"
            onClick={() => navigate("/blog/search")}
          >
            <SearchIcon />
          </button>
          <button
            type="button"
            className="blog-icon-btn blog-menu-btn"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {open && (
        <div className="blog-mobile-nav open">
          <form onSubmit={submit} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <input
              className="blog-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search research…"
              aria-label="Search articles"
            />
            <button type="submit" className="blog-btn blog-btn-primary blog-btn-sm">
              Search
            </button>
          </form>
          {NAV.map((item) => (
            <a key={item.label} href={item.to} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
          <span className="blog-mobile-nav__label">Tactics</span>
          <a href={`${BASE || ""}/blog/tactics/pentesting`} onClick={() => setOpen(false)}>
            Pentesting tactics
          </a>
          <a href={`${BASE || ""}/blog/tactics/tools`} onClick={() => setOpen(false)}>
            Tools
          </a>
          <a href={`${BASE || ""}/blog/tactics/hardening`} onClick={() => setOpen(false)}>
            Hardening
          </a>
        </div>
      )}
    </header>
  );
}

export function BlogFooter() {
  return (
    <footer className="blog-footer">
      <div className="blog-container">
        <div className="blog-footer-inner">
          <div className="blog-footer-brand">
            <a className="blog-brand" href={withBase("/")}>
              <span className="blog-brand-mark"><ShieldIcon size={18} /></span>
              <span>
                <span className="blog-brand-name">Sathish M</span>
                <span className="blog-brand-sub">Security Research</span>
              </span>
            </a>
            <p>
              Field notes on offensive security, detection engineering, and building software that
              is harder to break. Written by Sathish M, cybersecurity researcher and mentor.
            </p>
            <div className="blog-share-list" style={{ marginTop: "1rem" }}>
              <a href="https://github.com/cybok10" aria-label="GitHub" target="_blank" rel="noreferrer">
                <GithubIcon />
              </a>
              <a href="https://linkedin.com/in/amsathish" aria-label="LinkedIn" target="_blank" rel="noreferrer">
                <LinkedinIcon />
              </a>
              <a href="mailto:sathish1012cybok@gmail.com" aria-label="Email">
                <MailIcon />
              </a>
              <a href={`${API_BASE}/blog/feed.xml`} aria-label="RSS feed">
                <RssIcon />
              </a>
            </div>
          </div>

          <div>
            <h3>Explore</h3>
            <div className="blog-footer-links">
              <a href={withBase("/blog")}>All articles</a>
              <a href={withBase("/blog/category/offensive-security")}>Offensive security</a>
              <a href={withBase("/blog/category/application-security")}>Application security</a>
              <a href={withBase("/blog/category/detection-engineering")}>Detection engineering</a>
              <a href={withBase("/blog/category/career-mentorship")}>Career &amp; mentorship</a>
            </div>
          </div>

          <div>
            <h3>Tactics</h3>
            <div className="blog-footer-links">
              <a href={withBase("/blog/tactics")}>Tactics library</a>
              <a href={withBase("/blog/tactics/pentesting")}>Pentesting tactics</a>
              <a href={withBase("/blog/tactics/tools")}>Tools</a>
              <a href={withBase("/blog/tactics/hardening")}>Hardening</a>
            </div>
          </div>

          <div>
            <h3>Portfolio</h3>
            <div className="blog-footer-links">
              <a href={withBase("/")}>Home</a>
              <a href={withBase("/#about")}>About</a>
              <a href={withBase("/#project")}>Projects</a>
              <a href={withBase("/mentorship")}>Mentorship</a>
              <a href={withBase("/#contact")}>Contact</a>
            </div>
          </div>
        </div>

        <div className="blog-footer-bottom">
          <span>© {new Date().getFullYear()} Sathish M. All rights reserved.</span>
          <span style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <a href={`${API_BASE}/blog/feed.xml`}>RSS</a>
            <a href={`${API_BASE}/blog/sitemap.xml`}>Sitemap</a>
            <Link to="/admin/blog">Admin</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

export function BlogLayout({ children }) {
  return (
    <div className="blog-shell">
      <BlogHeader />
      <main>{children}</main>
      <BlogFooter />
    </div>
  );
}
