import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config, ALLOWED_UPLOAD_TYPES } from "./config.js";
import { getDatabase } from "./db.js";
import {
  clearCookie,
  createSession,
  destroySession,
  ensureAdmin,
  getSession,
  requireAdmin,
  sessionCookie,
  verifyPassword,
} from "./auth.js";
import {
  HttpError,
  assert,
  clamp,
  createRateLimiter,
  escapeHtml,
  getClientIp,
  isEmail,
  nowIso,
  parseJsonBody,
  readingTime,
  safeHttpUrl,
  sendJson,
  sendText,
  slugify,
  stripMarkdown,
  toBool,
  toInt,
  toIso,
} from "./utils.js";

const POST_COLUMNS = `
  b.id, b.title, b.slug, b.excerpt, b.cover_image, b.status, b.is_featured,
  b.view_count, b.reading_time, b.published_at, b.created_at, b.updated_at,
  b.meta_title, b.meta_description, b.author_id, b.category_id,
  a.name AS author_name, a.slug AS author_slug, a.avatar_url AS author_avatar,
  a.role AS author_role, a.bio AS author_bio,
  c.name AS category_name, c.slug AS category_slug`;

const POST_JOINS = `
  FROM blogs b
  LEFT JOIN authors a ON a.id = b.author_id
  LEFT JOIN categories c ON c.id = b.category_id`;

const TAGS_SUBQUERY = `(
  SELECT GROUP_CONCAT(t.name, '||')
  FROM blog_tags bt JOIN tags t ON t.id = bt.tag_id
  WHERE bt.blog_id = b.id
) AS tag_names`;

const TAGS_IDS_SUBQUERY = `(
  SELECT GROUP_CONCAT(t.id, ',')
  FROM blog_tags bt JOIN tags t ON t.id = bt.tag_id
  WHERE bt.blog_id = b.id
) AS tag_ids`;

