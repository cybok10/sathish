import { useEffect, useState } from "react";
import { api, queryString } from "../api";
import { Link, useQuery, useRouter } from "../router";
import { useApi } from "../useApi";
import { useSeo } from "../seo";
import { PostCard } from "../components/PostCard";
import { Pagination } from "../components/Pagination";
import { ErrorState, LoadingState } from "../components/States";
import { SearchIcon } from "../components/Icons";

export default function BlogSearch() {
  const { navigate } = useRouter();
  const params = useQuery();
  const q = (params.get("q") || "").trim();
  const tag = params.get("tag") || "";
  const category = params.get("category") || "";
  const sort = params.get("sort") === "popular" ? "popular" : "newest";
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
  const [query, setQuery] = useState(q);

  useEffect(() => setQuery(q), [q]);

  const { data, loading, error, reload } = useApi(
    async (signal) => {
      const [results, categories, tags] = await Promise.all([
        q
          ? api(`/blog/search${queryString({ q, tag, category, sort, page, limit: 9 })}`, { signal })
          : Promise.resolve({ items: [], pagination: { total: 0, totalPages: 1, page: 1 } }),
        api("/blog/categories", { signal }),
        api("/blog/tags", { signal }),
      ]);
      return { results, categories, tags };
    },
    [q, tag, category, sort, page]
  );

  useSeo({
    title: q ? `Search: ${q}` : "Search research",
    description: "Search security research articles, categories, tags, and authors.",
    path: `/blog/search${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    noIndex: true,
  });

  const submit = (event) => {
    event.preventDefault();
    const value = query.trim();
    navigate(`/blog/search${value ? `?q=${encodeURIComponent(value)}` : ""}`);
  };

  const buildTo = (target) =>
    `/blog/search${queryString({
      q,
      tag,
      category,
      sort: sort === "popular" ? "popular" : "",
      page: target > 1 ? target : "",
    })}`;

  return (
    <>
      <div className="blog-page-head blog-search-head">
        <div className="blog-container">
          <nav className="blog-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/blog">Blog</Link>
            <span>/</span>
            <span style={{ color: "#a1a1aa" }}>Search</span>
          </nav>
          <span className="blog-kicker">Search the archive</span>
          <h1>{q ? `Results for “${q}”` : "Find the research you need"}</h1>
          <p>
            Search across article titles, full content, categories, tags, and authors. Results are
            ranked by publication date.
          </p>
          <form onSubmit={submit} role="search">
            <div style={{ position: "relative", flex: 1 }}>
              <SearchIcon
                size={17}
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#71717a" }}
              />
              <input
                className="blog-input"
                style={{ paddingLeft: "2.4rem" }}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try “Kerberoasting”, “Wazuh”, “XSS”…"
                aria-label="Search query"
                autoFocus
              />
            </div>
            <button type="submit" className="blog-btn blog-btn-primary">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="blog-container">
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !q ? (
          <div style={{ display: "grid", gap: "2rem" }}>
            <div>
              <h2 className="blog-h2" style={{ fontSize: "1.2rem", marginBottom: "0.9rem" }}>
                Browse by category
              </h2>
              <div className="blog-category-grid">
                {(data?.categories?.items || []).map((item) => (
                  <Link key={item.id} className="blog-category-tile" to={`/blog/category/${item.slug}`}>
                    <strong>{item.name}</strong>
                    <span>{item.description}</span>
                    <em>{item.post_count} articles</em>
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h2 className="blog-h2" style={{ fontSize: "1.2rem", marginBottom: "0.9rem" }}>
                Popular topics
              </h2>
              <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                {(data?.tags?.items || []).map((item) => (
                  <Link key={item.id} className="blog-chip" to={`/blog/search?q=${encodeURIComponent(item.name)}`}>
                    #{item.name} <span style={{ color: "#52525b" }}>{item.post_count}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : loading && !data ? (
          <LoadingState rows={6} />
        ) : data?.results?.items?.length ? (
          <>
            <p className="blog-search-note">
              {data.results.pagination.total} result
              {data.results.pagination.total === 1 ? "" : "s"} for <span className="blog-result-tag">“{q}”</span>
              {tag && <> tagged <span className="blog-result-tag">#{tag}</span></>}
              {category && <> in <span className="blog-result-tag">{category}</span></>}
            </p>
            <div className="blog-grid">
              {data.results.items.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
            <Pagination
              page={data.results.pagination.page}
              totalPages={data.results.pagination.totalPages}
              buildTo={buildTo}
            />
          </>
        ) : (
          <div className="blog-empty">
            <h3>No matches for “{q}”</h3>
            <p style={{ maxWidth: 480 }}>
              Try a broader term such as “Active Directory”, “detection”, or “React”. You can also
              browse categories and tags above.
            </p>
            <Link className="blog-btn blog-btn-sm" to="/blog">
              Browse all articles
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
