import { mentor } from "./content";
import icons from "./icons";

const COLUMNS = [
  {
    title: "Mentorship",
    links: [
      { label: "Session offers", href: "#offers" },
      { label: "Learning roadmap", href: "#roadmap" },
      { label: "Who it is for", href: "#audience" },
      { label: "Mentorship details", href: "#program" },
      { label: "Questions", href: "#faq" },
    ],
  },
  {
    title: "Work",
    links: [
      { label: "Completed projects", href: "#projects" },
      { label: "Tools & environment", href: "#tools" },
      { label: "Learner feedback", href: "#testimonials" },
      { label: "About the mentor", href: "#about" },
    ],
  },
];

export default function MentorshipFooter() {
  return (
    <footer className="ms-footer">
      <div className="ms-wrap">
        <div className="ms-footer__top">
          <div>
            <div className="ms-footer__brand">
              <span className="ms-nav__mark" aria-hidden="true">
                SM
              </span>
              {mentor.name}
            </div>
            <p className="ms-footer__desc">
              Offensive security research, penetration testing and hands-on mentorship.
              Practical work in authorised environments, with a roadmap you can actually
              follow.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div className="ms-footer__col" key={column.title}>
              <h4>{column.title}</h4>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="ms-footer__bottom">
          <p>© {new Date().getFullYear()} {mentor.name} — mentorship & offensive research</p>
          <div className="ms-footer__social">
            {mentor.links.map((link) => {
              const Icon = icons[link.icon] || icons.link;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                >
                  <Icon size={17} />
                </a>
              );
            })}
            <a href={`mailto:${mentor.email}`} aria-label="Email">
              <icons.mail size={17} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
