import { useMemo } from "react";
import { Link, useRouter } from "../router";
import { servicesUsingTool, toolBySlug, tools } from "../data/tactics";
import { useSeo } from "../seo";
import { ArrowRight, BookIcon, SearchIcon } from "../components/Icons";

const CATEGORY_LABEL = {
  recon: "Reconnaissance",
  scanning: "Scanning",
  exploitation: "Exploitation",
  "post-exploitation": "Post-exploitation",
  password: "Passwords",
  web: "Web",
  cloud: "Cloud",
  network: "Network",
  forensics: "Forensics",
  "red-team": "Red team",
  mobile: "Mobile",
  api: "API",
  wireless: "Wireless",
  container: "Containers",
  fuzzing: "Fuzzing",
  "vulnerability-management": "Vulnerability management",
};

/**
 * A tool reference page.
 *
 * What it is, how to get it, the commands worth knowing, when to reach
 * for it, and — because this matters more than the install command —
 * where it will mislead you.
 */
export default function ToolTactics({ slug }) {
  const { path } = useRouter();
  const tool = toolBySlug.get(slug);

  useSeo({
    title: tool ? `${tool.name} — tool reference` : "Tool reference",
    description: tool ? tool.summary : "Reference pages for the offensive security tooling.",
    path: `/blog/tactics/tools/${slug}`,
    jsonLd: tool
      ? {
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: `${tool.name} — Tool Reference`,
          description: tool.summary,
          articleSection: "Tools",
          keywords: [tool.name, tool.category].join(", "),
          author: { "@type": "Person", name: "Sathish M" },
        }
      : undefined,
  });

  const related = useMemo(() => {
    if (!tool) return [];
    return servicesUsingTool(tool.slug).slice(0, 8);
  }, [tool]);

  if (!tool) {
    return (
      <div className="blog-container" style={{ padding: "5rem 1.5rem" }}>
        <div className="blog-empty">
          <span className="blog-kicker">404</span>
          <h3>No such tool</h3>
          <p>That tool is not in the reference yet.</p>
          <Link className="blog-btn blog-btn-primary blog-btn-sm" to="/blog/tactics/tools">
            Browse all tools <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    );
  }

  const others = tools.filter((item) => item.slug !== tool.slug);

  return (
    <div className="blog-container blog-tac">
      <nav className="blog-breadcrumb" aria-label="Breadcrumb">
        <Link to="/blog">Blog</Link>
        <span>/</span>
        <Link to="/blog/tactics">Tactics</Link>
        <span>/</span>
        <Link to="/blog/tactics/tools">Tools</Link>
        <span>/</span>
        <span className="blog-dim">{tool.name}</span>
      </nav>

      <header className="blog-tac-head">
        <div className="blog-tac-head__main">
          <p className="blog-kicker">
            {CATEGORY_LABEL[tool.category] || tool.category}
          </p>
          <h1 className="blog-display blog-tac-title">{tool.name}</h1>
          <p className="blog-lead">{tool.summary}</p>
        </div>
      </header>

      <div className="blog-tac-body">
        <article className="blog-article blog-tac-article">
          {tool.install?.length ? (
            <section>
              <h2 className="blog-h2">Install</h2>
              {tool.install.map((command) => (
                <pre className="blog-tac-code" key={command}>
                  <code>{command}</code>
                </pre>
              ))}
            </section>
          ) : null}

          {tool.usage?.length ? (
            <section>
              <h2 className="blog-h2">Usage</h2>
              <p className="blog-muted">
                The invocations worth knowing. Anything more elaborate is a rabbit hole.
              </p>
              {tool.usage.map((item) => (
                <div className="blog-tac-step" key={item.title}>
                  <h3 className="blog-tac-h3">{item.title}</h3>
                  <pre className="blog-tac-code">
                    <code>{item.command}</code>
                  </pre>
                  {item.detail ? <p>{item.detail}</p> : null}
                </div>
              ))}
            </section>
          ) : null}

          {tool.useCases?.length ? (
            <section>
              <h2 className="blog-h2">When to reach for it</h2>
              <ul className="blog-tac-usecases">
                {tool.useCases.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {tool.notes ? (
            <section>
              <h2 className="blog-h2">Worth knowing</h2>
              <p className="blog-tac-note blog-tac-note--fix">
                <BookIcon size={15} />
                <span>{tool.notes}</span>
              </p>
            </section>
          ) : null}

          {related.length ? (
            <section>
              <h2 className="blog-h2">Used on these protocol pages</h2>
              <div className="blog-tac-related">
                {related.map((service) => (
                  <Link key={service.slug} to={`/blog/tactics/pentesting/services/${service.slug}`}>
                    {service.name}
                    <span>{service.port ? `port ${service.port}` : service.protocol}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </article>

        <aside className="blog-tac-side">
          <label className="blog-tac-search">
            <span className="blog-visually-hidden">Filter tools</span>
            <input type="search" placeholder="Filter tools…" readOnly tabIndex={-1} />
          </label>
          <ul className="blog-tac-switch">
            {others.map((item) => (
              <li key={item.slug}>
                <Link
                  to={`/blog/tactics/tools/${item.slug}`}
                  className={item.slug === tool.slug ? "is-current" : ""}
                  aria-current={item.slug === tool.slug ? "page" : undefined}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <footer className="blog-tac-foot">
        <ArrowRight size={16} />
        <p>
          {path.startsWith("/blog/tactics/tools/") ? "Back to" : "More in"}{" "}
          <Link to="/blog/tactics/tools">the tool reference</Link>.
        </p>
      </footer>
    </div>
  );
}
