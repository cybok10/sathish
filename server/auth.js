import crypto from "node:crypto";
import { config } from "./config.js";
import { nowIso, parseCookies } from "./utils.js";

const COOKIE_NAME = "blog_session";
const SCRYPT_KEYLEN = 64;

/**
 * Scrypt, promisified.
 *
 * The synchronous version blocks the event loop, which on a serverless
 * runtime means one slow login can stall every other request sharing the
 * instance. The parameters are the same, so existing hashes stay valid.
 */
function scrypt(password, salt, keylen) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [scheme, saltHex, hashHex] = String(stored).split("$");
    if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = await scrypt(password, salt, expected.length);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export async function ensureAdmin(db) {
  const existing = await db
    .prepare("SELECT id, email, name, password_hash, author_id FROM admins WHERE email = ?")
    .get(config.admin.email);
  if (existing) {
    // An explicitly configured ADMIN_PASSWORD always wins over the stored hash,
    // so rotating it in server/.env takes effect on the next start.
    if (
      config.admin.passwordConfigured &&
      !(await verifyPassword(config.admin.password, existing.password_hash))
    ) {
      await db
        .prepare("UPDATE admins SET password_hash = ?, status = 'active' WHERE id = ?")
        .run(await hashPassword(config.admin.password), existing.id);
    }
    await linkOwnerByline(db, existing);
    return { id: existing.id, email: existing.email, name: existing.name };
  }

  const result = await db
    .prepare(
      "INSERT INTO admins (email, name, password_hash, role, created_at) VALUES (?, ?, ?, 'admin', ?)"
    )
    .run(
      config.admin.email,
      config.admin.name,
      await hashPassword(config.admin.password),
      nowIso()
    );

  await linkOwnerByline(db, { id: Number(result.lastInsertRowid), author_id: null });

  if (!config.admin.passwordConfigured) {
    console.warn(
      `[blog-api] Created admin "${config.admin.email}" with generated password: ${config.admin.password}`
    );
    console.warn("[blog-api] Set ADMIN_PASSWORD in server/.env to use your own credential.");
  }

  return {
    id: Number(result.lastInsertRowid),
    email: config.admin.email,
    name: config.admin.name,
  };
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function createSession(db, adminId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const csrf = crypto.randomBytes(32).toString("base64url");
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + config.sessionTtlMs).toISOString();
  await db
    .prepare(
      "INSERT INTO sessions (id, admin_id, csrf_token, created_at, expires_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(sha256(token), adminId, csrf, createdAt, expiresAt);
  return { token, csrf, expiresAt };
}

/**
 * Gives the owner account a byline if it does not have one.
 *
 * The byline is the public author profile an article is published under.
 * The owner is the person behind the site, so their articles should carry
 * their name rather than no author at all.
 */
async function linkOwnerByline(db, account) {
  if (account?.author_id) return;
  try {
    const byEmail = await db
      .prepare("SELECT id FROM authors WHERE lower(email) = lower(?) LIMIT 1")
      .get(config.admin.email);
    let authorId = byEmail?.id ?? null;
    if (!authorId) {
      // A single author profile is almost always the owner's own.
      const all = await db.prepare("SELECT id FROM authors ORDER BY id LIMIT 2").all();
      if (all.length === 1) authorId = all[0].id;
    }
    if (!authorId) return;
    await db.prepare("UPDATE admins SET author_id = ? WHERE id = ?").run(authorId, account.id);
  } catch (error) {
    console.error("[blog-api] could not link the owner byline:", error.message);
  }
}

export async function destroySession(db, token) {
  if (!token) return;
  await db.prepare("DELETE FROM sessions WHERE id = ?").run(sha256(token));
}

/**
 * Creates a writer account.
 *
 * The password is hashed before it is stored, and the caller is
 * responsible for handing it to the new writer out of band.
 */
export async function createAdmin(db, { email, name, password, role = "editor", authorId = null, status = "active" }) {
  const result = await db
    .prepare(
      `INSERT INTO admins (email, name, password_hash, role, author_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      String(email).toLowerCase(),
      String(name || "").slice(0, 120),
      await hashPassword(password),
      role === "admin" ? "admin" : "editor",
      authorId || null,
      status === "disabled" ? "disabled" : status === "invited" ? "invited" : "active",
      nowIso()
    );

  return Number(result.lastInsertRowid);
}

/** Updates a writer's profile, role, status or password. */
export async function updateAdmin(db, id, patch) {
  const sets = [];
  const args = [];

  if (patch.name !== undefined) {
    sets.push("name = ?");
    args.push(String(patch.name || "").slice(0, 120));
  }
  if (patch.role !== undefined) {
    sets.push("role = ?");
    args.push(patch.role === "admin" ? "admin" : "editor");
  }
  if (patch.status !== undefined) {
    sets.push("status = ?");
    args.push(["active", "invited", "disabled"].includes(patch.status) ? patch.status : "active");
  }
  if (patch.authorId !== undefined) {
    sets.push("author_id = ?");
    args.push(patch.authorId || null);
  }
  if (patch.password) {
    sets.push("password_hash = ?");
    args.push(await hashPassword(patch.password));
  }

  if (!sets.length) return false;

  await db.prepare(`UPDATE admins SET ${sets.join(", ")} WHERE id = ?`).run(...args, id);

  // A disabled account should not keep an active session.
  if (patch.status === "disabled") {
    await db.prepare("DELETE FROM sessions WHERE admin_id = ?").run(id);
  }
  return true;
}

export async function cleanupSessions(db) {
  await db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(nowIso());
}

export async function getSession(req, db) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  const row = await db
    .prepare(
      `SELECT s.id AS session_id, s.csrf_token, s.expires_at,
              a.id AS admin_id, a.email, a.name, a.role, a.status, a.author_id
       FROM sessions s JOIN admins a ON a.id = s.admin_id
       WHERE s.id = ?`
    )
    .get(sha256(token));

  if (!row) return null;
  if (Date.parse(row.expires_at) <= Date.now()) {
    await db.prepare("DELETE FROM sessions WHERE id = ?").run(row.session_id);
    return null;
  }
  // A disabled account loses its sessions immediately.
  if (row.status === "disabled") {
    await db.prepare("DELETE FROM sessions WHERE id = ?").run(row.session_id);
    return null;
  }
  return { ...row, token };
}

export function sessionCookie(req, token, expiresAt) {
  const secure =
    req.headers["x-forwarded-proto"] === "https" || Boolean(req.socket?.encrypted);
  const maxAge = Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
  return [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAge}`,
    secure ? "Secure" : null,
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearCookie(req) {
  const secure =
    req.headers["x-forwarded-proto"] === "https" || Boolean(req.socket?.encrypted);
  return [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
    secure ? "Secure" : null,
  ]
    .filter(Boolean)
    .join("; ");
}

export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // Non-browser clients still need a valid CSRF token.
  try {
    const originUrl = new URL(origin);
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    return originUrl.host === host;
  } catch {
    return false;
  }
}

/**
 * Returns the authenticated session or writes a JSON error and returns null.
 * `mutating` additionally enforces same-origin + CSRF token checks.
 * `role` additionally requires that role or higher.
 */
export async function requireAdmin(req, res, db, { mutating = false, role } = {}) {
  const session = await getSession(req, db);
  if (!session) {
    res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Authentication required" }));
    return null;
  }

  if (role && !hasRole(session.role, role)) {
    res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        error:
          role === "admin"
            ? "This action is restricted to administrators."
            : "Your role does not allow this action.",
      })
    );
    return null;
  }

  if (mutating) {
    if (!sameOrigin(req)) {
      res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Cross-origin request rejected" }));
      return null;
    }
    const token = req.headers["x-csrf-token"];
    if (!token || typeof token !== "string" || !safeEqual(token, session.csrf_token)) {
      res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Invalid CSRF token" }));
      return null;
    }
  }

  return session;
}

