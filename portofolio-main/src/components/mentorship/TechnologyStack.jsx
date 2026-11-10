import icons from "./icons";
import { toolGroups, toolDisclaimer } from "./content";

export default function TechnologyStack() {
  return (
    <section className="ms-section" id="tools">
      <div className="ms-wrap">
        <header className="ms-head ms-reveal">
          <p className="ms-eyebrow">Tools & technologies</p>
          <h2 className="ms-title">
            A focused stack, <em>not a logo wall</em>
          </h2>
          <p className="ms-sub">
            Grouped by what they&apos;re for, so you can see the shape of the work —
            networking, testing, detection and the automation that ties them together.
          </p>
        </header>

        <ul className="ms-tools">
          {toolGroups.map((g, i) => {
            const Icon = icons[g.icon];
            return (
              <li
                className="ms-card ms-toolgroup ms-reveal"
                data-delay={String((i % 5) + 1)}
                key={g.id}
              >
                <div className="ms-toolgroup__head">
                  <span className="ms-toolgroup__icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <div>
                    <h3>{g.title}</h3>
                    <p>{g.blurb}</p>
                  </div>
                </div>
                <ul aria-label={`${g.title} tools`}>
                  {g.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>

        <p className="ms-tools__note">
          <icons.info size={15} aria-hidden="true" />
          <span>{toolDisclaimer}</span>
        </p>
      </div>
    </section>
  );
}
