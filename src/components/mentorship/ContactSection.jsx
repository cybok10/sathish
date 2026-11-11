import { useState } from "react";
import { bookingSteps, levelOptions, mentor, trackOptions } from "./content";
import icons from "./icons";

/**
 * The enquiry section.
 *
 * The form is a plain mailto hand-off: it opens the visitor's own mail
 * client with the answers pre-filled, so nothing is sent to a third party
 * and no server-side inbox is required to run the page.
 */
export default function ContactSection() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const goal = String(data.get("goal") || "").trim();

    // Honeypot: a filled hidden field means a bot, not a person.
    if (String(data.get("company") || "").trim()) {
      setError("");
      return;
    }

    if (!name || !email || !goal) {
      setError("Please fill in your name, email and what you want to achieve.");
      return;
    }

    const subject = `Mentorship enquiry — ${name}`;
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Current level: ${data.get("level") || "Not specified"}`,
      `Area of interest: ${data.get("track") || "Not specified"}`,
      "",
      "What I want to achieve:",
      goal,
    ].join("\n");

    setError("");
    setSent(true);
    window.location.href = `mailto:${mentor.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <section className="ms-section ms-contact" id="contact">
      <div className="ms-wrap">
        <header className="ms-head">
          <p className="ms-eyebrow">10 — Start a conversation</p>
          <h2 className="ms-title">
            Tell me where you want to go <em>next.</em>
          </h2>
          <p className="ms-sub">
            No course pitch and no generic package. Send your situation and I will
            reply with an honest read on where to start — including whether mentorship
            is the right next step for you.
          </p>
        </header>

        <div className="ms-contact__grid">
          <aside className="ms-contact__panel">
            <h3>How it starts</h3>
            <p>
              Every mentorship begins the same way: a short exchange, then a plan.
              Nothing is committed until both sides know what the work is.
            </p>

            <ol className="ms-contact__steps">
              {bookingSteps.map((step) => (
                <li key={step.n}>
                  <span>{step.n}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="ms-contact__list">
              <a className="ms-contact__row" href={`mailto:${mentor.email}`}>
                <icons.mail size={17} aria-hidden="true" />
                <div>
                  <strong>Email</strong>
                  <span>{mentor.email}</span>
                </div>
              </a>
              <a className="ms-contact__row" href={mentor.phoneHref}>
                <icons.phone size={17} aria-hidden="true" />
                <div>
                  <strong>Phone</strong>
                  <span>{mentor.phone}</span>
                </div>
              </a>
              {mentor.links.map((link) => {
                const Icon = icons[link.icon] || icons.link;
                return (
                  <a
                    key={link.href}
                    className="ms-contact__row"
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon size={17} aria-hidden="true" />
                    <div>
                      <strong>{link.label}</strong>
                      <span>{link.href.replace(/^https?:\/\//, "")}</span>
                    </div>
                  </a>
                );
              })}
            </div>
          </aside>

          <form className="ms-form" onSubmit={handleSubmit} noValidate>
            <div className="ms-form__grid">
              <div className="ms-field">
                <label htmlFor="ms-name">
                  Full name <span className="req">*</span>
                </label>
                <input
                  id="ms-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  required
                />
              </div>

              <div className="ms-field">
                <label htmlFor="ms-email">
                  Email address <span className="req">*</span>
                </label>
                <input
                  id="ms-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="ms-field">
                <label htmlFor="ms-level">
                  Current level <span className="opt">optional</span>
                </label>
                <select id="ms-level" name="level" defaultValue="">
                  <option value="">Select your level</option>
                  {levelOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ms-field">
                <label htmlFor="ms-track">
                  Area of interest <span className="opt">optional</span>
                </label>
                <select id="ms-track" name="track" defaultValue="">
                  <option value="">Not sure yet</option>
                  {trackOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ms-field ms-field--full">
                <label htmlFor="ms-goal">
                  What do you want to achieve? <span className="req">*</span>
                </label>
                <textarea
                  id="ms-goal"
                  name="goal"
                  rows={6}
                  placeholder="What are you learning now, where are you stuck, and what would a good outcome look like?"
                  required
                />
              </div>

              {/* Honeypot — real people never fill this in. */}
              <div className="ms-hp" aria-hidden="true">
                <label htmlFor="ms-company">Company</label>
                <input id="ms-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              {error ? (
                <p className="ms-form__status ms-form__status--err" role="alert">
                  <icons.alert size={16} aria-hidden="true" />
                  <span>{error}</span>
                </p>
              ) : null}

              {sent ? (
                <p className="ms-form__status ms-form__status--ok" role="status">
                  <icons.checkCircle size={16} aria-hidden="true" />
                  <span>
                    Your email client has been opened with the enquiry filled in. Press send
                    and I will reply within 24 hours. If nothing opened, email me
                    directly at{" "}
                    <a href={`mailto:${mentor.email}`}>{mentor.email}</a>.
                  </span>
                </p>
              ) : null}

              <div className="ms-form__foot">
                <p className="ms-privacy">
                  <b>Your details stay private.</b> They are used to reply to this
                  enquiry and nothing else. No mailing list, no tracking, no third
                  parties.
                </p>
                <button className="ms-btn ms-btn--primary" type="submit">
                  Send enquiry ↗
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
