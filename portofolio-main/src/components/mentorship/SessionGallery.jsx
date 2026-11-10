import { galleryNote, sessionGallery } from "./content";
import icons from "./icons";
import { useSmoothScroll } from "./hooks";

/**
 * In the room.
 *
 * Real photographs from live RedTeam Hacker Academy sessions. The grid
 * mixes the landscape and portrait frames so the page shows the work
 * rather than describing it.
 */
export default function SessionGallery() {
  const scrollTo = useSmoothScroll();

  return (
    <section className="ms-section" id="gallery">
      <div className="ms-wrap">
        <header className="ms-head ms-reveal">
          <p className="ms-eyebrow">02 — In the room</p>
          <h2 className="ms-title">
            Real sessions, <em>not stock photos.</em>
          </h2>
          <p className="ms-sub">
            Every frame below comes from a live RedTeam Hacker Academy session —
            the same format the mentorship runs in: the tools on screen, everyone
            working on their own machine, and questions asked out loud.
          </p>
        </header>

        <div className="ms-gallery-grid ms-reveal">
          {sessionGallery.map((item) => (
            <figure key={item.src} className={`ms-gallery-card ms-gallery-card--${item.size}`}>
              <img
                src={item.src}
                alt={item.alt}
                width={item.width}
                height={item.height}
                loading="lazy"
                decoding="async"
              />
              <figcaption>{item.caption}</figcaption>
            </figure>
          ))}

          <aside className="ms-gallery-note">
            <icons.monitor size={20} aria-hidden="true" />
            <h3>{galleryNote.title}</h3>
            <p>{galleryNote.body}</p>
            <a
              href={galleryNote.link.href}
              className="ms-btn ms-btn--ghost ms-btn--sm"
              onClick={(event) => scrollTo(event, galleryNote.link.href)}
            >
              {galleryNote.link.label} →
            </a>
          </aside>
        </div>
      </div>
    </section>
  );
}