/** Roles are ordered: an admin can do everything an editor can. */
const ROLE_RANK = { editor: 1, admin: 2 };

export function hasRole(actual, required) {
  if (!required) return true;
  return (ROLE_RANK[actual] || 0) >= (ROLE_RANK[required] || 0);
}

/** True when the account may sign in at all. */
export function accountIsActive(account) {
  return !account?.status || account.status === "active";
}

/**
 * Records who did what.
 *
 * With several people writing, "who published this?" needs a reliable
 * answer long after the fact.
 */
export async function audit(db, admin, action, { targetType = "", targetId = "", detail = "" } = {}) {
  try {
    await db
      .prepare(
        `INSERT INTO admin_audit (admin_id, admin_email, action, target_type, target_id, detail, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        admin?.admin_id ?? admin?.id ?? null,
        admin?.email || "",
        String(action).slice(0, 60),
        String(targetType).slice(0, 40),
        String(targetId).slice(0, 80),
        String(detail).slice(0, 500),
        nowIso()
      );
  } catch (error) {
    // Auditing must never break the action it is recording.
    console.error("[blog-api] audit write failed:", error.message);
  }
}

function safeEqual(a, b) {
  const bufferA = Buffer.from(String(a));
  const bufferB = Buffer.from(String(b));
  return bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB);
}

export { COOKIE_NAME };
