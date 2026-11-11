import { createBlogApi } from "./api.js";

/**
 * Vite plugin that mounts the blog API on the dev/preview server, so
 * `npm run dev` is a single command and cookies remain same-origin.
 */
export function blogApiPlugin() {
  let handlerPromise = null;
  const getHandler = () => {
    if (!handlerPromise) handlerPromise = createBlogApi();
    return handlerPromise;
  };

  const middleware = (req, res, next) => {
    getHandler()
      .then((handler) => handler(req, res, next))
      .catch((error) => {
        console.error("[blog-api] dev middleware failed:", error);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "Blog API failed to start" }));
      });
  };

  return {
    name: "portfolio-blog-api",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
