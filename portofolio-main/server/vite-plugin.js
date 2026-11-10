import { createBlogApi } from "./api.js";

/**
 * Vite plugin that mounts the blog API on the dev/preview server, so
 * `npm run dev` is a single command and cookies remain same-origin.
 */
export function blogApiPlugin() {
  let handler = null;
  const getHandler = () => {
    if (!handler) handler = createBlogApi();
    return handler;
  };

  return {
    name: "portfolio-blog-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => getHandler()(req, res, next));
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => getHandler()(req, res, next));
    },
  };
}