function tagList(value) {
  if (!value) return [];
  return String(value)
    .split("||")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function mapPost(row, { withContent = false } = {}) {
  if (!row) return null;
  const post = {
    ...row,
    is_featured: Boolean(row.is_featured),
    tags: tagList(row.tag_names),
    tag_ids: row.tag_ids
      ? String(row.tag_ids).split(",").map((id) => Number(id)).filter(Boolean)
      : [],
  };
  delete post.tag_names;
  if (!withContent) delete post.tag_ids;
  return post;
}

function publicPostClause(alias = "b") {
  return `(${alias}.status = 'published' OR (${alias}.status = 'scheduled' AND ${alias}.published_at IS NOT NULL AND ${alias}.published_at <= ?))`;
}

function publishDueScheduled(db, now = nowIso()) {
  db.prepare(
    "UPDATE blogs SET status = 'published' WHERE status = 'scheduled' AND published_at IS NOT NULL AND published_at <= ?"
  ).run(now);
}

function uniqueSlug(db, base, excludeId = null) {
  const root = slugify(base, "post");
  let candidate = root;
  let suffix = 2;
  const check = db.prepare("SELECT id FROM blogs WHERE slug = ? AND id IS NOT ?");
  while (check.get(candidate, excludeId)) {
    candidate = `${root}-${suffix}`;
    suffix += 1;
    if (suffix > 9999) {
      candidate = `${root}-${crypto.randomBytes(3).toString("hex")}`;
      break;
    }
  }
  return candidate;
}

function uniqueTaxonomySlug(db, table, name) {
  const root = slugify(name, "item");
  let candidate = root;
  let suffix = 2;
  const check = db.prepare(`SELECT id FROM ${table} WHERE slug = ?`);
  while (check.get(candidate)) {
    candidate = `${root}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function setPostTags(db, blogId, tags) {
  const normalized = [...new Set(
    (Array.isArray(tags) ? tags : [])
      .map((tag) => String(tag).trim())
      .filter(Boolean)
      .slice(0, 8)
  )];

  db.prepare("DELETE FROM blog_tags WHERE blog_id = ?").run(blogId);
  const upsert = db.prepare(
    "INSERT INTO tags (name, slug) VALUES (?, ?) ON CONFLICT(slug) DO UPDATE SET name = excluded.name"
  );
  const find = db.prepare("SELECT id FROM tags WHERE slug = ?");
  const link = db.prepare("INSERT OR IGNORE INTO blog_tags (blog_id, tag_id) VALUES (?, ?)");

  for (const tag of normalized) {
    const slug = slugify(tag, "tag");
    upsert.run(tag.slice(0, 40), slug);
    const row = find.get(slug);
    if (row) link.run(blogId, row.id);
  }
}

function validatePostPayload(payload, { partial = false } = {}) {
  const out = {};

  if (!partial || payload.title !== undefined) {
    assert(typeof payload.title === "string" && payload.title.trim().length >= 3, 400, "Title must be at least 3 characters");
    assert(payload.title.trim().length <= 160, 400, "Title is too long");
    out.title = payload.title.trim();
  }

  if (!partial || payload.content !== undefined) {
    assert(typeof payload.content === "string", 400, "Content must be a string");
    assert(payload.content.length <= 400_000, 400, "Content is too large");
    out.content = payload.content;
  }

  if (payload.slug !== undefined) {
    out.slug = slugify(payload.slug, "post");
  }

  if (payload.excerpt !== undefined) {
    assert(typeof payload.excerpt === "string", 400, "Excerpt must be a string");
    out.excerpt = payload.excerpt.trim().slice(0, 320);
  }

  if (payload.cover_image !== undefined) {
    const value = String(payload.cover_image || "").trim();
    const allowed =
      !value ||
      value.startsWith("/assets/") ||
      value.startsWith("/api/uploads/") ||
      Boolean(safeHttpUrl(value));
    assert(allowed, 400, "Cover image must be a local asset, upload, or https URL");
    out.cover_image = value;
  }

  if (payload.author_id !== undefined) {
    out.author_id = payload.author_id === null ? null : toInt(payload.author_id, 0);
  }
  if (payload.category_id !== undefined) {
    out.category_id = payload.category_id === null ? null : toInt(payload.category_id, 0);
  }

  if (payload.meta_title !== undefined) {
    out.meta_title = String(payload.meta_title || "").trim().slice(0, 160);
  }
  if (payload.meta_description !== undefined) {
    out.meta_description = String(payload.meta_description || "").trim().slice(0, 320);
  }

  if (payload.status !== undefined) {
    assert(
      ["draft", "published", "scheduled"].includes(payload.status),
      400,
      "Invalid status"
    );
    out.status = payload.status;
  }

  if (payload.is_featured !== undefined) {
    out.is_featured = toBool(payload.is_featured) ? 1 : 0;
  }

  if (payload.published_at !== undefined) {
    out.published_at = payload.published_at ? toIso(payload.published_at) : null;
    assert(payload.published_at === null || payload.published_at === "" || out.published_at, 400, "Invalid publication date");
  }

  if (payload.tags !== undefined) {
    assert(Array.isArray(payload.tags), 400, "Tags must be an array");
    out.tags = payload.tags;
  }

  return out;
}

function buildRss(posts) {
  const base = `${config.siteUrl}${config.basePath}/blog`;
  const updated = posts[0]?.published_at || nowIso();
  const items = posts
    .map((post) => {
      const link = `${base}/${encodeURIComponent(post.slug)}`;
      return `    <item>
      <title>${escapeHtml(post.title)}</title>
      <link>${escapeHtml(link)}</link>
      <guid isPermaLink="true">${escapeHtml(link)}</guid>
      <pubDate>${new Date(post.published_at || post.created_at).toUTCString()}</pubDate>
      <description>${escapeHtml(post.excerpt || stripMarkdown(post.content, 280))}</description>
      <category>${escapeHtml(post.category_name || "Security")}</category>
    </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Sathish M — Security Research Blog</title>
    <link>${escapeHtml(base)}</link>
    <description>Offensive security research, detection engineering, and secure development by Sathish M.</description>
    <language>en</language>
    <lastBuildDate>${new Date(updated).toUTCString()}</lastBuildDate>
    <atom:link href="${escapeHtml(`${base}/feed.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}

function buildSitemap(db) {
  const base = `${config.siteUrl}${config.basePath}`;
  const now = nowIso();
  const posts = db
    .prepare(
      `SELECT b.slug, b.updated_at, b.published_at FROM blogs b WHERE ${publicPostClause()} ORDER BY b.published_at DESC`
    )
    .all(now);
  const categories = db
    .prepare(
      `SELECT c.slug, MAX(COALESCE(b.updated_at, b.created_at)) AS updated
       FROM categories c LEFT JOIN blogs b ON b.category_id = c.id
       WHERE EXISTS (SELECT 1 FROM blogs b2 WHERE b2.category_id = c.id AND ${publicPostClause("b2")})
       GROUP BY c.id`
    )
    .all(now);
  const authors = db
    .prepare(
      `SELECT a.slug, MAX(COALESCE(b.updated_at, b.created_at)) AS updated
       FROM authors a LEFT JOIN blogs b ON b.author_id = a.id
       WHERE EXISTS (SELECT 1 FROM blogs b2 WHERE b2.author_id = a.id AND ${publicPostClause("b2")})
       GROUP BY a.id`
    )
    .all(now);

  const urls = [
    { loc: `${base}/`, lastmod: now, priority: "1.0" },
    { loc: `${base}/blog`, lastmod: now, priority: "0.9" },
    ...posts.map((post) => ({
      loc: `${base}/blog/${post.slug}`,
      lastmod: post.updated_at || post.published_at || now,
      priority: "0.8",
    })),
    ...categories.map((category) => ({
      loc: `${base}/blog/category/${category.slug}`,
      lastmod: category.updated || now,
      priority: "0.6",
    })),
    ...authors.map((author) => ({
      loc: `${base}/blog/author/${author.slug}`,
      lastmod: author.updated || now,
      priority: "0.5",
    })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${escapeHtml(url.loc)}</loc>
    <lastmod>${new Date(url.lastmod).toISOString()}</lastmod>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;
}

const UPLOAD_FILENAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|gif)$/;

function detectImageType(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  if (
    buffer.length >= 6 &&
    ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"))
  ) {
    return "image/gif";
  }
  return null;
}

export function createBlogApi() {
  const db = getDatabase();
  ensureAdmin(db);
  publishDueScheduled(db);

  const loginLimit = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 8 });
  const publicLimit = createRateLimiter({ windowMs: 60 * 1000, max: 600 });
  const writeLimit = createRateLimiter({ windowMs: 60 * 1000, max: 120 });
  const uploadLimit = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 40 });
  const newsletterLimit = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5 });

  async function handle(req, res, next) {
    let url;
    try {
      url = new URL(req.url, "http://localhost");
    } catch {
      return sendJson(res, 400, { error: "Invalid URL" });
    }

    if (!url.pathname.startsWith("/api/")) {
      return next ? next() : sendJson(res, 404, { error: "Not found" });
    }

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    const ip = getClientIp(req);
    const method = req.method || "GET";
    const pathname = url.pathname.slice(4) || "/";

    try {
      if (method === "GET" && pathname === "/health") {
        return sendJson(res, 200, { ok: true, time: nowIso() });
      }

      if (!publicLimit(ip)) throw new HttpError(429, "Too many requests");

      if (method !== "GET" && method !== "HEAD") {
        if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
          throw new HttpError(405, "Method not allowed");
        }
      }

      // ---------- Auth ----------
      if (method === "POST" && pathname === "/auth/login") {
        if (!loginLimit(ip)) throw new HttpError(429, "Too many login attempts. Try again later.");
        return await handleLogin(req, res);
      }
      if (method === "POST" && pathname === "/auth/logout") {
        const session = getSession(req, db);
        if (session) destroySession(db, session.token);
        res.setHeader("Set-Cookie", clearCookie(req));
        return sendJson(res, 200, { ok: true });
      }
      if (method === "GET" && pathname === "/auth/me") {
        const session = getSession(req, db);
        if (!session) throw new HttpError(401, "Not authenticated");
        return sendJson(res, 200, {
          admin: {
            id: session.admin_id,
            email: session.email,
            name: session.name,
            role: session.role,
          },
          csrfToken: session.csrf_token,
        });
      }

      // ---------- Public discovery ----------
      if (method === "GET" && pathname === "/blog/posts") {
        return handlePublicPosts(url, res);
      }
      if (method === "GET" && pathname === "/blog/search") {
        return handlePublicPosts(url, res, { forceSearch: true });
      }
      if (method === "GET" && pathname === "/blog/stats") {
        publishDueScheduled(db);
        const now = nowIso();
        const totals = db
          .prepare(
            `SELECT COUNT(*) AS articles, COALESCE(SUM(b.view_count), 0) AS views
             FROM blogs b WHERE ${publicPostClause()}`
          )
          .get(now);
        const categories = db.prepare("SELECT COUNT(*) AS count FROM categories").get().count;
        const authors = db.prepare("SELECT COUNT(*) AS count FROM authors").get().count;
        const tags = db
          .prepare(
            `SELECT COUNT(DISTINCT bt.tag_id) AS count FROM blog_tags bt
             JOIN blogs b ON b.id = bt.blog_id WHERE ${publicPostClause()}`
          )
          .get(now).count;
        return sendJson(res, 200, {
          articles: totals.articles || 0,
          views: totals.views || 0,
          categories,
          authors,
          tags,
          updatedAt: now,
        });
      }
      if (method === "GET" && pathname === "/blog/categories") {
        const rows = db
          .prepare(
            `SELECT c.id, c.name, c.slug, c.description,
                    COUNT(b.id) AS post_count
             FROM categories c
             LEFT JOIN blogs b ON b.category_id = c.id AND ${publicPostClause("b")}
             GROUP BY c.id
             ORDER BY c.name`
          )
          .all(nowIso());
        return sendJson(res, 200, { items: rows });
      }
      if (method === "GET" && pathname === "/blog/tags") {
        const rows = db
          .prepare(
            `SELECT t.id, t.name, t.slug, COUNT(bt.blog_id) AS post_count
             FROM tags t
             LEFT JOIN blog_tags bt ON bt.tag_id = t.id
             LEFT JOIN blogs b ON b.id = bt.blog_id AND ${publicPostClause("b")}
             GROUP BY t.id HAVING post_count > 0
             ORDER BY post_count DESC, t.name`
          )
          .all(nowIso());
        return sendJson(res, 200, { items: rows });
      }
      if (method === "GET" && pathname === "/blog/authors") {
        const rows = db
          .prepare(
            `SELECT a.id, a.name, a.slug, a.role, a.bio, a.avatar_url, a.github, a.linkedin, a.twitter,
                    COUNT(b.id) AS post_count
             FROM authors a
             LEFT JOIN blogs b ON b.author_id = a.id AND ${publicPostClause("b")}
             GROUP BY a.id
             ORDER BY a.name`
          )
          .all(nowIso());
        return sendJson(res, 200, { items: rows });
      }
      if (method === "GET" && pathname === "/blog/feed.xml") {
        return handleFeed(res);
      }
      if (method === "GET" && pathname === "/blog/sitemap.xml") {
        return handleSitemap(res);
      }
      if (method === "POST" && pathname === "/blog/newsletter") {
        return await handleNewsletter(req, res, ip);
      }

      let match = pathname.match(/^\/blog\/posts\/([^/]+)\/related$/);
      if (method === "GET" && match) {
        return handleRelated(decodeURIComponent(match[1]), url, res);
      }
      match = pathname.match(/^\/blog\/posts\/([^/]+)\/view$/);
      if (method === "POST" && match) {
        return await handleView(req, res, decodeURIComponent(match[1]), ip);
      }
      match = pathname.match(/^\/blog\/posts\/([^/]+)$/);
      if (method === "GET" && match) {
        return handlePublicPost(decodeURIComponent(match[1]), res);
      }
      match = pathname.match(/^\/blog\/categories\/([^/]+)$/);
      if (method === "GET" && match) {
        return handleCategory(decodeURIComponent(match[1]), url, res);
      }
      match = pathname.match(/^\/blog\/tags\/([^/]+)$/);
      if (method === "GET" && match) {
        const tag = db.prepare("SELECT id, name, slug FROM tags WHERE slug = ?").get(decodeURIComponent(match[1]));
        if (!tag) throw new HttpError(404, "Tag not found");
        url.searchParams.set("tag", tag.slug);
        return handlePublicPosts(url, res);
      }
      match = pathname.match(/^\/blog\/authors\/([^/]+)$/);
      if (method === "GET" && match) {
        return handleAuthor(decodeURIComponent(match[1]), url, res);
      }

      // ---------- Uploaded files ----------
      match = pathname.match(/^\/uploads\/([^/]+)$/);
      if (method === "GET" && match) {
        return handleUploadedFile(decodeURIComponent(match[1]), res);
      }

      // ---------- Admin ----------
      if (pathname === "/admin/stats" && method === "GET") {
        if (!requireAdmin(req, res, db)) return;
        return handleStats(res);
      }
      if (pathname === "/admin/posts" && method === "GET") {
        if (!requireAdmin(req, res, db)) return;
        return handleAdminPosts(url, res);
      }
      if (pathname === "/admin/posts" && method === "POST") {
        const session = requireAdmin(req, res, db, { mutating: true });
        if (!session) return;
        if (!writeLimit(ip)) throw new HttpError(429, "Too many writes");
        return await handleCreatePost(req, res);
      }
      if (pathname === "/admin/posts/export" && method === "GET") {
        if (!requireAdmin(req, res, db)) return;
        return handleExport(res);
      }
      match = pathname.match(/^\/admin\/posts\/(\d+)$/);
      if (match) {
        const id = Number(match[1]);
        if (method === "GET") {
          if (!requireAdmin(req, res, db)) return;
          return handleAdminPost(id, res);
        }
        if (method === "PUT" || method === "PATCH") {
          const session = requireAdmin(req, res, db, { mutating: true });
          if (!session) return;
          if (!writeLimit(ip)) throw new HttpError(429, "Too many writes");
          return await handleUpdatePost(req, res, id);
        }
        if (method === "DELETE") {
          if (!requireAdmin(req, res, db, { mutating: true })) return;
          return handleDeletePost(id, res);
        }
      }
      match = pathname.match(/^\/admin\/posts\/(\d+)\/(publish|unpublish|feature|unfeature|schedule)$/);
      if (method === "POST" && match) {
        if (!requireAdmin(req, res, db, { mutating: true })) return;
        return await handlePostAction(Number(match[1]), match[2], req, res);
      }
      match = pathname.match(/^\/admin\/(categories|tags|authors)(?:\/(\d+))?$/);
      if (match) {
        const kind = match[1];
        const id = match[2] ? Number(match[2]) : null;
        if (method === "GET") {
          if (!requireAdmin(req, res, db)) return;
          return handleTaxonomyList(kind, res);
        }
        if (!requireAdmin(req, res, db, { mutating: true })) return;
        if (method === "POST" && !id) return await handleTaxonomyCreate(kind, req, res);
        if ((method === "PUT" || method === "PATCH") && id) return await handleTaxonomyUpdate(kind, id, req, res);
        if (method === "DELETE" && id) return handleTaxonomyDelete(kind, id, res);
      }
      if (pathname === "/admin/uploads" && method === "POST") {
        if (!requireAdmin(req, res, db, { mutating: true })) return;
        if (!uploadLimit(ip)) throw new HttpError(429, "Upload limit reached");
        return await handleUpload(req, res);
      }
      match = pathname.match(/^\/admin\/uploads\/([^/]+)$/);
      if (method === "DELETE" && match) {
        if (!requireAdmin(req, res, db, { mutating: true })) return;
        return handleDeleteUpload(decodeURIComponent(match[1]), res);
      }
      if (pathname === "/admin/subscribers" && method === "GET") {
        if (!requireAdmin(req, res, db)) return;
        const items = db
          .prepare("SELECT id, email, status, created_at FROM subscribers ORDER BY created_at DESC LIMIT 500")
          .all();
        return sendJson(res, 200, { items });
      }

      throw new HttpError(404, "API route not found");
    } catch (error) {
      if (error instanceof HttpError) {
        return sendJson(res, error.status, { error: error.message, details: error.details });
      }
      console.error("[blog-api]", error);
      return sendJson(res, 500, {
        error: "Internal server error",
        ...(config.isDev ? { message: String(error?.message || error) } : {}),
      });
    }
  }

  // ---------- handlers ----------

  async function handleLogin(req, res) {
    const body = await parseJsonBody(req, config.maxJsonBytes);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    assert(email && password, 400, "Email and password are required");

    const admin = db.prepare("SELECT * FROM admins WHERE email = ?").get(email);
    if (!admin || !verifyPassword(password, admin.password_hash)) {
      throw new HttpError(401, "Invalid email or password");
    }

    cleanupExpiredSessions();
    const session = createSession(db, admin.id);
    res.setHeader("Set-Cookie", sessionCookie(req, session.token, session.expiresAt));
    return sendJson(res, 200, {
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      csrfToken: session.csrf,
    });
  }

  function cleanupExpiredSessions() {
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(nowIso());
  }

  function handlePublicPosts(url, res, { forceSearch = false } = {}) {
    publishDueScheduled(db);
    const page = clamp(toInt(url.searchParams.get("page"), 1), 1, 10_000);
    const limit = clamp(toInt(url.searchParams.get("limit"), 9), 1, 50);
    const offset = (page - 1) * limit;
    const now = nowIso();
    const where = [publicPostClause()];
    const params = [now];

    const q = (url.searchParams.get("q") || "").trim();
    if (q || forceSearch) {
      const term = `%${q}%`;
      where.push(`(
        b.title LIKE ? OR b.excerpt LIKE ? OR b.content LIKE ? OR
        EXISTS (SELECT 1 FROM categories c2 WHERE c2.id = b.category_id AND c2.name LIKE ?) OR
        EXISTS (SELECT 1 FROM authors a2 WHERE a2.id = b.author_id AND a2.name LIKE ?) OR
        EXISTS (SELECT 1 FROM blog_tags bt2 JOIN tags t2 ON t2.id = bt2.tag_id WHERE bt2.blog_id = b.id AND t2.name LIKE ?)
      )`);
      params.push(term, term, term, term, term, term);
    }

    const category = (url.searchParams.get("category") || "").trim();
    if (category) {
      where.push("c.slug = ?");
      params.push(category);
    }
    const author = (url.searchParams.get("author") || "").trim();
    if (author) {
      where.push("a.slug = ?");
      params.push(author);
    }
    const tag = (url.searchParams.get("tag") || "").trim();
    if (tag) {
      where.push(
        "EXISTS (SELECT 1 FROM blog_tags bt3 JOIN tags t3 ON t3.id = bt3.tag_id WHERE bt3.blog_id = b.id AND t3.slug = ?)"
      );
      params.push(tag);
    }
    const featured = url.searchParams.get("featured");
    if (featured !== null) {
      where.push("b.is_featured = ?");
      params.push(toBool(featured) ? 1 : 0);
    }

    const sort = (url.searchParams.get("sort") || "newest").toLowerCase();
    const orderBy =
      sort === "popular"
        ? "b.view_count DESC, b.published_at DESC"
        : sort === "oldest"
          ? "b.published_at ASC"
          : "b.published_at DESC";

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const total = db
      .prepare(`SELECT COUNT(*) AS count ${POST_JOINS} ${whereSql}`)
      .get(...params).count;

    const rows = db
      .prepare(
        `SELECT ${POST_COLUMNS}, ${TAGS_SUBQUERY}
         ${POST_JOINS} ${whereSql}
         ORDER BY ${orderBy}
         LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    return sendJson(res, 200, {
      items: rows.map((row) => mapPost(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNext: offset + rows.length < total,
        hasPrev: page > 1,
      },
      query: q,
      sort,
    });
  }

  function handlePublicPost(slug, res) {
    publishDueScheduled(db);
    const row = db
      .prepare(
        `SELECT ${POST_COLUMNS}, b.content, ${TAGS_SUBQUERY}
         ${POST_JOINS}
         WHERE b.slug = ? AND ${publicPostClause()}`
      )
      .get(slug, nowIso());
    if (!row) throw new HttpError(404, "Article not found");

    const now = nowIso();
    const previous = db
      .prepare(
        `SELECT title, slug FROM blogs b WHERE ${publicPostClause()} AND published_at < ?
         ORDER BY published_at DESC LIMIT 1`
      )
      .get(now, row.published_at);
    const next = db
      .prepare(
        `SELECT title, slug FROM blogs b WHERE ${publicPostClause()} AND published_at > ?
         ORDER BY published_at ASC LIMIT 1`
      )
      .get(now, row.published_at);

    return sendJson(res, 200, {
      post: mapPost(row, { withContent: true }),
      adjacent: { previous: previous || null, next: next || null },
    });
  }

  function handleRelated(slug, url, res) {
    const limit = clamp(toInt(url.searchParams.get("limit"), 3), 1, 6);
    const post = db
      .prepare(`SELECT id, category_id FROM blogs b WHERE b.slug = ? AND ${publicPostClause()}`)
      .get(slug, nowIso());
    if (!post) throw new HttpError(404, "Article not found");

    const rows = db
      .prepare(
        `SELECT ${POST_COLUMNS}, ${TAGS_SUBQUERY},
          (
            SELECT COUNT(*) FROM blog_tags bt
            WHERE bt.blog_id = b.id AND bt.tag_id IN (SELECT tag_id FROM blog_tags WHERE blog_id = ?)
          ) AS shared_tags
         ${POST_JOINS}
         WHERE b.id != ? AND ${publicPostClause()}
           AND (b.category_id = ? OR EXISTS (
             SELECT 1 FROM blog_tags bt2
             WHERE bt2.blog_id = b.id AND bt2.tag_id IN (SELECT tag_id FROM blog_tags WHERE blog_id = ?)
           ))
         ORDER BY shared_tags DESC, b.view_count DESC, b.published_at DESC
         LIMIT ?`
      )
      .all(post.id, post.id, nowIso(), post.category_id, post.id, limit);

    if (rows.length < limit) {
      const existing = new Set(rows.map((row) => row.id));
      const popular = db
        .prepare(
          `SELECT ${POST_COLUMNS}, ${TAGS_SUBQUERY} ${POST_JOINS}
           WHERE b.id != ? AND ${publicPostClause()}
           ORDER BY b.view_count DESC, b.published_at DESC LIMIT ?`
        )
        .all(post.id, nowIso(), limit);
      for (const row of popular) {
        if (rows.length >= limit) break;
        if (!existing.has(row.id)) {
          rows.push(row);
          existing.add(row.id);
        }
      }
    }
    return sendJson(res, 200, { items: rows.map((row) => mapPost(row)) });
  }

  async function handleView(req, res, slug, ip) {
    const post = db.prepare("SELECT id FROM blogs WHERE slug = ?").get(slug);
    if (!post) throw new HttpError(404, "Article not found");
    const body = await parseJsonBody(req, 4096).catch(() => ({}));
    const source = String(body.source || "web").slice(0, 80);
    const referrer = String(req.headers.referer || "").slice(0, 300);
    db.exec("BEGIN");
    try {
      db.prepare("UPDATE blogs SET view_count = view_count + 1 WHERE id = ?").run(post.id);
      db.prepare("INSERT INTO blog_views (blog_id, created_at, source) VALUES (?, ?, ?)").run(
        post.id,
        nowIso(),
        `${source}|${referrer}|${ip}`.slice(0, 400)
      );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    return sendJson(res, 202, { ok: true });
  }

  function handleCategory(slug, url, res) {
    const category = db
      .prepare("SELECT id, name, slug, description FROM categories WHERE slug = ?")
      .get(slug);
    if (!category) throw new HttpError(404, "Category not found");
    const params = new URLSearchParams(url.searchParams);
    params.set("category", slug);
    const page = clamp(toInt(params.get("page"), 1), 1, 10_000);
    const limit = clamp(toInt(params.get("limit"), 9), 1, 50);
    const now = nowIso();
    const total = db
      .prepare(`SELECT COUNT(*) AS count ${POST_JOINS} WHERE ${publicPostClause()} AND c.slug = ?`)
      .get(now, slug).count;
    const rows = db
      .prepare(
        `SELECT ${POST_COLUMNS}, ${TAGS_SUBQUERY} ${POST_JOINS}
         WHERE ${publicPostClause()} AND c.slug = ?
         ORDER BY b.published_at DESC LIMIT ? OFFSET ?`
      )
      .all(now, slug, limit, (page - 1) * limit);
    return sendJson(res, 200, {
      category,
      items: rows.map((row) => mapPost(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  }

  function handleAuthor(slug, url, res) {
    const author = db
      .prepare(
        "SELECT id, name, slug, role, bio, avatar_url, email, github, linkedin, twitter FROM authors WHERE slug = ?"
      )
      .get(slug);
    if (!author) throw new HttpError(404, "Author not found");
    const page = clamp(toInt(url.searchParams.get("page"), 1), 1, 10_000);
    const limit = clamp(toInt(url.searchParams.get("limit"), 9), 1, 50);
    const now = nowIso();
    const total = db
      .prepare(`SELECT COUNT(*) AS count ${POST_JOINS} WHERE ${publicPostClause()} AND a.slug = ?`)
      .get(now, slug).count;
    const rows = db
      .prepare(
        `SELECT ${POST_COLUMNS}, ${TAGS_SUBQUERY} ${POST_JOINS}
         WHERE ${publicPostClause()} AND a.slug = ?
         ORDER BY b.published_at DESC LIMIT ? OFFSET ?`
      )
      .all(now, slug, limit, (page - 1) * limit);
    return sendJson(res, 200, {
      author,
      items: rows.map((row) => mapPost(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  }

  function handleFeed(res) {
    const posts = db
      .prepare(
        `SELECT ${POST_COLUMNS}, b.content ${POST_JOINS}
         WHERE ${publicPostClause()} ORDER BY b.published_at DESC LIMIT 30`
      )
      .all(nowIso());
    return sendText(res, 200, buildRss(posts), "application/rss+xml; charset=utf-8", {
      "Cache-Control": "public, max-age=300",
    });
  }

  function handleSitemap(res) {
    return sendText(res, 200, buildSitemap(db), "application/xml; charset=utf-8", {
      "Cache-Control": "public, max-age=300",
    });
  }

  async function handleNewsletter(req, res, ip) {
    if (!newsletterLimit(ip)) throw new HttpError(429, "Too many subscribe attempts");
    const body = await parseJsonBody(req, 4096);
    const email = String(body.email || "").trim().toLowerCase();
    assert(isEmail(email), 400, "Enter a valid email address");
    assert(email.length <= 254, 400, "Email is too long");
    const honeypot = String(body.website || "").trim();
    if (honeypot) return sendJson(res, 200, { ok: true });
    db.prepare(
      "INSERT INTO subscribers (email, created_at) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET status = 'active'"
    ).run(email, nowIso());
    return sendJson(res, 201, { ok: true });
  }

  function handleUploadedFile(filename, res) {
    if (!UPLOAD_FILENAME.test(filename)) throw new HttpError(404, "File not found");
    const record = db.prepare("SELECT filename, mime, size FROM uploads WHERE filename = ?").get(filename);
    if (!record) throw new HttpError(404, "File not found");
    const filePath = path.join(config.uploadDir, filename);
    if (!fs.existsSync(filePath)) throw new HttpError(404, "File not found");
    const data = fs.readFileSync(filePath);
    res.writeHead(200, {
      "Content-Type": record.mime,
      "Content-Length": data.length,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'",
    });
    return res.end(data);
  }

  // ---------- admin handlers ----------

  function handleStats(res) {
    publishDueScheduled(db);
    const totals = db
      .prepare(
        `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft,
          SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled,
          COALESCE(SUM(view_count), 0) AS views
        FROM blogs`
      )
      .get();
    const popular = db
      .prepare(`SELECT ${POST_COLUMNS}, ${TAGS_SUBQUERY} ${POST_JOINS} ORDER BY b.view_count DESC LIMIT 5`)
      .all();
    const recent = db
      .prepare(`SELECT ${POST_COLUMNS}, ${TAGS_SUBQUERY} ${POST_JOINS} ORDER BY b.updated_at DESC LIMIT 5`)
      .all();
    const subscribers = db.prepare("SELECT COUNT(*) AS count FROM subscribers WHERE status = 'active'").get().count;
    const categories = db.prepare("SELECT COUNT(*) AS count FROM categories").get().count;
    return sendJson(res, 200, {
      totals: {
        total: totals.total || 0,
        published: totals.published || 0,
        draft: totals.draft || 0,
        scheduled: totals.scheduled || 0,
        views: totals.views || 0,
        subscribers,
        categories,
      },
      popular: popular.map((row) => mapPost(row)),
      recent: recent.map((row) => mapPost(row)),
    });
  }

  function handleAdminPosts(url, res) {
    publishDueScheduled(db);
    const page = clamp(toInt(url.searchParams.get("page"), 1), 1, 10_000);
    const limit = clamp(toInt(url.searchParams.get("limit"), 20), 1, 100);
    const where = ["1 = 1"];
    const params = [];
    const status = url.searchParams.get("status");
    if (status && ["draft", "published", "scheduled"].includes(status)) {
      where.push("b.status = ?");
      params.push(status);
    }
    const q = (url.searchParams.get("q") || "").trim();
    if (q) {
      where.push("(b.title LIKE ? OR b.slug LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }
    const whereSql = where.join(" AND ");
    const total = db.prepare(`SELECT COUNT(*) AS count ${POST_JOINS} WHERE ${whereSql}`).get(...params).count;
    const rows = db
      .prepare(
        `SELECT ${POST_COLUMNS}, ${TAGS_SUBQUERY} ${POST_JOINS}
         WHERE ${whereSql} ORDER BY b.updated_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, (page - 1) * limit);
    return sendJson(res, 200, {
      items: rows.map((row) => mapPost(row)),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  }

  function handleAdminPost(id, res) {
    const row = db
      .prepare(
        `SELECT ${POST_COLUMNS}, b.content, ${TAGS_SUBQUERY}, ${TAGS_IDS_SUBQUERY}
         ${POST_JOINS} WHERE b.id = ?`
      )
      .get(id);
    if (!row) throw new HttpError(404, "Article not found");
    return sendJson(res, 200, { post: mapPost(row, { withContent: true }) });
  }

  function validateRelations(payload) {
    if (payload.author_id) {
      const author = db.prepare("SELECT id FROM authors WHERE id = ?").get(payload.author_id);
      assert(author, 400, "Selected author does not exist");
    }
    if (payload.category_id) {
      const category = db.prepare("SELECT id FROM categories WHERE id = ?").get(payload.category_id);
      assert(category, 400, "Selected category does not exist");
    }
  }

  async function handleCreatePost(req, res) {
    const body = await parseJsonBody(req, config.maxJsonBytes);
    const data = validatePostPayload(body);
    validateRelations(data);

    const now = nowIso();
    const status = data.status || "draft";
    let publishedAt = data.published_at ?? null;
    if (status === "published" && !publishedAt) publishedAt = now;
    if (status === "scheduled") {
      assert(publishedAt && Date.parse(publishedAt) > Date.now(), 400, "Scheduled posts need a future date");
    }
    if (status !== "scheduled" && publishedAt && publishedAt === "invalid") {
      throw new HttpError(400, "Invalid publication date");
    }

    const slug = uniqueSlug(db, data.slug || data.title);
    const excerpt = data.excerpt || stripMarkdown(data.content, 220);
    const metaTitle = data.meta_title || data.title;
    const metaDescription = data.meta_description || excerpt.slice(0, 160);

    const result = db
      .prepare(
        `INSERT INTO blogs (
          title, slug, excerpt, content, cover_image, author_id, category_id,
          status, is_featured, view_count, reading_time, published_at,
          created_at, updated_at, meta_title, meta_description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.title,
        slug,
        excerpt,
        data.content,
        data.cover_image || "",
        data.author_id || null,
        data.category_id || null,
        status,
        data.is_featured || 0,
        readingTime(data.content),
        publishedAt,
        now,
        now,
        metaTitle,
        metaDescription
      );

    const id = Number(result.lastInsertRowid);
    setPostTags(db, id, data.tags || []);
    return handleAdminPost(id, res);
  }

  async function handleUpdatePost(req, res, id) {
    const existing = db.prepare("SELECT * FROM blogs WHERE id = ?").get(id);
    if (!existing) throw new HttpError(404, "Article not found");
    const body = await parseJsonBody(req, config.maxJsonBytes);
    const data = validatePostPayload(body, { partial: true });
    validateRelations(data);

    const nextStatus = data.status ?? existing.status;
    let nextPublishedAt = data.published_at !== undefined ? data.published_at : existing.published_at;
    if (nextStatus === "published" && !nextPublishedAt) nextPublishedAt = nowIso();
    if (nextStatus === "scheduled") {
      assert(nextPublishedAt && Date.parse(nextPublishedAt) > Date.now(), 400, "Scheduled posts need a future date");
    }

    const nextSlug =
      data.slug && data.slug !== existing.slug
        ? uniqueSlug(db, data.slug, id)
        : existing.slug;

    const fields = {
      title: data.title ?? existing.title,
      slug: nextSlug,
      excerpt: data.excerpt ?? existing.excerpt,
      content: data.content ?? existing.content,
      cover_image: data.cover_image ?? existing.cover_image,
      author_id: data.author_id !== undefined ? data.author_id : existing.author_id,
      category_id: data.category_id !== undefined ? data.category_id : existing.category_id,
      status: nextStatus,
      is_featured: data.is_featured !== undefined ? data.is_featured : existing.is_featured,
      published_at: nextPublishedAt,
      meta_title: data.meta_title ?? existing.meta_title,
      meta_description: data.meta_description ?? existing.meta_description,
      reading_time: readingTime(data.content ?? existing.content),
      updated_at: nowIso(),
    };

    if (!fields.excerpt && fields.content) fields.excerpt = stripMarkdown(fields.content, 220);
    if (!fields.meta_title) fields.meta_title = fields.title;
    if (!fields.meta_description) fields.meta_description = String(fields.excerpt || "").slice(0, 160);

    db.prepare(
      `UPDATE blogs SET
        title = ?, slug = ?, excerpt = ?, content = ?, cover_image = ?,
        author_id = ?, category_id = ?, status = ?, is_featured = ?,
        reading_time = ?, published_at = ?, updated_at = ?, meta_title = ?, meta_description = ?
       WHERE id = ?`
    ).run(
      fields.title,
      fields.slug,
      fields.excerpt,
      fields.content,
      fields.cover_image,
      fields.author_id,
      fields.category_id,
      fields.status,
      fields.is_featured,
      fields.reading_time,
      fields.published_at,
      fields.updated_at,
      fields.meta_title,
      fields.meta_description,
      id
    );

    if (data.tags !== undefined) setPostTags(db, id, data.tags);
    return handleAdminPost(id, res);
  }

  function handleDeletePost(id, res) {
    const result = db.prepare("DELETE FROM blogs WHERE id = ?").run(id);
    if (!result.changes) throw new HttpError(404, "Article not found");
    return sendJson(res, 200, { ok: true, id });
  }

  async function handlePostAction(id, action, req, res) {
    const post = db.prepare("SELECT id, status, published_at FROM blogs WHERE id = ?").get(id);
    if (!post) throw new HttpError(404, "Article not found");
    const body = await parseJsonBody(req, 4096).catch(() => ({}));

    if (action === "publish") {
      const publishedAt = post.published_at || nowIso();
      db.prepare("UPDATE blogs SET status = 'published', published_at = ?, updated_at = ? WHERE id = ?").run(
        publishedAt,
        nowIso(),
        id
      );
    } else if (action === "unpublish") {
      db.prepare("UPDATE blogs SET status = 'draft', updated_at = ? WHERE id = ?").run(nowIso(), id);
    } else if (action === "feature" || action === "unfeature") {
      db.prepare("UPDATE blogs SET is_featured = ?, updated_at = ? WHERE id = ?").run(
        action === "feature" ? 1 : 0,
        nowIso(),
        id
      );
    } else if (action === "schedule") {
      const when = toIso(body.published_at);
      assert(when && Date.parse(when) > Date.now(), 400, "Provide a future publication date");
      db.prepare("UPDATE blogs SET status = 'scheduled', published_at = ?, updated_at = ? WHERE id = ?").run(
        when,
        nowIso(),
        id
      );
    }
    return handleAdminPost(id, res);
  }

  function handleExport(res) {
    const posts = db
      .prepare(`SELECT ${POST_COLUMNS}, b.content, ${TAGS_SUBQUERY} ${POST_JOINS} ORDER BY b.updated_at DESC`)
      .all();
    const payload = JSON.stringify(
      { exported_at: nowIso(), posts: posts.map((row) => mapPost(row, { withContent: true })) },
      null,
      2
    );
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="blog-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    });
    return res.end(payload);
  }

  const TAXONOMY = {
    categories: { table: "categories", label: "Category" },
    tags: { table: "tags", label: "Tag" },
    authors: { table: "authors", label: "Author" },
  };

  function handleTaxonomyList(kind, res) {
    const configItem = TAXONOMY[kind];
    if (!configItem) throw new HttpError(404, "Unknown taxonomy");
    if (kind === "categories") {
      const items = db
        .prepare(
          `SELECT c.*, (SELECT COUNT(*) FROM blogs b WHERE b.category_id = c.id) AS post_count
           FROM categories c ORDER BY c.name`
        )
        .all();
      return sendJson(res, 200, { items });
    }
    if (kind === "tags") {
      const items = db
        .prepare(
          `SELECT t.*, (SELECT COUNT(*) FROM blog_tags bt WHERE bt.tag_id = t.id) AS post_count
           FROM tags t ORDER BY t.name`
        )
        .all();
      return sendJson(res, 200, { items });
    }
    const items = db
      .prepare(
        `SELECT a.*, (SELECT COUNT(*) FROM blogs b WHERE b.author_id = a.id) AS post_count
         FROM authors a ORDER BY a.name`
      )
      .all();
    return sendJson(res, 200, { items });
  }

  async function handleTaxonomyCreate(kind, req, res) {
    const configItem = TAXONOMY[kind];
    if (!configItem) throw new HttpError(404, "Unknown taxonomy");
    const body = await parseJsonBody(req, 64 * 1024);
    const name = String(body.name || "").trim();
    assert(name.length >= 2 && name.length <= 80, 400, "Name must be 2-80 characters");

    if (kind === "categories") {
      const slug = slugify(body.slug || name, "category");
      const exists = db.prepare("SELECT id FROM categories WHERE slug = ?").get(slug);
      assert(!exists, 409, "A category with this slug already exists");
      const result = db
        .prepare("INSERT INTO categories (name, slug, description, created_at) VALUES (?, ?, ?, ?)")
        .run(name, slug, String(body.description || "").slice(0, 300), nowIso());
      return sendJson(res, 201, {
        item: db.prepare("SELECT * FROM categories WHERE id = ?").get(Number(result.lastInsertRowid)),
      });
    }
    if (kind === "tags") {
      const slug = slugify(body.slug || name, "tag");
      db.prepare("INSERT INTO tags (name, slug) VALUES (?, ?) ON CONFLICT(slug) DO UPDATE SET name = excluded.name").run(
        name,
        slug
      );
      return sendJson(res, 201, { item: db.prepare("SELECT * FROM tags WHERE slug = ?").get(slug) });
    }

    const slug = slugify(body.slug || name, "author");
    const exists = db.prepare("SELECT id FROM authors WHERE slug = ?").get(slug);
    assert(!exists, 409, "An author with this slug already exists");
    const result = db
      .prepare(
        `INSERT INTO authors (name, slug, role, bio, avatar_url, email, github, linkedin, twitter, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name,
        slug,
        String(body.role || "").slice(0, 120),
        String(body.bio || "").slice(0, 2000),
        safeHttpUrl(body.avatar_url) || String(body.avatar_url || "").startsWith("/assets/") || String(body.avatar_url || "").startsWith("/api/uploads/")
          ? String(body.avatar_url)
          : "",
        String(body.email || "").slice(0, 160),
        safeHttpUrl(body.github) || "",
        safeHttpUrl(body.linkedin) || "",
        safeHttpUrl(body.twitter) || "",
        nowIso()
      );
    return sendJson(res, 201, {
      item: db.prepare("SELECT * FROM authors WHERE id = ?").get(Number(result.lastInsertRowid)),
    });
  }

  async function handleTaxonomyUpdate(kind, id, req, res) {
    const configItem = TAXONOMY[kind];
    if (!configItem) throw new HttpError(404, "Unknown taxonomy");
    const body = await parseJsonBody(req, 64 * 1024);
    const existing = db.prepare(`SELECT * FROM ${configItem.table} WHERE id = ?`).get(id);
    if (!existing) throw new HttpError(404, `${configItem.label} not found`);

    if (kind === "categories") {
      const name = body.name !== undefined ? String(body.name).trim() : existing.name;
      assert(name.length >= 2 && name.length <= 80, 400, "Name must be 2-80 characters");
      const slug = body.slug ? uniqueTaxonomySlug(db, "categories", body.slug) : existing.slug;
      db.prepare("UPDATE categories SET name = ?, slug = ?, description = ? WHERE id = ?").run(
        name,
        slug,
        body.description !== undefined ? String(body.description).slice(0, 300) : existing.description,
        id
      );
    } else if (kind === "tags") {
      const name = body.name !== undefined ? String(body.name).trim() : existing.name;
      assert(name.length >= 2 && name.length <= 80, 400, "Name must be 2-80 characters");
      db.prepare("UPDATE tags SET name = ? WHERE id = ?").run(name, id);
    } else {
      const fields = ["name", "role", "bio", "avatar_url", "email", "github", "linkedin", "twitter"];
      const values = fields.map((field) => {
        if (body[field] === undefined) return existing[field];
        const raw = String(body[field] || "").slice(0, field === "bio" ? 2000 : 300);
        if (field === "avatar_url") {
          return safeHttpUrl(raw) || raw.startsWith("/assets/") || raw.startsWith("/api/uploads/") ? raw : "";
        }
        if (field === "github" || field === "linkedin" || field === "twitter") {
          return safeHttpUrl(raw) || "";
        }
        return raw;
      });
      db.prepare(
        `UPDATE authors SET name = ?, role = ?, bio = ?, avatar_url = ?, email = ?, github = ?, linkedin = ?, twitter = ? WHERE id = ?`
      ).run(...values, id);
    }
    return sendJson(res, 200, {
      item: db.prepare(`SELECT * FROM ${configItem.table} WHERE id = ?`).get(id),
    });
  }

  function handleTaxonomyDelete(kind, id, res) {
    const configItem = TAXONOMY[kind];
    if (!configItem) throw new HttpError(404, "Unknown taxonomy");
    const result = db.prepare(`DELETE FROM ${configItem.table} WHERE id = ?`).run(id);
    if (!result.changes) throw new HttpError(404, `${configItem.label} not found`);
    return sendJson(res, 200, { ok: true, id });
  }

  async function handleUpload(req, res) {
    const body = await parseJsonBody(req, config.maxUploadBytes + 512 * 1024);
    const filename = String(body.filename || "image");
    const encoded = String(body.dataBase64 || "");
    assert(encoded, 400, "Missing file data");
    const buffer = Buffer.from(encoded, "base64");
    assert(buffer.length > 0, 400, "Empty file");
    assert(buffer.length <= config.maxUploadBytes, 413, "Image exceeds the 5 MB limit");

    const detected = detectImageType(buffer);
    assert(detected && ALLOWED_UPLOAD_TYPES.has(detected), 415, "Only PNG, JPEG, WebP, or GIF images are allowed");

    const ext = ALLOWED_UPLOAD_TYPES.get(detected);
    const safeName = `${crypto.randomUUID()}.${ext}`;
    fs.writeFileSync(path.join(config.uploadDir, safeName), buffer, { mode: 0o644 });
    db.prepare(
      "INSERT INTO uploads (filename, original_name, mime, size, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(safeName, path.basename(filename).slice(0, 120), detected, buffer.length, nowIso());

    return sendJson(res, 201, {
      url: `/api/uploads/${safeName}`,
      filename: safeName,
      mime: detected,
      size: buffer.length,
    });
  }

  function handleDeleteUpload(filename, res) {
    if (!UPLOAD_FILENAME.test(filename)) throw new HttpError(400, "Invalid filename");
    const record = db.prepare("SELECT filename FROM uploads WHERE filename = ?").get(filename);
    if (!record) throw new HttpError(404, "Upload not found");

    const used = db
      .prepare("SELECT COUNT(*) AS count FROM blogs WHERE cover_image LIKE ? OR content LIKE ?")
      .get(`%/api/uploads/${filename}%`, `%/api/uploads/${filename}%`).count;
    assert(used === 0, 409, "This image is still used by an article");

    const filePath = path.join(config.uploadDir, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare("DELETE FROM uploads WHERE filename = ?").run(filename);
    return sendJson(res, 200, { ok: true });
  }

  return handle;
}

/** Write static SEO artifacts (used by `npm run blog:export` / build). */
export function writeStaticFeeds(outDir) {
  const db = getDatabase();
  ensureAdmin(db);
  publishDueScheduled(db);
  const posts = db
    .prepare(
      `SELECT ${POST_COLUMNS}, b.content ${POST_JOINS}
       WHERE ${publicPostClause()} ORDER BY b.published_at DESC LIMIT 30`
    )
    .all(nowIso());
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "feed.xml"), buildRss(posts), "utf8");
  fs.writeFileSync(path.join(outDir, "sitemap.xml"), buildSitemap(db), "utf8");
  return { posts: posts.length, outDir };
}

export { buildRss, buildSitemap };
