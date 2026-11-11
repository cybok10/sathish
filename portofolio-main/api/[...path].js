import { createBlogApi } from "../server/api.js";

/**
 * The blog API as a Vercel serverless function.
 *
 * `api/[...path].js` catches every `/api/...` request and hands it to the
 * same handler the standalone server uses, so the behaviour is identical
 * in both places.
 *
 * The handler is created once per cold start — that is also when the
 * schema is applied and the starter content is seeded.
 */
const handler = await createBlogApi();

export default async function blogApi(req, res) {
  await handler(req, res, () => {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Not found" }));
  });
}
