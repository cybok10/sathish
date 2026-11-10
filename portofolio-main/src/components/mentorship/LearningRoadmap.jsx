import { useState } from "react";
import icons from "./icons";
import { roadmapStages } from "./content";
import { useSmoothScroll } from "./hooks";

export default function LearningRoadmap() {
  const [open, setOpen] = useState(1); // first stage expanded by default
  const scrollTo = useSmoothScroll();

  const toggle = (n) => setOpen((cur) => (cur === n ? -1 : n));

  return (
    <section className="ms-section" id="roadmap">
      <div className="ms-wrap">
        <header className="ms-head ms-reveal">
          <p className="ms-eyebrow">03 — Cybersecurity learning roadmap</p>
          <h2 className="ms-title">
            Eight stages, <em>one coherent path</em>
          </h2>
          <p className="ms-sub">
            Not a list of topics — a sequence with reasoning behind it. Each stage ends
            in something you can demonstrate. Expand any stage to see objectives, tools
            and the outcome you should be able to show.
          </p>
        </header>

        <div className="ms-road ms-reveal" data-delay="1">
          <div className="ms-road__line" aria-hidden="true" />
          <ol className="ms-road__list">
            {roadmapStages.map((stage, i) => {
              const isOpen = open === stage.n;
              const panelId = `ms-stage-panel-${stage.n}`;
              const headId = `ms-stage-head-${stage.n}`;
              return (
                <li className={`ms-stage${isOpen ? " is-open" : ""}`} key={stage.n}>
                  <span
                    className="ms-stage__dot"
                    aria-hidden="true"
                    data-delay={String(Math.min(i, 7))}
                  >
                    {String(stage.n).padStart(2, "0")}
                  </span>

                  <h3 style={{ margin: 0 }}>
                    <button
                      type="button"
                      className="ms-stage__head"
                      id={headId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggle(stage.n)}
                    >
                      <span className="ms-stage__meta">
                        <span className="ms-stage__no">Stage {String(stage.n).padStart(2, "0")}</span>
                        <span className="ms-stage__title">{stage.title}</span>
                      </span>
                      <span className="ms-stage__toggle" aria-hidden="true">
                        <icons.plus size={16} />
                      </span>
                    </button>
                  </h3>

                  <div
                    className="ms-stage__panel"
                    id={panelId}
                    role="region"
                    aria-labelledby={headId}
                  >
                    <div className="ms-stage__panelInner">
                      <div className="ms-stage__body">
                        <p className="ms-stage__summary">{stage.summary}</p>

                        <div className="ms-stage__cols">
                          <div className="ms-stage__col">
                            <h4>Learning objectives</h4>
                            <ul>
                              {stage.objectives.map((o) => (
                                <li key={o}>{o}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="ms-stage__col">
                            <h4>Tools & technologies</h4>
                            <div className="ms-stage__tools">
                              {stage.tools.map((t) => (
                                <span className="ms-stage__tool" key={t}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="ms-stage__outcome">
                          <icons.checkCircle size={17} aria-hidden="true" />
                          <span>
                            <strong style={{ color: "var(--ms-text)" }}>Outcome: </strong>
                            {stage.outcome}
                          </span>
                        </div>

                        {stage.note && <p className="ms-stage__note">{stage.note}</p>}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="ms-road__foot">
            <p className="ms-stage__note" style={{ marginBottom: "1.1rem" }}>
              Pacing varies with your starting point and weekly availability — the
              roadmap is a sequence, not a fixed calendar. Duration is agreed with you
              before you start.
            </p>
            <a
              href="#program"
              className="ms-btn ms-btn--ghost"
              onClick={(e) => scrollTo(e, "#program")}
            >
              See how the mentorship works
              <icons.arrow size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
