import icons from "./icons";
import { audience, prerequisites } from "./content";

export default function AudienceSection() {
  const required = prerequisites.filter((p) => p.required);
  const optional = prerequisites.filter((p) => !p.required);

  return (
    <section className="ms-section" id="audience" style={{ background: "var(--ms-bg-2)" }}>
      <div className="ms-grid-bg" aria-hidden="true" />
      <div className="ms-wrap" style={{ position: "relative" }}>
        <header className="ms-head ms-reveal">
          <p className="ms-eyebrow">Who is this for?</p>
          <h2 className="ms-title">
            Find out if this <em>fits you</em> before you commit
          </h2>
          <p className="ms-sub">
            Honest fit matters more than a big audience. Here is who gets real value
            from structured mentorship — and what you need to bring with you.
          </p>
        </header>

        <ul className="ms-aud-grid">
          {audience.map((a, i) => {
            const Icon = icons[a.icon];
            return (
              <li className="ms-card ms-aud ms-reveal" data-delay={String((i % 5) + 1)} key={a.title}>
                <span className="ms-aud__icon" aria-hidden="true">
                  <Icon size={19} />
                </span>
                <h3>{a.title}</h3>
                <p>{a.body}</p>
                <p className="ms-aud__fit">{a.fit}</p>
              </li>
            );
          })}
        </ul>

        <div className="ms-prereq">
          <div className="ms-reveal">
            <h3 className="ms-title" style={{ fontSize: "clamp(1.35rem,2.6vw,1.7rem)" }}>
              Prerequisites, honestly stated
            </h3>
            <p className="ms-sub" style={{ marginTop: "0.8rem" }}>
              Required items are genuinely required. Optional items are things I can
              teach you along the way.
            </p>

            <ul className="ms-prereq__list" style={{ marginTop: "1.4rem" }}>
              {required.map((p) => (
                <li className="ms-prereq__item" key={p.label}>
                  <span className="ms-prereq__mark ms-prereq__mark--req">REQ</span>
                  <div>
                    <strong>{p.label}</strong>
                    <span>{p.detail}</span>
                  </div>
                </li>
              ))}
              {optional.map((p) => (
                <li className="ms-prereq__item" key={p.label}>
                  <span className="ms-prereq__mark ms-prereq__mark--opt">OPT</span>
                  <div>
                    <strong>{p.label}</strong>
                    <span>{p.detail}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <aside className="ms-prereq__note ms-reveal" data-delay="2">
            <h3>
              <icons.lock
                size={17}
                aria-hidden="true"
                style={{ color: "var(--ms-cyan)", marginRight: 8, verticalAlign: -3 }}
              />
              Authorised environments only
            </h3>
            <p>
              Every exercise runs inside isolated labs you own or have explicit
              permission to test. You will never be asked to scan, probe or attack a
              system that isn&apos;t yours — that distinction is the difference between
              a security career and a criminal record.
            </p>
            <p>
              If you are unsure whether your setup meets the requirements, send me a
              message first. I would rather talk you out of the wrong track than take
              on someone the program can&apos;t serve.
            </p>
            <a href="#contact" className="ms-btn ms-btn--ghost ms-btn--sm" style={{ marginTop: "1.1rem" }}>
              Ask a question
              <icons.arrow size={15} aria-hidden="true" />
            </a>
          </aside>
        </div>
      </div>
    </section>
  );
}
