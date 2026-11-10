import { api, queryString } from "../api";
import { Link, useQuery } from "../router";
import { useApi } from "../useApi";
import { useSeo } from "../seo";
import { PostCard } from "../components/PostCard";
import { Pagination } from "../components/Pagination";
import { ErrorState, LoadingState } from "../components/States";
import { ArrowRight } from "../components/Icons";

export default function BlogCategory({ slug }) {
  const params = useQuery();
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);

  const { data, loading, error, reload } = useApi(
    (signal) => api(`/blog/categories/${encodeURIComponent(slug)}${queryString({ page, limit: 9 })}`, { signal }),
    [slug, page]
  );

  const category = data?.category;

  useSeo({
    title: category ? `${category.name} — Research` : "Category",
    description: category?.description || "Security research by category.",
    path: `/blog/category/${slug}`,
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
            <span style={{ color: "#a1a1aa" }}>{category?.name || slug}</span>
          </nav>
          <span className="blog-kicker">Research category</span>
          <h1>{category?.name || "Category"}</h1>
          <p>{category?.description || "Articles filed under this research track."}</p>
          {data?.pagination && (
            <p className="blog-dim" style={{ fontSize: "0.78rem", marginTop: "0.85rem" }}>
              {data.pagination.total} article{data.pagination.total === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      <div className="blog-container">
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !data ? (
          <LoadingState rows={6} />
        ) : data?.items?.length ? (
          <>
            <div className="blog-grid">
              {data.items.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              buildTo={(target) =>
                `/blog/category/${slug}${queryString({ page: target > 1 ? target : "" })}`
              }
            />
          </>
        ) : (
          <div className="blog-empty">
            <h3>No published articles in this category yet</h3>
            <p>The next write-up is in review.</p>
            <Link className="blog-btn blog-btn-sm" to="/blog">
              Browse all research <ArrowRight size={13} />
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
