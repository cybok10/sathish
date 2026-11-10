import { useState } from "react";
import { mentorProof, sessionOffers } from "./content";
import icons from "./icons";
import { useSmoothScroll } from "./hooks";

/**
 * The bookable offers.
 *
 * Laid out the way a buyer expects to scan them: what it is, how it is
 * delivered, how long it takes, what it costs and one clear way to start.
 * The proof signals sit alongside so the offers are not asking to be taken
 * on trust.
 */
export default function SessionOffers() {
  const [active, setActive] = useState(sessionOffers[0].id);
  const scrollTo = useSmoothScroll();
  const selected = sessionOffers.find((offer) => offer.id === active) ?? sessionOffers[0];

  return (
    <section className="ms-section" id="offers">
      <div className="ms-wrap">
        <header className="ms-head">
          <p className="ms-eyebrow">06 — Session offers</p>
          <h2 className="ms-title">
            Pick the session that matches <em>where you are.</em>
          </h2>
          <p className="ms-sub">
            Every offer below is a real session I run one-to-one. Start with the scoping
            call if you are unsure — it is the cheapest way to find out whether
            mentorship is worth it for you.
          </p>
        </header>

        <div className="ms-proofbar">
          {mentorProof.map((item) => (
            <div key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <ul className="ms-offers" role="list">
          {sessionOffers.map((offer) => {
            const Icon = icons[offer.icon] || icons.target;
            const isActive = offer.id === active;
            return (
              <li
                key={offer.id}
                className={`ms-offer ${isActive ? "is-active" : ""}`}
                style={{ "--ms-offer-accent": offer.accent }}
              >
                <button
                  type="button"
                  className="ms-offer__pick"
                  onClick={() => setActive(offer.id)}
                  aria-pressed={isActive}
                >
                  <span className="ms-offer__icon" aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <span className="ms-offer__head">
                    <span className="ms-offer__badge">{offer.badge}</span>
                    <span className="ms-offer__title">{offer.title}</span>
                  </span>
                  <span className="ms-offer__meta">
                    <span>{offer.format}</span>
                    <span aria-hidden="true">·</span>
                    <span>{offer.duration}</span>
                    <span aria-hidden="true">·</span>
                    <span className="ms-offer__price">
                      {offer.price ? offer.price : "Price on enquiry"}
                    </span>
                  </span>
                </button>

                <div className="ms-offer__body">
                  <div className="ms-offer__bodyInner">
                    <p className="ms-offer__summary">{offer.summary}</p>
                    <ul className="ms-offer__includes">
                      {offer.includes.map((item) => (
                        <li key={item}>
                          <icons.checkCircle size={15} aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <a
                      className="ms-btn ms-btn--primary ms-btn--sm"
                      href="#contact"
                      onClick={(event) => scrollTo(event, "#contact")}
                    >
                      Book this session →
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="ms-offers__note">
          <icons.info size={16} aria-hidden="true" />
          <span>
            Sessions are confirmed by email before anything is scheduled. Nothing is
            charged automatically, and you can reschedule free of charge with 24
            hours&apos; notice.
          </span>
        </p>

        <div className="ms-offer__selected" aria-live="polite">
          <strong>Selected:</strong> {selected.title} — {selected.format},{" "}
          {selected.duration}
        </div>
      </div>
    </section>
  );
}
