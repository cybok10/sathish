import { createDatabase, createPool } from "./pgdb.js";
import { config } from "./config.js";
import { nowIso, readingTime, slugify } from "./utils.js";
import { MIGRATIONS, SCHEMA_SQL, SCHEMA_VERSION } from "./schema.js";
import {
  seedAuthors,
  seedCategories,
  seedPosts,
  seedTags,
} from "./seed-content.js";

let pool = null;
let instance = null;
let initPromise = null;

/**
 * The database handle.
 *
 * Creating the pool does not open a connection — `pg` connects lazily on
 * the first query — so this stays synchronous and the rest of the server
 * keeps its current shape. The schema and the seed run once per cold
 * start via `initDatabase()`.
 */
export function getDatabase() {
  if (instance) return instance;

  if (!config.databaseUrl) {
    throw new Error(
      "[blog-db] DATABASE_URL is not set. Copy server/.env.example to server/.env and fill it in."
    );
  }

  pool = createPool(config.databaseUrl);
  instance = createDatabase(pool);
  return instance;
}

/**
 * Applies the schema and seeds the starter content. Safe to call more
 * than once: the DDL is idempotent and the seed only runs when the blogs
 * table is empty.
 */
export function initDatabase() {
  if (!initPromise) {
    initPromise = (async () => {
      const db = getDatabase();

      await migrateSchema(db);
      await seedIfEmpty(db);

      return db;
    })().catch((error) => {
      // Let the next invocation retry rather than caching the failure.
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

/**
 * Applies the schema when it is missing, then runs any migrations the
 * database has not seen yet.
 *
 * The steady state is a single round trip that reads the version, so a
 * cold start does not re-run DDL every time. Against a connection pooler,
 * where each query costs real latency, that is worth the check.
 */
async function migrateSchema(db) {
  let current = 0;
  try {
    // The table may not exist yet on a first boot. That is an expected
    // condition, so the probe is quiet.
    const row = await db.prepare("SELECT version FROM schema_version LIMIT 1", { quiet: true }).get();
    current = Number(row?.version ?? 0);
  } catch {
    // The schema has not been applied yet.
    current = 0;
  }

  if (current === SCHEMA_VERSION) return;

  if (current < 1) {
    await db.exec(SCHEMA_SQL);
    current = 1;
  }

  for (const migration of MIGRATIONS) {
    if (current >= migration.version) continue;
    await db.exec(migration.sql);
    await verifyMigration(db, migration);
    current = migration.version;
  }

  await db.exec(
    `DELETE FROM schema_version; INSERT INTO schema_version (version) VALUES (${current});`
  );
}

/**
 * Confirms a migration actually landed.
 *
 * A DDL batch can be accepted and still change nothing — a pooler may drop
 * it, for instance. The version must never be written ahead of the schema,
 * or every query afterwards fails on a column that does not exist.
 */
async function verifyMigration(db, migration) {
  if (!migration.verify) return;
  const rows = await db.prepare(migration.verify).all();
  const found = rows.length;
  const expected = migration.expect ?? 1;
  if (found < expected) {
    throw new Error(
      `[blog-db] migration v${migration.version} did not take effect (${found}/${expected} objects found). The schema version was not advanced.`
    );
  }
}

async function seedIfEmpty(db) {
  const row = await db.prepare("SELECT COUNT(*) AS count FROM blogs").get();
  if (Number(row?.count ?? 0) > 0) return;

  const createdAt = nowIso();

  await db.exec("BEGIN");
  try {
    const insertAuthor = db.prepare(`
      INSERT INTO authors (name, slug, role, bio, avatar_url, email, github, linkedin, twitter, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const authorIds = new Map();
    for (const author of seedAuthors) {
      const result = await insertAuthor.run(
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
      const result = await insertCategory.run(
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
      const result = await insertTag.run(tag, slug);
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
      "INSERT INTO blog_tags (blog_id, tag_id) VALUES (?, ?)"
    );
    const insertView = db.prepare(
      "INSERT INTO blog_views (blog_id, created_at, source) VALUES (?, ?, 'seed')"
    );

    for (const post of seedPosts) {
      const authorId = authorIds.get(seedAuthors[0].slug);
      const categoryId = categoryIds.get(post.category) ?? null;
      const result = await insertBlog.run(
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
        if (tagId) await insertBlogTag.run(blogId, tagId);
      }
      await insertView.run(blogId, post.published_at);
    }

    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}

export async function closeDatabase() {
  if (instance) {
    await instance.release();
    instance = null;
  }
  if (pool) {
    await pool.end();
    pool = null;
  }
  initPromise = null;
}

/**
 * The starter content is seeded into an empty database, so a fresh
 * project is never blank. After that, the database is the source of truth
 * and this simply reports whether there is anything in it.
 */
export async function databaseExists() {
  const db = getDatabase();
  try {
    const row = await db.prepare("SELECT COUNT(*) AS count FROM blogs").get();
    return Number(row?.count ?? 0) > 0;
  } catch {
    return false;
  }
}
