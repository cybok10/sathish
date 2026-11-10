import icons from "./icons";
import {
  mentor,
  verifiedExperience,
  verifiedCertifications,
  verifiedStats,
  specialisms,
  teachingPhilosophy,
} from "./content";

export default function MentorIntroduction() {
  return (
    <section className="ms-section" id="about">
      <div className="ms-wrap">
        <header className="ms-head ms-reveal">
          <p className="ms-eyebrow">About the mentor</p>
          <h2 className="ms-title">
            The person guiding <em>your</em> learning
          </h2>
          <p className="ms-sub">
            Every detail below comes from my existing portfolio and public profile —
            no invented titles, no inflated numbers.
          </p>
        </header>

        <div className="ms-about__grid">
          {/* --- portrait ------------------------------------------ */}
          <div className="ms-reveal" data-delay="1">
            <figure className="ms-portrait">
              <img
                src={mentor.portrait}
                alt={`Portrait of ${mentor.name}, cybersecurity researcher and mentor`}
                width="1024"
                height="1536"
                loading="lazy"
                decoding="async"
              />
              <figcaption className="ms-portrait__meta">
                <span className="dot" aria-hidden="true" />
                <div>
                  <strong>{mentor.name}</strong>
                  <span>{mentor.shortHeadline}</span>
                </div>
              </figcaption>
            </figure>

            <ul className="ms-stats" aria-label="Verified highlights">
              {verifiedStats.map((s) => (
                <li className="ms-stat" key={s.label}>
                  <b>
                    {s.value}
                    {s.suffix ? <i>{s.suffix}</i> : null}
                  </b>
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>

            <div className="ms-social">
              {mentor.links.map((l) => {
                const Icon = icons[l.icon];
                return (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon size={15} aria-hidden="true" />
                    {l.label}
                  </a>
                );
              })}
            </div>
          </div>

          {/* --- copy ---------------------------------------------- */}
          <div className="ms-reveal" data-delay="2">
            <h3 className="ms-about__name">{mentor.name}</h3>
            <p className="ms-about__role">{mentor.headline}</p>

            <p className="ms-about__body">{mentor.about}</p>
            <p className="ms-about__body">{mentor.teachingFocus}</p>

            <ul className="ms-chips" aria-label="Areas of specialisation">
              {specialisms.map((s) => (
                <li className="ms-chip-tag" key={s}>
                  {s}
                </li>
              ))}
            </ul>

            <div className="ms-philosophy">
              {teachingPhilosophy.map((p) => (
                <div className="ms-philosophy__item" key={p.title}>
                  <icons.sparkles
                    size={17}
                    aria-hidden="true"
                    style={{ color: "var(--ms-lime)", marginTop: 3, flex: "none" }}
                  />
                  <div>
                    <strong>{p.title}</strong>
                    <p>{p.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <h4
              className="ms-eyebrow"
              style={{ marginTop: "2.2rem", marginBottom: "0.4rem" }}
            >
              Background & experience
            </h4>
            <div className="ms-timeline">
              {verifiedExperience.map((e) => (
                <div className="ms-timeline__item" key={e.period + e.role}>
                  <div className="ms-timeline__when">{e.period}</div>
                  <div className="ms-timeline__what">
                    <strong>{e.role}</strong>
                    <em>{e.org}</em>
                    <p>{e.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <h4
              className="ms-eyebrow"
              style={{ marginTop: "2.2rem", marginBottom: "0.4rem" }}
            >
              Certifications
            </h4>
            <ul className="ms-certs">
              {verifiedCertifications.map((c) => (
                <li className="ms-cert" key={c.name}>
                  <b>{c.name}</b> · {c.issuer}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
