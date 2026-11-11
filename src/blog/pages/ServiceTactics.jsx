import { useMemo, useState } from "react";
import { Link } from "../router";
import { serviceBySlug, services, mentionedToolsForService, toolsForService } from "../data/tactics";
import { useSeo } from "../seo";
import { ArrowRight, BoltIcon, ShieldIcon } from "../components/Icons";

const RISK_LABEL = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

function CodeBlock({ command }) {
  if (!command) return null;
  return (
    <pre className="blog-tac-code">
      <code>{command}</code>
    </pre>
  );
}

function CommandTable({ title, rows, columns = ["Command", "What it does"] }) {
  if (!rows?.length) return null;
  return (
    <div className="blog-tac-table-wrap">
      <h3 className="blog-tac-h3">{title}</h3>
      <table className="blog-tac-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.command || row.title}>
              <td>
                <code>{row.command}</code>
              </td>
              <td>{row.description || row.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A protocol / service walkthrough.
 *
 * The same page shape for every service: what it is, how to reach it,
 * how to enumerate it, what goes wrong, what you get afterwards, the
 * command reference and finally the fix.
 */
export default function ServiceTactics({ slug }) {
  const [filter, setFilter] = useState("");
  const service = serviceBySlug.get(slug);

  useSeo({
    title: service ? `${service.name} — pentesting tactics` : "Pentesting tactics",
    description: service
      ? service.summary
      : "Service protocol walkthroughs for offensive security.",
    path: `/blog/tactics/pentesting/services/${slug}`,
    jsonLd: service
      ? {
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: `${service.name} — Pentesting Tactics`,
          description: service.summary,
          articleSection: "Pentesting tactics",
          keywords: [service.name, ...(service.tags || [])].join(", "),
          author: { "@type": "Person", name: "Sathish M" },
        }
      : undefined,
  });

  const related = useMemo(() => {
    if (!service) return [];
    const tags = new Set(service.tags || []);
    return services
      .filter((item) => item.slug !== service.slug)
      .map((item) => ({
        item,
        score: (item.tags || []).filter((tag) => tags.has(tag)).length,
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
      .slice(0, 6)
      .map((entry) => entry.item);
  }, [service]);

  const siblings = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = services.filter((item) => item.slug !== service?.slug);
    return q
      ? list.filter((item) => item.name.toLowerCase().includes(q))
      : list;
  }, [filter, service]);

  if (!service) {
    return (
      <div className="blog-container" style={{ padding: "5rem 1.5rem" }}>
        <div className="blog-empty">
          <span className="blog-kicker">404</span>
          <h3>No such protocol page</h3>
          <p>That service is not in the tactics library.</p>
          <Link className="blog-btn blog-btn-primary blog-btn-sm" to="/blog/tactics/pentesting">
            Browse pentesting tactics <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    );
  }

  const linkedTools = toolsForService(service);
  const mentioned = mentionedToolsForService(service);

  return (
    <div className="blog-container blog-tac">
      <nav className="blog-breadcrumb" aria-label="Breadcrumb">
        <Link to="/blog">Blog</Link>
        <span>/</span>
        <Link to="/blog/tactics">Tactics</Link>
        <span>/</span>
        <Link to="/blog/tactics/pentesting">Pentesting</Link>
        <span>/</span>
        <span className="blog-dim">{service.name}</span>
      </nav>

      <header className="blog-tac-head">
        <div className="blog-tac-head__main">
          <p className="blog-kicker">Service protocol</p>
          <h1 className="blog-display blog-tac-title">{service.name}</h1>
          <p className="blog-lead">{service.summary}</p>

          <div className="blog-tac-meta">
            <span className={`blog-tac-risk blog-tac-risk--${service.risk}`}>
              {RISK_LABEL[service.risk]} risk
            </span>
            {service.port ? <span className="blog-chip">Port {service.port}</span> : null}
            {service.protocol ? <span className="blog-chip">{service.protocol}</span> : null}
            {(service.tags || []).map((tag) => (
              <span className="blog-chip" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="blog-tac-scope">
        <BoltIcon size={16} />
        <p>
          Every command on this page is for systems you own or have written permission to
          test. Start with the recon section, confirm the scope in writing, and stop as
          soon as you have what you came for.
        </p>
      </div>

      <div className="blog-tac-body">
        <article className="blog-article blog-tac-article">
          {service.connect?.length ? (
            <section>
              <h2 className="blog-h2">Connect</h2>
              <p className="blog-muted">
                How you reach the service, and what a successful connection looks like.
              </p>
              {service.connect.map((item) => (
                <div className="blog-tac-step" key={item.label || item.command}>
                  <h3 className="blog-tac-h3">{item.label || item.title}</h3>
                  <CodeBlock command={item.command} />
                  {item.detail ? <p>{item.detail}</p> : null}
                </div>
              ))}
            </section>
          ) : null}

          {service.recon?.length ? (
            <section>
              <h2 className="blog-h2">Recon</h2>
              <p className="blog-muted">
                Confirm the service is there, and what it is, before touching anything.
              </p>
              {service.recon.map((item) => (
                <div className="blog-tac-step" key={item.title}>
                  <h3 className="blog-tac-h3">{item.title}</h3>
                  <CodeBlock command={item.command} />
                  {item.detail ? <p>{item.detail}</p> : null}
                </div>
              ))}
            </section>
          ) : null}

          {service.enumeration?.length ? (
            <section>
              <h2 className="blog-h2">Enumeration</h2>
              <p className="blog-muted">
                Pull the configuration, the version and the data the service is holding.
              </p>
              {service.enumeration.map((item) => (
                <div className="blog-tac-step" key={item.title}>
                  <h3 className="blog-tac-h3">{item.title}</h3>
                  <CodeBlock command={item.command} />
                  {item.detail ? <p>{item.detail}</p> : null}
                </div>
              ))}
            </section>
          ) : null}

          {service.attacks?.length ? (
            <section>
              <h2 className="blog-h2">Attack vectors</h2>
              <p className="blog-muted">
                The ways this service is normally abused, with the fix for each one.
              </p>
              <div className="blog-tac-vectors">
                {service.attacks.map((item) => (
                  <div className="blog-tac-vector" key={item.title}>
                    <div className="blog-tac-vector__head">
                      <h3 className="blog-tac-h3">{item.title}</h3>
                      <span className={`blog-tac-risk blog-tac-risk--${item.severity}`}>
                        {RISK_LABEL[item.severity]}
                      </span>
                    </div>
                    <CodeBlock command={item.command} />
                    {item.detail ? <p>{item.detail}</p> : null}
                    {item.detection ? (
                      <p className="blog-tac-note blog-tac-note--detect">
                        <strong>Detection</strong> {item.detection}
                      </p>
                    ) : null}
                    {item.fix ? (
                      <p className="blog-tac-note blog-tac-note--fix">
                        <strong>Fix</strong> {item.fix}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {service.postEx?.length ? (
            <section>
              <h2 className="blog-h2">Post-exploitation</h2>
              <p className="blog-muted">
                What an attacker does once the service is theirs. Read these to know what
                your logs should look like, and to know what to remove afterwards.
              </p>
              <div className="blog-tac-vectors">
                {service.postEx.map((item) => (
                  <div className="blog-tac-vector" key={item.title}>
                    <div className="blog-tac-vector__head">
                      <h3 className="blog-tac-h3">{item.title}</h3>
                      <span className={`blog-tac-risk blog-tac-risk--${item.severity}`}>
                        {RISK_LABEL[item.severity]}
                      </span>
                    </div>
                    <CodeBlock command={item.command} />
                    {item.detail ? <p>{item.detail}</p> : null}
                    {item.detection ? (
                      <p className="blog-tac-note blog-tac-note--detect">
                        <strong>Detection</strong> {item.detection}
                      </p>
                    ) : null}
                    {item.fix ? (
                      <p className="blog-tac-note blog-tac-note--fix">
                        <strong>Fix</strong> {item.fix}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <CommandTable title="Command reference" rows={service.commands} />

          {service.hardening?.length ? (
            <section>
              <h2 className="blog-h2">Hardening</h2>
              <p className="blog-muted">
                The controls that remove the attack paths above. Work down this list in
                order.
              </p>
              <ol className="blog-tac-checks">
                {service.hardening.map((item) => (
                  <li key={item.title}>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {linkedTools.length ? (
            <section>
              <h2 className="blog-h2">Tools used here</h2>
              <div className="blog-tac-toolgrid">
                {linkedTools.map((tool) => (
                  <Link
                    key={tool.slug}
                    to={`/blog/tactics/tools/${tool.slug}`}
                    className="blog-tac-toolcard"
                  >
                    <span className="blog-tac-toolcard__name">{tool.name}</span>
                    <span className="blog-tac-toolcard__desc">{tool.summary}</span>
                    <span className="blog-tac-toolcard__more">
                      Read the reference <ArrowRight size={12} />
                    </span>
                  </Link>
                ))}
              </div>
              {mentioned.length ? (
                <p className="blog-tac-also">
                  Also used on this page:{" "}
                  {mentioned.map((slug) => (
                    <code key={slug}>{slug}</code>
                  ))}
                </p>
              ) : null}
            </section>
          ) : null}

          {related.length ? (
            <section>
              <h2 className="blog-h2">Related protocols</h2>
              <div className="blog-tac-related">
                {related.map((item) => (
                  <Link key={item.slug} to={`/blog/tactics/pentesting/services/${item.slug}`}>
                    {item.name}
                    <span>port {item.port}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </article>

        <aside className="blog-tac-side">
          <label className="blog-tac-search">
            <span className="blog-visually-hidden">Filter protocols</span>
            <input
              type="search"
              value={filter}
              placeholder="Filter protocols…"
              onChange={(event) => setFilter(event.target.value)}
            />
          </label>
          <ul className="blog-tac-switch">
            {siblings.map((item) => (
              <li key={item.slug}>
                <Link
                  to={`/blog/tactics/pentesting/services/${item.slug}`}
                  className={item.slug === service.slug ? "is-current" : ""}
                  aria-current={item.slug === service.slug ? "page" : undefined}
                >
                  {item.name}
                </Link>
              </li>
            ))}
            {siblings.length === 0 ? (
              <li className="blog-dim" style={{ padding: "0.35rem 0.5rem", fontSize: "0.8rem" }}>
                No match
              </li>
            ) : null}
          </ul>
        </aside>
      </div>

      <footer className="blog-tac-foot">
        <ShieldIcon size={16} />
        <p>
          Found a mistake or a technique that is out of date? Corrections are welcome —
          this page is meant to be accurate, not complete.
        </p>
      </footer>
    </div>
  );
}
