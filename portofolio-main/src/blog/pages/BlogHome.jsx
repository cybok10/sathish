import { useMemo, useState } from "react";
import { api, formatNumber, queryString } from "../api";
import { Link, useQuery, useRouter } from "../router";
import { useApi } from "../useApi";
import { useSeo } from "../seo";
import { API_BASE, absoluteUrl } from "../base";
import { CompactPost, PostCard } from "../components/PostCard";
import { Pagination } from "../components/Pagination";
import { NewsletterSection } from "../components/Newsletter";
import { ErrorState, LoadingState } from "../components/States";
import { ArrowRight, RssIcon, SearchIcon, ShieldIcon } from "../components/Icons";

export default function BlogHome() {
  const { navigate } = useRouter();
  const params = useQuery();
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
  const sort = params.get("sort") === "popular" ? "popular" : "newest";
  const [query, setQuery] = useState("");

  const { data, loading, error, reload } = useApi(
    async (signal) => {
      const [latest, featured, popular, categories, stats] = await Promise.all([
        api(`/blog/posts${queryString({ page, sort, limit: 9 })}`, { signal }),
        api("/blog/posts?featured=1&limit=3&sort=newest", { signal }),
        api("/blog/posts?limit=5&sort=popular", { signal }),
        api("/blog/categories", { signal }),
        api("/blog/stats", { signal }),
      ]);
      return { latest, featured, popular, categories, stats };
    },
    [page, sort]
  );

  const blogJsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "Sathish M — Security Research",
      url: absoluteUrl("/blog"),
      description:
        "Offensive security research, detection engineering, and secure development notes.",
      author: { "@type": "Person", name: "Sathish M" },
    }),
    []
  );

  useSeo({
    title: "Security Research Blog",
    description:
      "Offensive security research, detection engineering, application security, and career notes from Sathish M, cybersecurity researcher and mentor.",
    path: "/blog",
    jsonLd: blogJsonLd,
  });

  const featured = data?.featured?.items?.length ? data.featured.items : data?.latest?.items?.slice(0, 3) || [];
  const [featuredMain, ...featuredSide] = featured;

  const submitSearch = (event) => {
    event.preventDefault();
    const value = query.trim();
    navigate(`/blog/search${value ? `?q=${encodeURIComponent(value)}` : ""}`);
  };

  const changeSort = (next) => {
    navigate(`/blog${queryString({ sort: next === "popular" ? "popular" : "", page: "" })}`);
  };

  return (
    <>
      <section className="blog-hero">
        <div className="blog-container blog-hero-inner">
          <div className="blog-hero-copy">
            <span className="blog-kicker">Security research &amp; engineering</span>
            <h1 className="blog-display">
              Field notes from the attacker's side of the firewall.
            </h1>
            <p className="blog-lead">
              Practical write-ups on offensive security, application hardening, and detection
              engineering. No hype, no exploit-mill content — just the work, the evidence, and the
              defenses that survived.
            </p>
            <form className="blog-hero-search" onSubmit={submitSearch} role="search">
              <SearchIcon size={17} />
              <input
                className="blog-input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search research, tags, or authors…"
                aria-label="Search research"
              />
            </form>
            <div className="blog-hero-actions">
              <button
                type="button"
                className="blog-btn blog-btn-primary"
                onClick={() =>
                  document.getElementById("latest")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                Read the latest <ArrowRight size={15} />
              </button>
              <a className="blog-btn" href={`${API_BASE}/blog/feed.xml`}>
                <RssIcon size={15} /> RSS feed
              </a>
            </div>
          </div>

          <aside className="blog-hero-panel" aria-label="Blog statistics">
            <h2>Publication snapshot</h2>
            <div className="blog-stat-list">
              <div className="blog-stat">
                <strong>{data?.stats?.articles ?? "—"}</strong>
                <span>Published articles</span>
              </div>
              <div className="blog-stat">
                <strong>{formatNumber(data?.stats?.views ?? 0)}</strong>
                <span>Article reads</span>
              </div>
              <div className="blog-stat">
                <strong>{data?.stats?.categories ?? "—"}</strong>
                <span>Research categories</span>
              </div>
              <div className="blog-stat">
                <strong>{data?.stats?.tags ?? "—"}</strong>
                <span>Topics covered</span>
              </div>
            </div>
            <div
              style={{
                marginTop: "1.1rem",
                paddingTop: "1rem",
                borderTop: "1px solid #27272a",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.72rem",
                color: "#71717a",
              }}
            >
              <ShieldIcon size={14} />
              Written and reviewed by a practicing security engineer.
            </div>
          </aside>
        </div>
      </section>

      <div className="blog-container">
        {error && <div style={{ paddingTop: "2.5rem" }}><ErrorState error={error} onRetry={reload} /></div>}

        {!error && (
          <>
            <section className="blog-section" aria-labelledby="featured-title">
              <div className="blog-section-head">
                <div>
                  <span className="blog-kicker">Editor's pick</span>
                  <h2 id="featured-title" className="blog-h2" style={{ marginTop: "0.6rem" }}>
                    Featured research
                  </h2>
                  <p>Longer reads worth your attention first.</p>
                </div>
                <Link to="/blog?sort=popular">Most read <ArrowRight size={12} /></Link>
              </div>

              {loading && !data ? (
                <LoadingState rows={3} />
              ) : (
                <div className="blog-featured">
                  {featuredMain && <PostCard post={featuredMain} variant="featured" />}
                  <div className="blog-featured-side">
                    {featuredSide.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="blog-section" id="latest" aria-labelledby="latest-title">
              <div className="blog-section-head">
                <div>
                  <span className="blog-kicker">The archive</span>
                  <h2 id="latest-title" className="blog-h2" style={{ marginTop: "0.6rem" }}>
                    Latest articles
                  </h2>
                  <p>Newest research, tutorials, and field notes.</p>
                </div>
                <div style={{ display: "flex", gap: "0.35rem" }}>
                  <button
                    type="button"
                    className={`blog-btn blog-btn-sm${sort === "newest" ? " blog-btn-primary" : ""}`}
                    onClick={() => changeSort("newest")}
                    aria-pressed={sort === "newest"}
                  >
                    Newest
                  </button>
                  <button
                    type="button"
                    className={`blog-btn blog-btn-sm${sort === "popular" ? " blog-btn-primary" : ""}`}
                    onClick={() => changeSort("popular")}
                    aria-pressed={sort === "popular"}
                  >
                    Most read
                  </button>
                </div>
              </div>

              <div className="blog-home-columns">
                <div>
                  {loading && !data ? (
                    <LoadingState rows={6} />
                  ) : (
                    <div className="blog-grid blog-latest-grid">
                      {(data?.latest?.items || []).map((post) => (
                        <PostCard key={post.id} post={post} />
                      ))}
                    </div>
                  )}
                  <Pagination
                    page={data?.latest?.pagination?.page || page}
                    totalPages={data?.latest?.pagination?.totalPages || 1}
                    buildTo={(targetPage) => `/blog${queryString({ page: targetPage > 1 ? targetPage : "", sort: sort === "popular" ? "popular" : "" })}`}
                  />
                </div>

                <aside aria-labelledby="popular-title">
                  <h2
                    id="popular-title"
                    style={{
                      fontSize: "0.72rem",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "#71717a",
                      marginBottom: "0.85rem",
                      fontWeight: 700,
                    }}
                  >
                    Most read
                  </h2>
                  <div className="blog-popular">
                    {(data?.popular?.items || []).map((post, index) => (
                      <CompactPost key={post.id} post={post} index={index} />
                    ))}
                  </div>

                  <div className="blog-hero-panel" style={{ marginTop: "1.25rem" }}>
                    <h2>About the author</h2>
                    <p style={{ fontSize: "0.82rem", lineHeight: 1.7, color: "#a1a1aa" }}>
                      Sathish M is a cybersecurity researcher and penetration tester working across
                      web security, Active Directory, and SOC telemetry.
                    </p>
                    <Link to="/blog/author/sathish-m" className="blog-btn blog-btn-sm" style={{ marginTop: "0.9rem" }}>
                      View profile <ArrowRight size={13} />
                    </Link>
                  </div>
                </aside>
              </div>
            </section>

            <section className="blog-section" aria-labelledby="categories-title">
              <div className="blog-section-head">
                <div>
                  <span className="blog-kicker">Browse</span>
                  <h2 id="categories-title" className="blog-h2" style={{ marginTop: "0.6rem" }}>
                    Research categories
                  </h2>
                  <p>Pick a track and go deep.</p>
                </div>
              </div>
              <div className="blog-category-grid">
                {(data?.categories?.items || []).map((category) => (
                  <Link
                    key={category.id}
                    className="blog-category-tile"
                    to={`/blog/category/${category.slug}`}
                  >
                    <strong>{category.name}</strong>
                    <span>{category.description}</span>
                    <em>{category.post_count} article{category.post_count === 1 ? "" : "s"}</em>
                  </Link>
                ))}
              </div>
            </section>

            <NewsletterSection />
            <div style={{ height: "1rem" }} />
          </>
        )}
      </div>
    </>
  );
}
