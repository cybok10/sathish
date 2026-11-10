import { FiArrowUpRight } from "react-icons/fi";

/**
 * Selected work.
 *
 * A plain, scannable grid: every project shows its title, what it is and
 * what it was built with without a hover, so the section works on a
 * touch screen, with a keyboard and for a screen reader. The cards are
 * buttons, because opening the detail view is the only action they have.
 */
export default function ProjectGrid({ projects, onSelect }) {
  return (
    <ul className="pf-projects">
      {projects.map((project, index) => (
        <li key={project.id} data-aos="fade-up" data-aos-duration="900" data-aos-delay={String(index * 120)}>
          <button
            type="button"
            className="pf-project"
            style={{ "--pf-accent": project.accent }}
            onClick={() => onSelect(project)}
          >
            <span className="pf-project__media">
              <img src={project.image} alt="" loading="lazy" decoding="async" />
              <span className="pf-project__type">{project.type}</span>
            </span>

            <span className="pf-project__body">
              <span className="pf-project__title">{project.title}</span>
              <span className="pf-project__subtitle">{project.subtitle}</span>
              <span className="pf-project__desc">{project.fullDescription}</span>
            </span>

            <span className="pf-project__foot">
              <span className="pf-project__tags">
                {project.tags.map((tag) => (
                  <span className="pf-project__tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </span>
              <span className="pf-project__cta">
                View the build
                <FiArrowUpRight size={14} aria-hidden="true" />
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
