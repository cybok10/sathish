import { createBlogApi } from "../server/api.js";

/**
 * The blog API as a catch-all serverless function.
 *
 * `api/[...path].js` matches `/api/anything/here`, so the handler sees
 * the original path and routes it exactly as it would in the standalone
 * server. `api/index.js` serves the same handler at `/api`, where the
 * path travels in the `p` query parameter.
 */
const handler = await createBlogApi();

export default async function blogApi(req, res) {
  await handler(req, res, () => {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Not found" }));
  });
}
