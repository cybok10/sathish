/**
 * Generates public/feed.xml and public/sitemap.xml from the blog database.
 * Runs automatically before `vite build`; safe to run standalone.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeStaticFeeds } from "../server/api.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = await writeStaticFeeds(path.join(root, "public"));
console.log(`[blog-export] wrote sitemap.xml and feed.xml (${result.posts} published posts)`);
