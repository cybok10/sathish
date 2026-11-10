import { api, formatNumber, queryString } from "../api";
import { Link, useQuery } from "../router";
import { useApi } from "../useApi";
import { useSeo } from "../seo";
import { assetUrl } from "../base";
import { PostCard } from "../components/PostCard";
import { Pagination } from "../components/Pagination";
import { ErrorState, LoadingState } from "../components/States";
import { GithubIcon, LinkedinIcon, MailIcon, ArrowRight } from "../components/Icons";

export default function BlogAuthor({ slug }) {
  const params = useQuery();
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);

  const { data, loading, error, reload } = useApi(
    (signal) => api(`/blog/authors/${encodeURIComponent(slug)}${queryString({ page, limit: 9 })}`, { signal }),
    [slug, page]
  );

  const author = data?.author;

  useSeo({
    title: author ? `${author.name} — Author` : "Author",
    description: author?.bio || "Security researcher profile.",
    path: `/blog/author/${slug}`,
    image: author?.avatar_url,
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
            <span style={{ color: "#a1a1aa" }}>{author?.name || slug}</span>
          </nav>
          <div className="blog-author-head">
            {author?.avatar_url ? (
              <img className="blog-avatar blog-avatar-xl" src={assetUrl(author.avatar_url)} alt={author.name} />
            ) : (
              <div className="blog-avatar blog-avatar-xl" aria-hidden="true" />
            )}
            <div style={{ flex: 1, minWidth: 240 }}>
              <span className="blog-kicker">Author</span>
              <h1 style={{ marginTop: "0.5rem", marginBottom: "0.5rem" }}>{author?.name || "Author"}</h1>
              <p>{author?.role}</p>
              {author?.bio && <p style={{ marginTop: "0.6rem" }}>{author.bio}</p>}
              <div className="blog-share-list">
                {author?.github && (
                  <a href={author.github} target="_blank" rel="noreferrer" aria-label="GitHub">
                    <GithubIcon size={15} />
                  </a>
                )}
                {author?.linkedin && (
                  <a href={author.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn">
                    <LinkedinIcon size={15} />
                  </a>
                )}
                {author?.email && (
                  <a href={`mailto:${author.email}`} aria-label="Email">
                    <MailIcon size={15} />
                  </a>
                )}
              </div>
              <p className="blog-dim" style={{ fontSize: "0.78rem", marginTop: "0.85rem" }}>
                {formatNumber(data?.pagination?.total || 0)} published article
                {(data?.pagination?.total || 0) === 1 ? "" : "s"}
              </p>
            </div>
          </div>
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
                `/blog/author/${slug}${queryString({ page: target > 1 ? target : "" })}`
              }
            />
          </>
        ) : (
          <div className="blog-empty">
            <h3>No published articles yet</h3>
            <Link className="blog-btn blog-btn-sm" to="/blog">
              Browse all research <ArrowRight size={13} />
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
