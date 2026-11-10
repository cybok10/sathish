import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "./config.js";
import { nowIso, readingTime, slugify } from "./utils.js";
import {
  seedAuthors,
  seedCategories,
  seedPosts,
  seedTags,
} from "./seed-content.js";

const SCHEMA_VERSION = 1;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  github TEXT NOT NULL DEFAULT '',
  linkedin TEXT NOT NULL DEFAULT '',
  twitter TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS blogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  cover_image TEXT NOT NULL DEFAULT '',
  author_id INTEGER REFERENCES authors(id) ON DELETE SET NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  view_count INTEGER NOT NULL DEFAULT 0,
  reading_time INTEGER NOT NULL DEFAULT 1,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  meta_title TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS blog_tags (
  blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (blog_id, tag_id)
);

CREATE TABLE IF NOT EXISTS blog_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'editor')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL DEFAULT '',
  mime TEXT NOT NULL DEFAULT '',
  size INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blogs_status_published ON blogs(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blogs_category ON blogs(category_id);
CREATE INDEX IF NOT EXISTS idx_blogs_author ON blogs(author_id);
CREATE INDEX IF NOT EXISTS idx_blogs_featured ON blogs(is_featured, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blogs_views ON blogs(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_blog_tags_tag ON blog_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_blog_views_blog ON blog_views(blog_id, created_at DESC);
`;

let instance = null;

export function getDatabase() {
  if (instance) return instance;

  const db = new DatabaseSync(config.dbFile);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec(SCHEMA);

  const version = db.prepare("PRAGMA user_version").get();
  const current = version?.user_version ?? 0;
  if (current < SCHEMA_VERSION) {
    // Future migrations go here, guarded by the current version.
    db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }

  seedIfEmpty(db);
  instance = db;
  return db;
}

function seedIfEmpty(db) {
  const row = db.prepare("SELECT COUNT(*) AS count FROM blogs").get();
  if ((row?.count ?? 0) > 0) return;

  const createdAt = nowIso();
  db.exec("BEGIN");
  try {
    const insertAuthor = db.prepare(`
      INSERT INTO authors (name, slug, role, bio, avatar_url, email, github, linkedin, twitter, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const authorIds = new Map();
    for (const author of seedAuthors) {
      const result = insertAuthor.run(
        author.name,
        author.slug,
        author.role,
        author.bio,
        author.avatar_url,
        author.email,
        author.github,
        author.linkedin,
        author.twitter,
        createdAt
      );
      authorIds.set(author.slug, Number(result.lastInsertRowid));
    }

    const insertCategory = db.prepare(
      "INSERT INTO categories (name, slug, description, created_at) VALUES (?, ?, ?, ?)"
    );
    const categoryIds = new Map();
    for (const category of seedCategories) {
      const result = insertCategory.run(
        category.name,
        category.slug,
        category.description,
        createdAt
      );
      categoryIds.set(category.slug, Number(result.lastInsertRowid));
    }

    const insertTag = db.prepare("INSERT INTO tags (name, slug) VALUES (?, ?)");
    const tagIds = new Map();
    for (const tag of seedTags) {
      const slug = slugify(tag, "tag");
      const result = insertTag.run(tag, slug);
      tagIds.set(slug, Number(result.lastInsertRowid));
    }

    const insertBlog = db.prepare(`
      INSERT INTO blogs (
        title, slug, excerpt, content, cover_image, author_id, category_id,
        status, is_featured, view_count, reading_time, published_at,
        created_at, updated_at, meta_title, meta_description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertBlogTag = db.prepare(
      "INSERT OR IGNORE INTO blog_tags (blog_id, tag_id) VALUES (?, ?)"
    );
    const insertView = db.prepare(
      "INSERT INTO blog_views (blog_id, created_at, source) VALUES (?, ?, 'seed')"
    );

    for (const post of seedPosts) {
      const authorId = authorIds.get(seedAuthors[0].slug);
      const categoryId = categoryIds.get(post.category) ?? null;
      const result = insertBlog.run(
        post.title,
        post.slug,
        post.excerpt,
        post.content.trim(),
        post.cover_image,
        authorId,
        categoryId,
        post.is_featured ? 1 : 0,
        post.views,
        readingTime(post.content),
        post.published_at,
        post.published_at,
        post.published_at,
        post.title,
        post.excerpt.slice(0, 160)
      );
      const blogId = Number(result.lastInsertRowid);
      for (const tag of post.tags) {
        const tagId = tagIds.get(slugify(tag, "tag"));
        if (tagId) insertBlogTag.run(blogId, tagId);
      }
      insertView.run(blogId, post.published_at);
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function closeDatabase() {
  if (instance) {
    instance.close();
    instance = null;
  }
}

export function databaseExists() {
  return fs.existsSync(config.dbFile);
}

export function backupDatabase(targetFile) {
  if (!databaseExists()) return false;
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.copyFileSync(config.dbFile, targetFile);
  return true;
}
