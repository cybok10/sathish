import { Link } from "../router";
import { hardening } from "../data/tactics";
import { useSeo } from "../seo";
import TacticsHeader from "../components/TacticsHeader";
import { ArrowRight, ShieldIcon } from "../components/Icons";

const SEVERITY_LABEL = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
const SEVERITY_COLOR = {
  critical: "#fb7185",
  high: "#fb923c",
  medium: "#facc15",
  low: "#64748b",
};

/**
 * The hardening index.
 *
 * The defensive counterpart to the tactics pages: the same ground, read
 * from the other side.
 */
export default function HardeningIndex() {
  const total = hardening.reduce((sum, guide) => sum + guide.checks.length, 0);

  const severityCounts = hardening
    .reduce((counts, guide) => {
      for (const check of guide.checks) {
        if (counts[check.severity] !== undefined) counts[check.severity] += 1;
      }
      return counts;
    }, { critical: 0, high: 0, medium: 0, low: 0 });

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

      <TacticsHeader
        eyebrow="Hardening"
        title="The same ground,"
        accentWord="read defensively."
        lead="Every one tells you what to turn on, how to verify it actually took effect, and what it costs you to run."
        stats={[
          { value: hardening.length, label: "guides" },
          { value: total, label: "checks" },
          { value: severityCounts.critical + severityCounts.high, label: "critical & high" },
        ]}
        bars={Object.entries(severityCounts).map(([key, value]) => ({
          label: SEVERITY_LABEL[key],
          value,
          color: SEVERITY_COLOR[key],
        }))}
      />

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
