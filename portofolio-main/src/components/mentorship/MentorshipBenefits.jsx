import icons from "./icons";
import { benefits, outcomes } from "./content";

export default function MentorshipBenefits() {
  return (
    <section className="ms-section" id="approach">
      <div className="ms-wrap">
        <header className="ms-head ms-reveal">
          <p className="ms-eyebrow">07 — Teaching approach &amp; benefits</p>
          <h2 className="ms-title">
            Why structured beats <em>random tutorials</em>
          </h2>
          <p className="ms-sub">
            The difference isn&apos;t more content — it&apos;s feedback, sequence and
            someone who notices when you&apos;ve quietly misunderstood something.
          </p>
        </header>

        <ul className="ms-benefits">
          {benefits.map((b, i) => {
            const Icon = icons[b.icon];
            return (
              <li
                className="ms-card ms-benefit ms-reveal"
                data-delay={String((i % 5) + 1)}
                key={b.title}
              >
                <span className="ms-benefit__icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <h3>{b.title}</h3>
                <p>{b.body}</p>
              </li>
            );
          })}
        </ul>

        <div className="ms-outcomes">
          {outcomes.map((o, i) => (
            <article
              className="ms-card ms-outcome-card ms-reveal"
              data-delay={String(i + 1)}
              key={o.n}
            >
              <b aria-hidden="true">{o.n}</b>
              <h3>{o.title}</h3>
              <p>{o.body}</p>
            </article>
          ))}
        </div>

        <p className="ms-tools__note" style={{ marginTop: "1.8rem" }}>
          <icons.info size={15} aria-hidden="true" />
          <span>
            These describe how the mentorship is taught. They are not promises of
            employment, certification or income — those depend on your own work,
            market conditions and factors outside any mentor&apos;s control.
          </span>
        </p>
      </div>
    </section>
  );
}
