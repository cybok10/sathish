import "./blog.css";
import { RouterProvider, matchPath, useRouter } from "./router";
import { BlogLayout } from "./components/Layout";
import { Link } from "./router";
import BlogHome from "./pages/BlogHome";
import BlogPost from "./pages/BlogPost";
import BlogCategory from "./pages/BlogCategory";
import BlogTag from "./pages/BlogTag";
import BlogAuthor from "./pages/BlogAuthor";
import BlogSearch from "./pages/BlogSearch";
import AdminApp from "./admin/AdminApp";
import { ArrowRight } from "./components/Icons";

function NotFound() {
  return (
    <div className="blog-container" style={{ padding: "5rem 1.5rem" }}>
      <div className="blog-empty">
        <span className="blog-kicker">404</span>
        <h3>That page does not exist</h3>
        <p>The link may be outdated, or the article was unpublished.</p>
        <Link className="blog-btn blog-btn-primary blog-btn-sm" to="/blog">
          Back to the blog <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

function Routes() {
  const { path } = useRouter();

  if (path === "/admin" || path.startsWith("/admin/")) {
    return <AdminApp />;
  }

  let page = null;

  if (path === "/blog" || path === "/blog/") {
    page = <BlogHome />;
  } else if (path === "/blog/search") {
    page = <BlogSearch />;
  } else {
    let match = matchPath("/blog/category/:slug", path);
    if (match) page = <BlogCategory slug={match.slug} />;
    if (!page) {
      match = matchPath("/blog/tag/:slug", path);
      if (match) page = <BlogTag slug={match.slug} />;
    }
    if (!page) {
      match = matchPath("/blog/author/:slug", path);
      if (match) page = <BlogAuthor slug={match.slug} />;
    }
    if (!page) {
      match = matchPath("/blog/:slug", path);
      if (match) page = <BlogPost slug={match.slug} />;
    }
    if (!page) page = <NotFound />;
  }

  return <BlogLayout>{page}</BlogLayout>;
}

export default function BlogApp() {
  return (
    <RouterProvider>
      <Routes />
    </RouterProvider>
  );
}
