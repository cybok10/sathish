import { assetUrl } from "../base";
import { Link } from "../router";
import { formatDate, formatNumber } from "../api";
import { ClockIcon, EyeIcon, ShieldIcon } from "./Icons";

export function CoverImage({ src, alt, className = "" }) {
  const url = assetUrl(src);
  if (!url) {
    return (
      <div className={`blog-card-media ${className}`} aria-hidden="true">
        <div className="blog-cover-fallback">
          <ShieldIcon size={34} />
        </div>
      </div>
    );
  }
  return (
    <div className={`blog-card-media ${className}`}>
      <img src={url} alt={alt || ""} loading="lazy" decoding="async" />
    </div>
  );
}

export function AuthorLine({ post, size = "sm" }) {
  return (
    <span className="blog-card-meta">
      {post.author_avatar ? (
        <img
          className="blog-avatar"
          src={assetUrl(post.author_avatar)}
          alt={post.author_name || "Author"}
          loading="lazy"
        />
      ) : (
        <span className="blog-avatar" aria-hidden="true" />
      )}
      <span>{post.author_name || "Sathish M"}</span>
      {size === "sm" && <span style={{ color: "#3f3f46" }}>·</span>}
      {size === "sm" && <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>}
    </span>
  );
}

export function PostMeta({ post, showAuthor = true, linked = true }) {
  const category = post.category_slug ? (
    linked ? (
      <Link className="blog-chip blog-chip-accent" to={`/blog/category/${post.category_slug}`}>
        {post.category_name}
      </Link>
    ) : (
      <span className="blog-chip blog-chip-accent">{post.category_name}</span>
    )
  ) : null;
  return (
    <div className="blog-card-meta">
      {category}
      {showAuthor && (
        <>
          <span>{post.author_name || "Sathish M"}</span>
          <span style={{ color: "#3f3f46" }}>·</span>
        </>
      )}
      <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
      <span style={{ color: "#3f3f46" }}>·</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
        <ClockIcon size={12} /> {post.reading_time || 1} min
      </span>
    </div>
  );
}

export function PostCard({ post, variant = "default" }) {
  const className =
    variant === "featured" ? "blog-featured-main" : "blog-card";

  if (variant === "featured") {
    return (
      <Link to={`/blog/${post.slug}`} className={className}>
        <CoverImage src={post.cover_image} alt={post.title} />
        <div className="blog-card-body">
          <PostMeta post={post} showAuthor={false} linked={false} />
          <h2 className="blog-card-title">{post.title}</h2>
          <p className="blog-card-excerpt">{post.excerpt}</p>
          <div className="blog-card-foot">
            <AuthorLine post={post} />
            <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
              <EyeIcon size={12} /> {formatNumber(post.view_count)}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/blog/${post.slug}`} className={className}>
      <CoverImage src={post.cover_image} alt={post.title} />
      <div className="blog-card-body">
        <PostMeta post={post} showAuthor={false} linked={false} />
        <h3 className="blog-card-title">{post.title}</h3>
        <p className="blog-card-excerpt">{post.excerpt}</p>
        <div className="blog-card-foot">
          <AuthorLine post={post} />
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
            <EyeIcon size={12} /> {formatNumber(post.view_count)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function CompactPost({ post, index }) {
  return (
    <Link className="blog-popular-item" to={`/blog/${post.slug}`}>
      <span className="blog-popular-index">{String(index + 1).padStart(2, "0")}</span>
      <h3>{post.title}</h3>
      <span className="blog-popular-views">{formatNumber(post.view_count)} views</span>
    </Link>
  );
}

export function PostSkeleton() {
  return (
    <div className="blog-card" aria-hidden="true">
      <div className="blog-card-media" style={{ background: "#121216" }} />
      <div className="blog-card-body">
        <div style={{ height: 10, width: "42%", background: "#1f1f24", borderRadius: 4 }} />
        <div style={{ height: 18, width: "92%", background: "#1f1f24", borderRadius: 4 }} />
        <div style={{ height: 12, width: "100%", background: "#18181b", borderRadius: 4 }} />
        <div style={{ height: 12, width: "74%", background: "#18181b", borderRadius: 4 }} />
      </div>
    </div>
  );
}
