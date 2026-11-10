import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const SERVER_DIR = __dirname;
export const ROOT_DIR = path.resolve(__dirname, "..");

/**
 * Tiny .env loader (no dependency). Values already present in process.env win.
 * Reads `<root>/.env` and `<root>/server/.env`.
 */
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(path.join(ROOT_DIR, ".env"));
loadEnvFile(path.join(SERVER_DIR, ".env"));

const dataDir = process.env.BLOG_DATA_DIR
  ? path.resolve(process.env.BLOG_DATA_DIR)
  : path.join(SERVER_DIR, "data");

const uploadDir = process.env.BLOG_UPLOAD_DIR
  ? path.resolve(process.env.BLOG_UPLOAD_DIR)
  : path.join(SERVER_DIR, "uploads");

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

const basePath = (process.env.BASE_PATH || "/portofolio").replace(/\/$/, "");
const rawSiteUrl = (process.env.SITE_URL || "https://cybok10.github.io/portofolio").replace(/\/$/, "");
const siteOrigin =
  basePath && rawSiteUrl.endsWith(basePath) ? rawSiteUrl.slice(0, -basePath.length) : rawSiteUrl;

const configuredAdminPassword = process.env.ADMIN_PASSWORD;

export const config = {
  port: Number(process.env.API_PORT || 8787),
  dataDir,
  uploadDir,
  dbFile: path.join(dataDir, "blog.db"),
  siteUrl: siteOrigin.replace(/\/$/, ""),
  basePath,
  admin: {
    email: (process.env.ADMIN_EMAIL || "admin@sathish.blog").toLowerCase(),
    // Never ship a known password in the repository. When ADMIN_PASSWORD is
    // not configured an unguessable credential is generated instead; it is
    // printed once, when the admin row is first created.
    password: configuredAdminPassword || crypto.randomBytes(24).toString("base64url"),
    passwordConfigured: Boolean(configuredAdminPassword),
    name: process.env.ADMIN_NAME || "Sathish M",
  },
  sessionTtlMs: 1000 * 60 * 60 * 24 * 7,
  maxUploadBytes: 5 * 1024 * 1024,
  maxJsonBytes: 1024 * 1024,
  isDev: process.env.NODE_ENV !== "production",
};

export const ALLOWED_UPLOAD_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);
