import icons from "./icons";
import testimonials, { testimonialDisclaimer, resolveProof } from "./content";

function Stars({ rating }) {
  return (
    <div className="ms-testi__stars">
      {Array.from({ length: 5 }, (_, i) => (
        <icons.star
          key={i}
          size={14}
          aria-hidden="true"
          style={{
            fill: i < rating ? "currentColor" : "none",
            opacity: i < rating ? 1 : 0.3,
          }}
        />
      ))}
      <span aria-hidden="true">
        {rating}.0
      </span>
      <span className="ms-visually-hidden">{rating} out of 5 stars</span>
    </div>
  );
}

export default function TestimonialSection() {
  const approved = testimonials.filter((t) => t.approved);

  if (!approved.length) return null;

  return (
    <section className="ms-section" id="testimonials" style={{ background: "var(--ms-bg-2)" }}>
      <div className="ms-grid-bg" aria-hidden="true" />
      <div className="ms-wrap" style={{ position: "relative" }}>
        <header className="ms-head ms-reveal">
          <p className="ms-eyebrow">Testimonials</p>
          <h2 className="ms-title">
            What learners <em>actually said</em>
          </h2>
          <p className="ms-sub">
            Genuine Google reviews from people I&apos;ve taught — with the original
            screenshots attached so you can verify them yourself.
          </p>
        </header>

        <ul className="ms-testi-grid">
          {approved.map((t, i) => {
            const proof = resolveProof(t.proof);
            return (
              <li
                className="ms-card ms-testi ms-reveal"
                data-delay={String((i % 4) + 1)}
                key={t.id}
              >
                <div className="ms-testi__stars-row">
                  <icons.quote
                    size={18}
                    aria-hidden="true"
                    style={{ color: "var(--ms-lime)", opacity: 0.55 }}
                  />
                  <Stars rating={t.rating} />
                </div>

                <blockquote>“{t.quote}”</blockquote>

                <div className="ms-testi__who">
                  <strong>{t.name}</strong>
                  <span>{t.track}</span>
                  {proof && (
                    <a
                      className="ms-testi__proof"
                      href={proof}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <icons.eye size={13} aria-hidden="true" />
                      View original review screenshot
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <p className="ms-testi__note">{testimonialDisclaimer}</p>

        {/* Screenshot strip — lets a visitor verify without leaving the page. */}
        <div className="ms-gallery ms-reveal">
          <h3 className="ms-eyebrow" style={{ marginBottom: "1rem" }}>
            Verification screenshots
          </h3>
          <ul className="ms-gallery__strip" aria-label="Original review screenshots">
            {approved
              .map((t) => resolveProof(t.proof))
              .filter(Boolean)
              .map((src) => (
                <li className="ms-gallery__item" key={src}>
                  <a href={src} target="_blank" rel="noopener noreferrer">
                    <img
                      src={src}
                      alt="Screenshot of an original Google review"
                      width="640"
                      height="400"
                      loading="lazy"
                      decoding="async"
                    />
                  </a>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
