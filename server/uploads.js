import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

/**
 * Upload storage.
 *
 * In production the files live in Supabase Storage, because a serverless
 * function has no persistent disk. During local development it falls back
 * to the filesystem so the admin CMS still works without a Supabase bucket.
 */

let client = null;

function storageClient() {
  if (client) return client;
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) return null;
  client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** True when the files are held in Supabase Storage. */
export function usingSupabaseStorage() {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey && config.uploadBucket);
}

/**
 * Stores a file and returns its public path.
 * `path` is the key inside the bucket, which is the filename.
 */
export async function saveUpload(buffer, filename, mime) {
  const supabase = storageClient();

  if (!supabase) {
    fs.mkdirSync(config.uploadDir, { recursive: true });
    fs.writeFileSync(path.join(config.uploadDir, filename), buffer, { mode: 0o644 });
    return { path: filename, storage: "filesystem" };
  }

  const { error } = await supabase.storage
    .from(config.uploadBucket)
    .upload(filename, buffer, { contentType: mime, upsert: false });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  return { path: filename, storage: "supabase" };
}

/**
 * Reads a file back.
 * Returns null when it does not exist.
 */
export async function readUpload(filename) {
  const supabase = storageClient();

  if (!supabase) {
    const filePath = path.join(config.uploadDir, filename);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
  }

  const { data, error } = await supabase.storage.from(config.uploadBucket).download(filename);
  if (error || !data) return null;

  return Buffer.from(await data.arrayBuffer());
}

/** Removes a file. Missing files are not an error. */
export async function deleteUpload(filename) {
  const supabase = storageClient();

  if (!supabase) {
    const filePath = path.join(config.uploadDir, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return;
  }

  await supabase.storage.from(config.uploadBucket).remove([filename]);
}
