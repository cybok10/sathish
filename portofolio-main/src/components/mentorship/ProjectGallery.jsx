import { useState } from "react";
import icons from "./icons";
import { mentorProjects, labExercises } from "./content";
import { useSmoothScroll } from "./hooks";

const TABS = [
  { id: "exercises", label: "Lab exercises" },
  { id: "completed", label: "Projects I've built" },
];

function ProjectCard({ item, index, onEnquire }) {
  const isExercise = item.kind === "exercise";
  const Icon = isExercise ? icons.terminal : icons.shield;

  return (
    <li
      className="ms-card ms-proj ms-reveal"
      data-delay={String((index % 4) + 1)}
      key={item.id}
    >
      <div className="ms-proj__media">
        {item.image ? (
          <img
            src={item.image}
            alt=""
            width="1024"
            height="1024"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            className="ms-proj__graphic"
            style={{
              background: `radial-gradient(70% 70% at 50% 40%, ${item.accent}22, transparent 70%)`,
            }}
            aria-hidden="true"
          >
            <span
              className="ms-proj__glyph"
              style={{ borderColor: `${item.accent}66`, color: item.accent }}
            >
              <Icon size={30} />
            </span>
          </div>
        )}

        <span
          className={`ms-proj__kind ms-proj__kind--${item.kind}`}
        >
          {isExercise ? "Proposed exercise" : "Completed project"}
        </span>
        <span className="ms-proj__level">{item.level}</span>
        <span
          className="ms-proj__bar"
          style={{ background: `linear-gradient(90deg, ${item.accent}, transparent)` }}
          aria-hidden="true"
        />
      </div>

      <div className="ms-proj__body">
        <h3>{item.title}</h3>
        <p>{item.summary}</p>

        <div className="ms-proj__skills" aria-label="Skills learned">
          {item.skills.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>

        <div className="ms-proj__foot">
          <span>
            <icons.file
              size={12}
              aria-hidden="true"
              style={{ verticalAlign: -1, marginRight: 4 }}
            />
            {item.deliverable}
          </span>
          <button type="button" className="ms-proj__link" onClick={onEnquire}>
            Ask about this
            <icons.arrowUp size={13} aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  );
}

export default function ProjectGallery() {
  const [tab, setTab] = useState("exercises");
  const scrollTo = useSmoothScroll();

  const items = tab === "exercises" ? labExercises : mentorProjects;

  const enquire = (e) => {
    e.preventDefault();
    scrollTo(e, "#contact");
  };

  return (
    <section className="ms-section" id="projects" style={{ background: "var(--ms-bg-2)" }}>
      <div className="ms-grid-bg" aria-hidden="true" />
      <div className="ms-wrap" style={{ position: "relative" }}>
        <header className="ms-head ms-reveal">
          <p className="ms-eyebrow">Practical projects & labs</p>
          <h2 className="ms-title">
            Work you can <em>point at</em>
          </h2>
          <p className="ms-sub">
            Two clearly separated things: the types of exercises learners work through,
            and the projects I&apos;ve actually built myself. Nothing here is dressed up
            as something it isn&apos;t.
          </p>
        </header>

        <div className="ms-tabs ms-reveal" role="tablist" aria-label="Project view">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              className={`ms-tab${tab === t.id ? " is-active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <ul
          className="ms-proj-grid"
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
        >
          {items.map((item, i) => (
            <ProjectCard item={item} index={i} onEnquire={enquire} key={item.id} />
          ))}
        </ul>

        <p className="ms-tools__note" style={{ marginTop: "1.6rem" }}>
          <icons.info size={15} aria-hidden="true" />
          <span>
            {tab === "exercises"
              ? "These are proposed learning exercises — the type of work you may complete. They are not client engagements and no results or findings are being claimed."
              : "These are real projects I built, shown with their actual scope. Repository links aren't published on this page yet — ask if you'd like to see the code."}
          </span>
        </p>
      </div>
    </section>
  );
}
