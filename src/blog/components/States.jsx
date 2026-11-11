import { Link } from "../router";
import { SearchIcon } from "./Icons";

export function LoadingState({ label = "Loading…", rows = 3 }) {
  return (
    <div aria-live="polite" aria-busy="true">
      <div className="blog-grid">
        {Array.from({ length: rows }).map((_, index) => (
          <div className="blog-card" key={index} aria-hidden="true">
            <div className="blog-card-media" style={{ background: "#121216" }} />
            <div className="blog-card-body">
              <div style={{ height: 9, width: "40%", background: "#1f1f24", borderRadius: 4 }} />
              <div style={{ height: 18, width: "92%", background: "#1f1f24", borderRadius: 4 }} />
              <div style={{ height: 11, width: "100%", background: "#18181b", borderRadius: 4 }} />
              <div style={{ height: 11, width: "70%", background: "#18181b", borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
      <p className="blog-dim" style={{ marginTop: "1rem", fontSize: "0.8rem" }}>
        {label}
      </p>
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "The blog could not load" }) {
  return (
    <div className="blog-empty" role="alert">
      <h3>{title}</h3>
      <p style={{ maxWidth: 460 }}>
        {error?.status === 0
          ? "The blog API is not reachable. Start the site with npm run dev (the API is mounted into Vite)."
          : error?.message || "An unexpected error occurred."}
      </p>
      {onRetry && (
        <button type="button" className="blog-btn blog-btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
      <Link to="/blog" className="blog-btn blog-btn-sm">
        Back to the blog
      </Link>
    </div>
  );
}

export function EmptyState({ title = "Nothing here yet", children }) {
  return (
    <div className="blog-empty">
      <h3>{title}</h3>
      {children}
      <Link to="/blog" className="blog-btn blog-btn-sm">
        Browse all articles
      </Link>
    </div>
  );
}

export function SearchInput({ value, onChange, onSubmit, placeholder = "Search articles, tags, authors…" }) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
      role="search"
      style={{ position: "relative", flex: 1 }}
    >
      <SearchIcon size={17} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#71717a" }} />
      <input
        className="blog-input"
        style={{ paddingLeft: "2.4rem" }}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label="Search articles"
      />
    </form>
  );
}
