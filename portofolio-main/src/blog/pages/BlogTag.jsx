import { api, queryString } from "../api";
import { Link, useQuery } from "../router";
import { useApi } from "../useApi";
import { useSeo } from "../seo";
import { PostCard } from "../components/PostCard";
import { Pagination } from "../components/Pagination";
import { ErrorState, LoadingState } from "../components/States";
import { ArrowRight } from "../components/Icons";

export default function BlogTag({ slug }) {
  const params = useQuery();
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);

  const { data, loading, error, reload } = useApi(
    async (signal) => {
      const [posts, tags] = await Promise.all([
        api(`/blog/tags/${encodeURIComponent(slug)}${queryString({ page, limit: 9 })}`, { signal }),
        api("/blog/tags", { signal }),
      ]);
      return { posts, tag: (tags.items || []).find((item) => item.slug === slug) || null };
    },
    [slug, page]
  );

  const tag = data?.tag;
  const posts = data?.posts;

  useSeo({
    title: tag ? `#${tag.name} — Research` : "Tag",
    description: tag
      ? `Articles tagged ${tag.name} on the security research blog.`
      : "Security research by topic.",
    path: `/blog/tag/${slug}`,
  });

  return (
    <>
      <div className="blog-page-head">
        <div className="blog-container">
          <nav className="blog-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/blog">Blog</Link>
            <span>/</span>
            <span style={{ color: "#a1a1aa" }}>#{tag?.name || slug}</span>
          </nav>
          <span className="blog-kicker">Topic</span>
          <h1>#{tag?.name || slug}</h1>
          <p>Every published article filed under this topic.</p>
          {posts?.pagination && (
            <p className="blog-dim" style={{ fontSize: "0.78rem", marginTop: "0.85rem" }}>
              {posts.pagination.total} article{posts.pagination.total === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      <div className="blog-container">
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !data ? (
          <LoadingState rows={6} />
        ) : posts?.items?.length ? (
          <>
            <div className="blog-grid">
              {posts.items.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
            <Pagination
              page={posts.pagination.page}
              totalPages={posts.pagination.totalPages}
              buildTo={(target) => `/blog/tag/${slug}${queryString({ page: target > 1 ? target : "" })}`}
            />
          </>
        ) : (
          <div className="blog-empty">
            <h3>No articles with this tag yet</h3>
            <p>The archive is still growing.</p>
            <Link className="blog-btn blog-btn-sm" to="/blog">
              Browse all research <ArrowRight size={13} />
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
