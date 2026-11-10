import { Link } from "../router";
import { ChevronLeft, ChevronRight } from "./Icons";

function pageList(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set([1, totalPages, page, page - 1, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((value) => pages.add(value));
  if (page >= totalPages - 2) [totalPages - 1, totalPages - 2, totalPages - 3].forEach((value) => pages.add(value));
  const sorted = [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
  const output = [];
  let previous = 0;
  for (const value of sorted) {
    if (previous && value - previous > 1) output.push("…");
    output.push(value);
    previous = value;
  }
  return output;
}

/**
 * `buildTo(page)` returns a router path. Renders links so pagination is
 * shareable and works without JS state.
 */
export function Pagination({ page, totalPages, buildTo }) {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <nav className="blog-pagination" aria-label="Pagination">
      {page > 1 ? (
        <Link className="blog-page-btn" to={buildTo(page - 1)} aria-label="Previous page">
          <ChevronLeft size={15} />
        </Link>
      ) : (
        <button className="blog-page-btn" disabled aria-label="Previous page">
          <ChevronLeft size={15} />
        </button>
      )}

      {pageList(page, totalPages).map((value, index) =>
        value === "…" ? (
          <span key={`gap-${index}`} className="blog-page-btn" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={value}
            className={`blog-page-btn${value === page ? " active" : ""}`}
            to={buildTo(value)}
            aria-current={value === page ? "page" : undefined}
          >
            {value}
          </Link>
        )
      )}

      {page < totalPages ? (
        <Link className="blog-page-btn" to={buildTo(page + 1)} aria-label="Next page">
          <ChevronRight size={15} />
        </Link>
      ) : (
        <button className="blog-page-btn" disabled aria-label="Next page">
          <ChevronRight size={15} />
        </button>
      )}
    </nav>
  );
}
