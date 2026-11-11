import http from "node:http";
import { config } from "./config.js";
import { createBlogApi } from "./api.js";
import { closeDatabase } from "./db.js";

const handler = await createBlogApi();

const server = http.createServer((req, res) => {
  handler(req, res, () => {
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Not found" }));
  });
});

server.listen(config.port, () => {
  console.log(`[blog-api] listening on http://localhost:${config.port}/api`);
  console.log(`[blog-api] admin: ${config.admin.email}`);
});

function shutdown() {
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
