import { Suspense, lazy } from "react";
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

/**
 * The tactics library is a few hundred pages of reference content. It is
 * split into its own chunks and only fetched when a reader actually goes
 * there, so the blog itself stays light.
 */
const TacticsHub = lazy(() => import("./pages/TacticsHub"));
const PentestingIndex = lazy(() => import("./pages/PentestingIndex"));
const ToolsIndex = lazy(() => import("./pages/ToolsIndex"));
const ToolTactics = lazy(() => import("./pages/ToolTactics"));
const ServiceTactics = lazy(() => import("./pages/ServiceTactics"));
const HardeningIndex = lazy(() => import("./pages/HardeningIndex"));
const HardeningGuide = lazy(() => import("./pages/HardeningGuide"));

function TacticsFallback() {
  return (
    <div className="blog-container" style={{ padding: "4rem 1.5rem" }}>
      <div className="blog-skeleton-title" />
      <div className="blog-skeleton-line" />
      <div className="blog-skeleton-line" />
      <div className="blog-skeleton-cover" />
    </div>
  );
}

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
  } else if (path === "/blog/tactics" || path === "/blog/tactics/") {
    page = <TacticsHub />;
  } else if (path === "/blog/tactics/pentesting") {
    page = <PentestingIndex />;
  } else if (path === "/blog/tactics/tools") {
    page = <ToolsIndex />;
  } else if (path === "/blog/tactics/hardening") {
    page = <HardeningIndex />;
  } else {
    let match = matchPath("/blog/tactics/pentesting/services/:slug", path);
    if (match) page = <ServiceTactics slug={match.slug} />;
    if (!page) {
      match = matchPath("/blog/tactics/tools/:slug", path);
      if (match) page = <ToolTactics slug={match.slug} />;
    }
    if (!page) {
      match = matchPath("/blog/tactics/hardening/:slug", path);
      if (match) page = <HardeningGuide slug={match.slug} />;
    }
    if (!page) {
      match = matchPath("/blog/category/:slug", path);
      if (match) page = <BlogCategory slug={match.slug} />;
    }
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

  return (
    <BlogLayout>
      <Suspense fallback={<TacticsFallback />}>{page}</Suspense>
    </BlogLayout>
  );
}

export default function BlogApp() {
  return (
    <RouterProvider>
      <Routes />
    </RouterProvider>
  );
}
