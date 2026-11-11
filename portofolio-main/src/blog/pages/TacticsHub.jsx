import { useMemo, useState } from "react";
import { Link } from "../router";
import { searchTools, services, serviceTags, tools } from "../data/tactics";
import { useSeo } from "../seo";
import { ArrowRight, BookIcon, SearchIcon, ShieldIcon } from "../components/Icons";

const RISK_LABEL = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };

/**
 * The tactics hub.
 *
 * One entry point for the whole library: the three collections, plus a
 * single search that reaches across protocols and tools at once.
 */
export default function TacticsHub() {
  const [query, setQuery] = useState("");

  useSeo({
    title: "Tactics library",
    description:
      "A pentesting reference library: service protocol walkthroughs, offensive tooling and defensive hardening guides, organised the way the work actually happens.",
    path: "/blog/tactics",
  });

  const matchedServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return services.filter((service) =>
      [service.name, service.summary, service.port, ...(service.tags || [])]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [query]);

  const matchedTools = useMemo(() => (query.trim() ? searchTools(query) : []), [query]);

  const topProtocols = useMemo(
    () =>
      [...services]
        .sort((a, b) => {
          const order = { critical: 0, high: 1, medium: 2, low: 3 };
          return order[a.risk] - order[b.risk] || a.name.localeCompare(b.name);
        })
        .slice(0, 8),
    []
  );

  return (
    <div className="blog-container blog-tac">
      <nav className="blog-breadcrumb" aria-label="Breadcrumb">
        <Link to="/blog">Blog</Link>
        <span>/</span>
        <span className="blog-dim">Tactics</span>
      </nav>

      <header className="blog-page-head blog-tac-indexhead">
        <p className="blog-kicker">Tactics library</p>
        <h1 className="blog-display">
          The reference I <span className="blog-accent">actually use.</span>
        </h1>
        <p className="blog-lead">
          {services.length} service protocols, {tools.length} tools and {serviceTags.length}{" "}
          tags — organised the way I work, not the way a textbook does. Recon, then
          enumerate, then attack, then fix.
        </p>
      </header>

      <div className="blog-tac-toolbar">
        <label className="blog-tac-search blog-tac-search--wide">
          <SearchIcon size={15} />
          <span className="blog-visually-hidden">Search the tactics library</span>
          <input
            type="search"
            value={query}
            placeholder="Search everything — protocols, tools and tags"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      {query.trim() ? (
        <section className="blog-tac-group">
          <h2 className="blog-h2">
            {matchedServices.length + matchedTools.length} result
            {matchedServices.length + matchedTools.length === 1 ? "" : "s"}
          </h2>
          <ul className="blog-tac-grid blog-tac-grid--compact">
            {matchedServices.map((service) => (
              <li key={service.slug} data-reveal>
                <Link
                  to={`/blog/tactics/pentesting/services/${service.slug}`}
                  className="blog-tac-card"
                >
                  <span className="blog-tac-card__top">
                    <span className="blog-tac-card__name">{service.name}</span>
                    <span className={`blog-tac-risk blog-tac-risk--${service.risk}`}>
                      {RISK_LABEL[service.risk]}
                    </span>
                  </span>
                  <span className="blog-tac-card__desc">{service.summary}</span>
                </Link>
              </li>
            ))}
            {matchedTools.map((tool) => (
              <li key={tool.slug} data-reveal>
                <Link to={`/blog/tactics/tools/${tool.slug}`} className="blog-tac-card">
                  <span className="blog-tac-card__top">
                    <span className="blog-tac-card__name">{tool.name}</span>
                  </span>
                  <span className="blog-tac-card__desc">{tool.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
          {matchedServices.length + matchedTools.length === 0 ? (
            <div className="blog-empty">
              <h3>Nothing matched that</h3>
              <p>Try a protocol, a tool name, a port number or a tag.</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="blog-tac-collections">
        <Link to="/blog/tactics/pentesting" className="blog-tac-collection">
          <span className="blog-tac-collection__icon">
            <BookIcon size={20} />
          </span>
          <span className="blog-tac-collection__title">Pentesting tactics</span>
          <span className="blog-tac-collection__desc">
            A full walkthrough for every protocol worth attacking — recon, enumeration,
            attack vectors, post-exploitation, command reference and the fix.
          </span>
          <span className="blog-tac-collection__meta">
            <strong>{services.length}</strong> service protocols
            <ArrowRight size={13} />
          </span>
        </Link>

        <Link to="/blog/tactics/tools" className="blog-tac-collection">
          <span className="blog-tac-collection__icon">
            <SearchIcon size={20} />
          </span>
          <span className="blog-tac-collection__title">Tools</span>
          <span className="blog-tac-collection__desc">
            What each tool is for, how to install it, the commands that matter, and where
            it gives you the wrong answer.
          </span>
          <span className="blog-tac-collection__meta">
            <strong>{tools.length}</strong> offensive tools
            <ArrowRight size={13} />
          </span>
        </Link>

        <Link to="/blog/tactics/hardening" className="blog-tac-collection">
          <span className="blog-tac-collection__icon">
            <ShieldIcon size={20} />
          </span>
          <span className="blog-tac-collection__title">Hardening</span>
          <span className="blog-tac-collection__desc">
            The defensive side of the same work, as a checklist you can work through and
            verify.
          </span>
          <span className="blog-tac-collection__meta">
            <strong>10</strong> defensive guides
            <ArrowRight size={13} />
          </span>
        </Link>
      </div>

      <section className="blog-tac-group">
        <h2 className="blog-h2">Start with the highest-risk protocols</h2>
        <ul className="blog-tac-grid blog-tac-grid--compact">
          {topProtocols.map((service) => (
            <li key={service.slug} data-reveal>
              <Link
                to={`/blog/tactics/pentesting/services/${service.slug}`}
                className="blog-tac-card"
              >
                <span className="blog-tac-card__top">
                  <span className="blog-tac-card__name">{service.name}</span>
                  <span className={`blog-tac-risk blog-tac-risk--${service.risk}`}>
                    {RISK_LABEL[service.risk]}
                  </span>
                </span>
                <span className="blog-tac-card__port">
                  {service.port ? `port ${service.port}` : service.protocol}
                </span>
                <span className="blog-tac-card__desc">{service.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
