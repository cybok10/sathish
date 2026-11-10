import { Link } from "../router";
import { hardening } from "../data/tactics";
import { useSeo } from "../seo";
import { ArrowRight, ShieldIcon } from "../components/Icons";

/**
 * The hardening index.
 *
 * The defensive counterpart to the tactics pages: the same ground, read
 * from the other side.
 */
export default function HardeningIndex() {
  const total = hardening.reduce((sum, guide) => sum + guide.checks.length, 0);

  useSeo({
    title: "Hardening",
    description:
      "Defensive checklists for networks, services, identity, secrets, TLS, cloud, logging, patching, web applications and recovery.",
    path: "/blog/tactics/hardening",
  });

  return (
    <div className="blog-container blog-tac">
      <nav className="blog-breadcrumb" aria-label="Breadcrumb">
        <Link to="/blog">Blog</Link>
        <span>/</span>
        <Link to="/blog/tactics">Tactics</Link>
        <span>/</span>
        <span className="blog-dim">Hardening</span>
      </nav>

      <header className="blog-page-head blog-tac-indexhead">
        <p className="blog-kicker">Hardening</p>
        <h1 className="blog-display">
          The same ground, <span className="blog-accent">read defensively.</span>
        </h1>
        <p className="blog-lead">
          {hardening.length} guides covering {total} checks. Every one tells you what to
          turn on, how to verify it actually took effect, and what it costs you to run.
        </p>
      </header>

      <ul className="blog-tac-hardening">
        {hardening.map((guide) => (
          <li key={guide.slug}>
            <Link to={`/blog/tactics/hardening/${guide.slug}`} className="blog-tac-hardcard">
              <span className="blog-tac-hardcard__head">
                <ShieldIcon size={18} />
                <span className="blog-tac-hardcard__title">{guide.title}</span>
              </span>
              <span className="blog-tac-hardcard__desc">{guide.summary}</span>
              <span className="blog-tac-hardcard__foot">
                {guide.checks.length} checks
                <ArrowRight size={12} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
