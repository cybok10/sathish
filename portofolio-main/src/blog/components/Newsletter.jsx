import { useState } from "react";
import { api, submissionErrorMessage } from "../api";
import { SendIcon } from "./Icons";

export function NewsletterForm({ compact = false }) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState({ status: "idle", message: "" });

  const submit = async (event) => {
    event.preventDefault();
    if (state.status === "loading") return;
    setState({ status: "loading", message: "" });
    try {
      await api("/blog/newsletter", { method: "POST", body: { email, website } });
      setState({
        status: "success",
        message: "You're subscribed. New research notes will land in your inbox.",
      });
      setEmail("");
    } catch (error) {
      setState({ status: "error", message: submissionErrorMessage(error) });
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="blog-newsletter-row">
        <label className="blog-field" style={{ flex: 1 }}>
          <span className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
            Email address
          </span>
          <input
            className="blog-input"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            aria-label="Email address"
          />
        </label>
        <button
          className="blog-btn blog-btn-primary"
          type="submit"
          disabled={state.status === "loading"}
        >
          <SendIcon size={15} />
          {state.status === "loading" ? "Subscribing…" : "Subscribe"}
        </button>
      </div>
      <input
        type="text"
        name="website"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />
      {state.status === "success" && <div className="blog-success">{state.message}</div>}
      {state.status === "error" && <div className="blog-error">{state.message}</div>}
      {!compact && (
        <small>No spam. Unsubscribe at any time. Your address is stored only for this newsletter.</small>
      )}
    </form>
  );
}

export function NewsletterSection() {
  return (
    <section className="blog-newsletter" aria-labelledby="newsletter-title">
      <div>
        <span className="blog-kicker">The field notes</span>
        <h2 id="newsletter-title" style={{ marginTop: "0.7rem" }}>
          One email when there is something worth reading.
        </h2>
        <p>
          Practical security research, detection ideas, and lessons from real engagements. No
          newsletter theatre — just the write-ups that survived review.
        </p>
      </div>
      <NewsletterForm />
    </section>
  );
}
