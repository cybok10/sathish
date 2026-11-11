import { useEffect, useState } from "react";
import { Link } from "../router";
import { ArrowRight } from "./Icons";

const COLLECTIONS = [
  {
    id: "pentesting",
    to: "/blog/tactics/pentesting",
    title: "Pentesting tactics",
    blurb:
      "A walkthrough for every protocol and service worth attacking — recon, enumeration, the attack paths, what an attacker does next, and how to close it.",
    meta: "service protocols",
    tone: "violet",
  },
  {
    id: "tools",
    to: "/blog/tactics/tools",
    title: "Tools",
    blurb:
      "The offensive toolkit, explained honestly — what each tool is for, how to install it, the commands that matter, and where it gives you the wrong answer.",
    meta: "offensive tools",
    tone: "teal",
  },
  {
    id: "hardening",
    to: "/blog/tactics/hardening",
    title: "Hardening",
    blurb:
      "The defensive side of the same work — what to turn on, how to verify it actually took effect, and what it costs you to run.",
    meta: "defensive guides",
    tone: "amber",
  },
];

/**
 * The tactics library promo on the blog home.
 *
 * The counts come from the content modules, which are large, so they are
 * fetched on demand rather than bundled into the blog.
 */
export default function TacticsPromo() {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    let cancelled = false;
    import("../data/tactics.js").then((module) => {
      if (cancelled) return;
      setCounts({
        pentesting: module.services.length,
        tools: module.tools.length,
        hardening: module.hardening.length,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="blog-tac-promo" aria-labelledby="tactics-promo-title">
      <div className="blog-container">
        <div className="blog-section-head">
          <div>
            <span className="blog-kicker">Reference library</span>
            <h2 id="tactics-promo-title" className="blog-h2" style={{ marginTop: "0.6rem" }}>
              Tactics
            </h2>
            <p>
              Not articles — a working reference. Protocol walkthroughs, the toolkit, and the
              defensive checks, organised the way the work actually happens.
            </p>
          </div>
          <Link to="/blog/tactics">
            Open the library <ArrowRight size={12} />
          </Link>
        </div>

        <ul className="blog-tac-promo__grid">
          {COLLECTIONS.map((item) => (
            <li key={item.id}>
              <Link to={item.to} className={`blog-tac-promo__card blog-tac-promo__card--${item.tone}`}>
                <span className="blog-tac-promo__title">{item.title}</span>
                <span className="blog-tac-promo__blurb">{item.blurb}</span>
                <span className="blog-tac-promo__meta">
                  <strong>{counts ? counts[item.id] : "—"}</strong> {item.meta}
                  <ArrowRight size={12} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
