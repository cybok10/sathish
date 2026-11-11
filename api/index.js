import { createBlogApi } from "../server/api.js";

/**
 * The blog API, mounted at `/api`.
 *
 * The REST path arrives in the `p` query parameter — `/api?p=/blog/posts` —
 * so the whole API is served by this one function without depending on
 * catch-all routing. `api/[...path].js` serves the same handler at the
 * cleaner `/api/blog/posts` shape, and both are supported by the server.
 */
const handler = await createBlogApi();

export default async function blogApiRoot(req, res) {
  await handler(req, res, () => {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Not found" }));
  });
}
