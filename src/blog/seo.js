import { useEffect } from "react";
import { absoluteUrl, assetUrl } from "./base";

function resolveImage(image) {
  const value = String(image || "").trim();
  if (!value) return "";
  if (/^https?:/i.test(value)) return value;
  const asset = assetUrl(value);
  return /^https?:/i.test(asset) ? asset : absoluteUrl(asset);
}

function upsertMeta(selector, attrs) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, value);
  }
  return element;
}

function upsertLink(rel, href) {
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

/**
 * Sets per-page SEO metadata. Existing portfolio pages do not use this, so
 * their <head> is untouched. Cleanup removes only the article JSON-LD.
 */
export function useSeo({
  title,
  description,
  path,
  image = "/assets/sathish/images/3d/cyber_shield_3d.jpg",
  type = "website",
  publishedAt,
  updatedAt,
  author = "Sathish M",
  jsonLd,
  noIndex = false,
}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | Sathish M — Security Research` : "Blog | Sathish M — Security Research";
    const canonical = absoluteUrl(path || "/blog");
    const imageUrl = resolveImage(image);
    const desc = description || "Offensive security research, detection engineering, and secure development notes by Sathish M.";

    document.title = fullTitle;
    upsertMeta('meta[name="description"]', { name: "description", content: desc });
    upsertMeta('meta[name="robots"]', {
      name: "robots",
      content: noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large",
    });
    upsertLink("canonical", canonical);

    upsertMeta('meta[property="og:type"]', { property: "og:type", content: type });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: fullTitle });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: desc });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: imageUrl });
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: "Sathish M — Security Research" });

    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: fullTitle });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: desc });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: imageUrl });
    upsertMeta('meta[name="author"]', { name: "author", content: author });

    if (publishedAt) {
      upsertMeta('meta[property="article:published_time"]', {
        property: "article:published_time",
        content: publishedAt,
      });
    }
    if (updatedAt) {
      upsertMeta('meta[property="article:modified_time"]', {
        property: "article:modified_time",
        content: updatedAt,
      });
    }

    let script = document.getElementById("blog-jsonld");
    if (jsonLd) {
      if (!script) {
        script = document.createElement("script");
        script.id = "blog-jsonld";
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    } else if (script) {
      script.remove();
    }

    return () => {
      const element = document.getElementById("blog-jsonld");
      if (element) element.remove();
    };
  }, [title, description, path, image, type, publishedAt, updatedAt, author, jsonLd, noIndex]);
}

export function articleJsonLd(post) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.meta_title || post.title,
    description: post.meta_description || post.excerpt,
    image: post.cover_image ? [resolveImage(post.cover_image)] : undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: {
      "@type": "Person",
      name: post.author_name || "Sathish M",
      url: absoluteUrl(`/blog/author/${post.author_slug || "sathish-m"}`),
    },
    publisher: {
      "@type": "Organization",
      name: "Sathish M — Security Research",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(`/blog/${post.slug}`),
    },
    articleSection: post.category_name || undefined,
    keywords: post.tags?.join(", "),
    wordCount: post.reading_time ? post.reading_time * 200 : undefined,
  };
}
