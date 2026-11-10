import icons from "./icons";
import { programDetails, programFormats, howItWorks } from "./content";
import { useSmoothScroll } from "./hooks";

export default function MentorshipProgram() {
  const scrollTo = useSmoothScroll();

  return (
    <section className="ms-section" id="program" style={{ background: "var(--ms-bg-2)" }}>
      <div className="ms-grid-bg" aria-hidden="true" />
      <div className="ms-wrap" style={{ position: "relative" }}>
        <header className="ms-head ms-reveal">
          <p className="ms-eyebrow">Mentorship program</p>
          <h2 className="ms-title">
            How the mentorship <em>actually works</em>
          </h2>
          <p className="ms-sub">
            Formats, logistics and terms — with the things I haven&apos;t decided yet
            clearly marked, rather than filled in with marketing copy.
          </p>
        </header>

        {/* --- formats ------------------------------------------- */}
        <div className="ms-prog__formats">
          {programFormats.map((f, i) => {
            const Icon = icons[f.icon];
            const confirmed = f.availability === "confirmed";
            return (
              <article
                className={`ms-card ms-format ${confirmed ? "ms-format--on" : "ms-format--off ms-reveal"}`}
                data-delay={String(i + 1)}
                key={f.id}
                aria-labelledby={`fmt-${f.id}`}
              >
                <div className="ms-format__top">
                  <span className="ms-format__icon" aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <span
                    className={`ms-format__status ${confirmed ? "ms-format__status--on" : "ms-format__status--off"}`}
                  >
                    {confirmed ? "Available" : "Not confirmed"}
                  </span>
                </div>
                <h3 id={`fmt-${f.id}`}>{f.name}</h3>
                <p>{f.blurb}</p>
                <ul>
                  {f.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <p className="ms-specs__note">
          <icons.info
            size={14}
            aria-hidden="true"
            style={{ verticalAlign: -2, marginRight: 6, color: "var(--ms-cyan)" }}
          />
          Cards marked <strong style={{ color: "var(--ms-text-2)" }}>Not confirmed</strong>{" "}
          are shown for transparency so nothing hypothetical is sold as an available
          service. Ask if you want one of them — it simply isn&apos;t published as
          bookable yet.
        </p>

        {/* --- spec sheet ---------------------------------------- */}
        <h3 className="ms-eyebrow" style={{ marginTop: "3rem" }}>
          Program details
        </h3>
        <dl className="ms-specs">
          {programDetails.map((d) => {
            const pending = d.status === "configurable" && !d.value;
            return (
              <div
                className={`ms-spec${pending ? " ms-spec--pending" : ""}`}
                key={d.key}
              >
                <dt>{d.key}</dt>
                <dd>{pending ? "Awaiting configuration" : d.value}</dd>
              </div>
            );
          })}
        </dl>
        <p className="ms-specs__note">
          Fields showing <em>awaiting configuration</em> are deliberately unpublished —
          I don&apos;t publish a duration or a price I can&apos;t stand behind for every
          learner. Tell me your level and availability and I&apos;ll give you the real
          figures for your track.
        </p>

        {/* --- process ------------------------------------------- */}
        <h3 className="ms-eyebrow" style={{ marginTop: "3.2rem" }}>
          What happens after you enquire
        </h3>
        <ol className="ms-steps">
          {howItWorks.map((s) => (
            <li className="ms-step" key={s.n}>
              <b>{s.n}</b>
              <h4>{s.title}</h4>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>

        {/* --- CTA ----------------------------------------------- */}
        <div className="ms-prog__cta ms-reveal">
          <p>
            <strong>Ready to talk it through?</strong> Send your current level, weekly
            availability and what you want to achieve. You&apos;ll get an honest answer
            about fit before anything is committed.
          </p>
          <a
            href="#contact"
            className="ms-btn ms-btn--primary"
            onClick={(e) => scrollTo(e, "#contact")}
          >
            Join mentorship
            <icons.arrow size={17} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
