import { Link, useRouter } from "../router";
import { hardening, hardeningBySlug } from "../data/tactics";
import { useSeo } from "../seo";
import { ArrowRight, ShieldIcon } from "../components/Icons";

const SEVERITY_LABEL = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };

/**
 * One hardening guide.
 *
 * The checks are ordered most critical first, and each one carries the
 * command that proves whether the control is actually in place.
 */
export default function HardeningGuide({ slug }) {
  const { path } = useRouter();
  const guide = hardeningBySlug.get(slug);

  useSeo({
    title: guide ? `${guide.title} — hardening guide` : "Hardening guide",
    description: guide
      ? guide.summary
      : "Defensive hardening checklists for networks, services, identity and cloud.",
    path: `/blog/tactics/hardening/${slug}`,
  });

  if (!guide) {
    return (
      <div className="blog-container" style={{ padding: "5rem 1.5rem" }}>
        <div className="blog-empty">
          <span className="blog-kicker">404</span>
          <h3>No such guide</h3>
          <p>That hardening guide does not exist.</p>
          <Link className="blog-btn blog-btn-primary blog-btn-sm" to="/blog/tactics/hardening">
            Browse hardening guides <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    );
  }

  const others = hardening.filter((item) => item.slug !== guide.slug);

  return (
    <div className="blog-container blog-tac">
      <nav className="blog-breadcrumb" aria-label="Breadcrumb">
        <Link to="/blog">Blog</Link>
        <span>/</span>
        <Link to="/blog/tactics">Tactics</Link>
        <span>/</span>
        <Link to="/blog/tactics/hardening">Hardening</Link>
        <span>/</span>
        <span className="blog-dim">{guide.title}</span>
      </nav>

      <header className="blog-page-head blog-tac-indexhead">
        <p className="blog-kicker">Hardening guide</p>
        <h1 className="blog-display">{guide.title}</h1>
        <p className="blog-lead">{guide.summary}</p>
      </header>

      <div className="blog-tac-body">
        <article className="blog-article blog-tac-article">
          <ol className="blog-tac-hardchecks">
            {guide.checks.map((check) => (
              <li key={check.title}>
                <div className="blog-tac-hardcheck__head">
                  <h2 className="blog-tac-h3">{check.title}</h2>
                  <span className={`blog-tac-risk blog-tac-risk--${check.severity}`}>
                    {SEVERITY_LABEL[check.severity]}
                  </span>
                </div>
                <p>{check.detail}</p>
                {check.command ? (
                  <pre className="blog-tac-code">
                    <code>{check.command}</code>
                  </pre>
                ) : null}
              </li>
            ))}
          </ol>
        </article>

        <aside className="blog-tac-side">
          <h2 className="blog-tac-h3">Other guides</h2>
          <ul className="blog-tac-switch">
            {others.map((item) => (
              <li key={item.slug}>
                <Link
                  to={`/blog/tactics/hardening/${item.slug}`}
                  className={item.slug === guide.slug ? "is-current" : ""}
                  aria-current={path === `/blog/tactics/hardening/${item.slug}` ? "page" : undefined}
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <footer className="blog-tac-foot">
        <ShieldIcon size={16} />
        <p>
          Hardening is a trade-off, not a checklist to win. Every control here has a cost —
          the detail says what it is.
        </p>
      </footer>
    </div>
  );
}
