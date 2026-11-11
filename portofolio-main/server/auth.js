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
    .prepare("SELECT id, email, name, password_hash FROM admins WHERE email = ?")
    .get(config.admin.email);
  if (existing) {
    // An explicitly configured ADMIN_PASSWORD always wins over the stored hash,
    // so rotating it in server/.env takes effect on the next start.
    if (
      config.admin.passwordConfigured &&
      !(await verifyPassword(config.admin.password, existing.password_hash))
    ) {
      await db
        .prepare("UPDATE admins SET password_hash = ? WHERE id = ?")
        .run(await hashPassword(config.admin.password), existing.id);
    }
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

export async function destroySession(db, token) {
  if (!token) return;
  await db.prepare("DELETE FROM sessions WHERE id = ?").run(sha256(token));
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
              a.id AS admin_id, a.email, a.name, a.role
       FROM sessions s JOIN admins a ON a.id = s.admin_id
       WHERE s.id = ?`
    )
    .get(sha256(token));

  if (!row) return null;
  if (Date.parse(row.expires_at) <= Date.now()) {
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
 */
export async function requireAdmin(req, res, db, { mutating = false } = {}) {
  const session = await getSession(req, db);
  if (!session) {
    res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Authentication required" }));
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

function safeEqual(a, b) {
  const bufferA = Buffer.from(String(a));
  const bufferB = Buffer.from(String(b));
  return bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB);
}

export { COOKIE_NAME };
