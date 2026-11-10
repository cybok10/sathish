import { useMemo } from "react";
import { Link } from "../router";

/**
 * The header shared by the three tactics index pages.
 *
 * The copy sits on the left and a summary panel on the right, so the
 * top of the page carries information instead of dead space.
 */
export default function TacticsHeader({ eyebrow, title, accentWord, lead, stats, bars, action }) {
  const total = useMemo(
    () => (bars || []).reduce((sum, bar) => sum + bar.value, 0),
    [bars]
  );

  return (
    <header className="blog-tac-indexhead">
      <div className="blog-tac-indexhead__copy">
        <p className="blog-kicker">{eyebrow}</p>
        <h1 className="blog-display">
          {title} {accentWord ? <span className="blog-accent">{accentWord}</span> : null}
        </h1>
        <p className="blog-lead">{lead}</p>
        {action ? (
          <Link to={action.to} className="blog-btn blog-btn-sm blog-btn-primary">
            {action.label}
          </Link>
        ) : null}
      </div>

      {stats?.length || bars?.length ? (
        <aside className="blog-tac-indexhead__panel" aria-label="Library summary">
          {stats?.length ? (
            <ul className="blog-tac-stats">
              {stats.map((stat) => (
                <li key={stat.label}>
                  <strong className={stat.small ? "is-small" : undefined}>{stat.value}</strong>
                  <span>{stat.label}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {bars?.length ? (
            <div className="blog-tac-bars">
              {bars.map((bar) => (
                <div className="blog-tac-bar" key={bar.label}>
                  <span className="blog-tac-bar__label">
                    {bar.label}
                    <b>{bar.value}</b>
                  </span>
                  <span className="blog-tac-bar__track">
                    {bar.value > 0 ? (
                      <span
                        className="blog-tac-bar__fill"
                        style={{
                          width: `${total ? Math.max(3, (bar.value / total) * 100) : 0}%`,
                          background: bar.color,
                        }}
                      />
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </aside>
      ) : null}
    </header>
  );
}
