import { useEffect, useMemo, useState } from "react";
import { api, formatDate, formatNumber } from "../api";
import { Link, useRouter } from "../router";
import { useApi } from "../useApi";
import { useSeo, articleJsonLd } from "../seo";
import { absoluteUrl, assetUrl } from "../base";
import { Markdown, extractHeadings } from "../markdown";
import { PostCard } from "../components/PostCard";
import { ErrorState } from "../components/States";
import {
  ArrowLeft,
  ArrowRight,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  EyeIcon,
  GithubIcon,
  LinkedinIcon,
  LinkIcon,
  MailIcon,
  XIcon,
} from "../components/Icons";

function ShareButtons({ post, vertical = false }) {
  const [copied, setCopied] = useState(false);
  const url = absoluteUrl(`/blog/${post.slug}`);
  const text = encodeURIComponent(post.title);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const area = document.createElement("textarea");
      area.value = url;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={`blog-share-list${vertical ? " blog-share-list--rail" : ""}`}>
      <a
        href={`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
      >
        <XIcon size={15} />
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on LinkedIn"
      >
        <LinkedinIcon size={15} />
      </a>
      <a href={`mailto:?subject=${text}&body=${encodeURIComponent(url)}`} aria-label="Share by email">
        <MailIcon size={15} />
      </a>
      <button type="button" onClick={copy} aria-label="Copy article link">
        {copied ? <CheckIcon size={15} /> : <LinkIcon size={15} />}
      </button>
    </div>
  );
}

function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(height > 0 ? Math.min(100, (window.scrollY / height) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: 2,
        width: `${progress}%`,
        background: "linear-gradient(90deg, #8b5cf6, #2dd4bf)",
        zIndex: 100,
        transition: "width 0.1s linear",
      }}
    />
  );
}

export default function BlogPost({ slug }) {
  const { navigate } = useRouter();
  const { data, loading, error, reload } = useApi(
    (signal) => api(`/blog/posts/${encodeURIComponent(slug)}`, { signal }),
    [slug]
  );
  const post = data?.post;
  const adjacent = data?.adjacent;

  const related = useApi(
    (signal) =>
      post
        ? api(`/blog/posts/${encodeURIComponent(slug)}/related?limit=3`, { signal })
        : Promise.resolve({ items: [] }),
    [slug, Boolean(post)]
  );

  // The sidebar carries the stories people read next, the way a news desk
  // would rather than a "you might also like" strip under the article.
  const trending = useApi(
    (signal) => api("/blog/posts?limit=5&sort=popular", { signal }),
    []
  );

  const headings = useMemo(() => extractHeadings(post?.content || ""), [post?.content]);
  const [activeId, setActiveId] = useState("");

  useSeo({
    title: post?.meta_title || post?.title || "Article",
    description: post?.meta_description || post?.excerpt,
    path: `/blog/${slug}`,
    image: post?.cover_image,
    type: "article",
    publishedAt: post?.published_at,
    updatedAt: post?.updated_at,
    author: post?.author_name,
    jsonLd: post ? articleJsonLd(post) : undefined,
  });

  useEffect(() => {
    if (!post?.slug) return;
    const key = `blog.viewed.${post.slug}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
    api(`/blog/posts/${encodeURIComponent(post.slug)}/view`, {
      method: "POST",
      body: { source: "article" },
    }).catch(() => {});
  }, [post?.slug]);

  useEffect(() => {
    if (!post) return;
    const elements = Array.from(document.querySelectorAll(".blog-prose h2[id], .blog-prose h3[id]"));
    if (!elements.length || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: [0, 1] }
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [post]);

  if (loading && !post) {
    return (
      <div className="blog-container" style={{ padding: "4rem 1.5rem" }}>
        <div className="blog-skeleton-title" />
        <div className="blog-skeleton-line" />
        <div className="blog-skeleton-line" style={{ width: "70%" }} />
        <div className="blog-skeleton-cover" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="blog-container" style={{ padding: "4rem 1.5rem" }}>
        <ErrorState
          error={error}
          onRetry={reload}
          title={error?.status === 404 ? "Article not found" : "The article could not load"}
        />
      </div>
    );
  }

  return (
    <>
      <ReadingProgress />
      <article className="blog-article">
        <div className="blog-container">
          <nav className="blog-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to="/blog">Blog</Link>
            {post.category_slug && (
              <>
                <span>/</span>
                <Link to={`/blog/category/${post.category_slug}`}>{post.category_name}</Link>
              </>
            )}
            <span>/</span>
            <span style={{ color: "#a1a1aa" }}>{post.title}</span>
          </nav>

          <div className="blog-article-layout">
            <aside className="blog-share-rail" aria-label="Share this article">
              <span className="blog-share-rail-label">Share</span>
              <ShareButtons post={post} vertical />
            </aside>

            <div className="blog-article-main">
              <header className="blog-article-header">
                <h1>{post.title}</h1>
                {post.excerpt && <p className="blog-article-subtitle">{post.excerpt}</p>}

                {/*
                  The news-desk meta row: who wrote it and when on the
                  left, what it is about on the right.
                */}
                <div className="blog-postmeta">
                  <div className="blog-postmeta-left">
                    <Link to={`/blog/author/${post.author_slug}`} className="blog-postmeta-author">
                      {post.author_avatar && (
                        <img className="blog-avatar" src={assetUrl(post.author_avatar)} alt={post.author_name} />
                      )}
                      <strong>{post.author_name}</strong>
                    </Link>
                    <span className="blog-postmeta-item">
                      <CalendarIcon size={13} />
                      <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
                    </span>
                    {post.updated_at && post.updated_at !== post.published_at && (
                      <span className="blog-postmeta-item">Updated {formatDate(post.updated_at)}</span>
                    )}
                    <span className="blog-postmeta-item">
                      <ClockIcon size={13} /> {post.reading_time} min read
                    </span>
                    <span className="blog-postmeta-item">
                      <EyeIcon size={13} /> {formatNumber(post.view_count)} reads
                    </span>
                  </div>

                  <div className="blog-postmeta-tags">
                    {post.category_slug && (
                      <Link className="blog-chip blog-chip-accent" to={`/blog/category/${post.category_slug}`}>
                        {post.category_name}
                      </Link>
                    )}
                    {(post.tags || []).slice(0, 2).map((tag) => (
                      <Link key={tag} className="blog-chip" to={`/blog/search?q=${encodeURIComponent(tag)}`}>
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>
              </header>

              {post.cover_image && (
                <figure className="blog-cover">
                  <img src={assetUrl(post.cover_image)} alt={post.title} />
                  <figcaption>{post.category_name} · {post.title}</figcaption>
                </figure>
              )}

              <Markdown content={post.content} />

              <div className="blog-article-footer">
                <div className="blog-tags">
                  {(post.tags || []).map((tag) => (
                    <Link key={tag} className="blog-chip" to={`/blog/search?q=${encodeURIComponent(tag)}`}>
                      #{tag}
                    </Link>
                  ))}
                </div>

                <div className="blog-author-box">
                  {post.author_avatar && (
                    <img
                      className="blog-avatar blog-avatar-lg"
                      src={assetUrl(post.author_avatar)}
                      alt={post.author_name}
                    />
                  )}
                  <div>
                    <h3>{post.author_name}</h3>
                    <p>{post.author_bio || "Cybersecurity researcher and mentor."}</p>
                    <div className="blog-share-list">
                      <a href="https://github.com/cybok10" target="_blank" rel="noreferrer" aria-label="GitHub">
                        <GithubIcon size={15} />
                      </a>
                      <a href="https://linkedin.com/in/amsathish" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                        <LinkedinIcon size={15} />
                      </a>
                      <a href="mailto:sathish1012cybok@gmail.com" aria-label="Email">
                        <MailIcon size={15} />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="blog-adjacent">
                  {adjacent?.previous ? (
                    <Link to={`/blog/${adjacent.previous.slug}`}>
                      <span><ArrowLeft size={12} /> Previous</span>
                      <strong>{adjacent.previous.title}</strong>
                    </Link>
                  ) : (
                    <span />
                  )}
                  {adjacent?.next && (
                    <Link to={`/blog/${adjacent.next.slug}`} className="next">
                      <span>Next <ArrowRight size={12} /></span>
                      <strong>{adjacent.next.title}</strong>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <aside className="blog-sidebar">
              {headings.length > 1 && (
                <div className="blog-toc">
                  <h2>On this page</h2>
                  <nav aria-label="Table of contents">
                    {headings.map((heading) => (
                      <a
                        key={heading.id}
                        href={`#${heading.id}`}
                        className={`level-${heading.level}${activeId === heading.id ? " active" : ""}`}
                      >
                        {heading.text}
                      </a>
                    ))}
                  </nav>
                </div>
              )}
              <div className="blog-side-block">
                <h2>Top stories this week</h2>
                <ul className="blog-side-list">
                  {(trending.data?.items || [])
                    .filter((item) => item.slug !== post.slug)
                    .slice(0, 5)
                    .map((item) => (
                      <li key={item.id}>
                        <Link to={`/blog/${item.slug}`}>{item.title}</Link>
                        <span className="blog-side-meta">
                          {formatNumber(item.view_count)} reads · {item.reading_time || 1} min
                        </span>
                      </li>
                    ))}
                </ul>
                <Link to="/blog?sort=popular" className="blog-btn blog-btn-sm blog-side-more">
                  Load more <ArrowRight size={12} />
                </Link>
              </div>
            </aside>
          </div>
        </div>

        <div className="blog-container">
          <section className="blog-section" aria-labelledby="related-title">
            <div className="blog-section-head">
              <div>
                <span className="blog-kicker">Keep reading</span>
                <h2 id="related-title" className="blog-h2" style={{ marginTop: "0.6rem" }}>
                  Related research
                </h2>
              </div>
              <button type="button" className="blog-btn blog-btn-sm" onClick={() => navigate("/blog")}>
                All articles <ArrowRight size={13} />
              </button>
            </div>
            {related.data?.items?.length ? (
              <div className="blog-grid">
                {related.data.items.map((item) => (
                  <PostCard key={item.id} post={item} />
                ))}
              </div>
            ) : (
              <p className="blog-muted">More research is on the way.</p>
            )}
          </section>
        </div>
      </article>
    </>
  );
}
