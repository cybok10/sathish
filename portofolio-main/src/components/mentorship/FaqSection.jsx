import { useState } from "react";
import { faqs } from "./content";
import icons from "./icons";

/**
 * Frequently asked questions.
 *
 * One question per row, one open at a time, so the answers stay scannable
 * on a long page. The button owns both the disclosure state and the
 * keyboard interaction — no extra ARIA wiring needed.
 */
export default function FaqSection() {
  const [open, setOpen] = useState(0);

  return (
    <section className="ms-section" id="faq">
      <div className="ms-wrap">
        <header className="ms-head">
          <p className="ms-eyebrow">09 — Questions</p>
          <h2 className="ms-title">
            Everything people ask <em>before the first session.</em>
          </h2>
          <p className="ms-sub">
            If your question is not here, ask it in the enquiry form below — you will
            get a straight answer, including when the answer is that I am not the
            right person for it.
          </p>
        </header>

        <div className="ms-faq">
          {faqs.map((item, index) => {
            const isOpen = open === index;
            return (
              <div key={item.q} className={`ms-faq__item ${isOpen ? "is-open" : ""}`}>
                <h3>
                  <button
                    type="button"
                    className="ms-faq__q"
                    aria-expanded={isOpen}
                    aria-controls={`ms-faq-panel-${index}`}
                    id={`ms-faq-button-${index}`}
                    onClick={() => setOpen(isOpen ? -1 : index)}
                  >
                    <span>{item.q}</span>
                    <span className="ms-faq__icon" aria-hidden="true">
                      <icons.chevron size={15} />
                    </span>
                  </button>
                </h3>
                <div
                  className="ms-faq__a"
                  id={`ms-faq-panel-${index}`}
                  role="region"
                  aria-labelledby={`ms-faq-button-${index}`}
                >
                  <div className="ms-faq__aInner">
                    <p>{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
