import { useEffect, useState } from "react";
import icons from "./icons";
import { basePath } from "./content";
import { useStuck, useActiveSection, useSmoothScroll } from "./hooks";

export const navLinks = [
  { label: "About", href: "#about", id: "about" },
  { label: "Learning Roadmap", href: "#roadmap", id: "roadmap" },
  { label: "Practical Projects", href: "#projects", id: "projects" },
  { label: "Mentorship Details", href: "#program", id: "program" },
  { label: "FAQ", href: "#faq", id: "faq" },
  { label: "Contact", href: "#contact", id: "contact" },
];

const ids = navLinks.map((l) => l.id);

export default function MentorshipNavbar() {
  const stuck = useStuck(20);
  const active = useActiveSection(ids);
  const scrollTo = useSmoothScroll();
  const [open, setOpen] = useState(false);

  // Close the drawer on Escape and whenever we return to desktop width.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onResize = () => window.innerWidth > 1024 && setOpen(false);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = "";
    };
  }, [open]);

  const go = (e, href) => {
    setOpen(false);
    scrollTo(e, href);
  };

  const MenuIcon = open ? icons.close : icons.menu;

  return (
    <>
      <header className={`ms-nav${stuck ? " is-stuck" : ""}`}>
        <div className="ms-wrap ms-nav__inner">
          <a
            className="ms-nav__brand"
            href={`${basePath}/`}
            onClick={(e) => e.currentTarget.blur()}
            aria-label="Sathish M — back to portfolio home"
          >
            <span className="ms-nav__mark" aria-hidden="true">
              <icons.shield size={17} />
            </span>
            Sathish M
            <span className="ms-nav__label">Mentorship</span>
          </a>

          <nav className="ms-nav__links" aria-label="Mentorship sections">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`ms-nav__link${active === link.id ? " is-active" : ""}`}
                aria-current={active === link.id ? "true" : undefined}
                onClick={(e) => go(e, link.href)}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <a
            href="#contact"
            className="ms-btn ms-btn--primary ms-btn--sm ms-nav__cta"
            onClick={(e) => go(e, "#contact")}
          >
            Join mentorship
          </a>

          <button
            type="button"
            className="ms-nav__burger"
            aria-expanded={open}
            aria-controls="ms-drawer"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <MenuIcon size={20} />
          </button>
        </div>
      </header>

      {open && (
        <div className="ms-drawer" id="ms-drawer">
          <nav aria-label="Mentorship sections (mobile)">
            {navLinks.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                className={`ms-drawer__link${active === link.id ? " is-active" : ""}`}
                onClick={(e) => go(e, link.href)}
              >
                {link.label}
                <span>{String(i + 1).padStart(2, "0")}</span>
              </a>
            ))}
          </nav>
          <a href="#contact" className="ms-btn ms-btn--primary" onClick={(e) => go(e, "#contact")}>
            Join mentorship
          </a>
          <a
            href={`${basePath}/`}
            className="ms-btn ms-btn--ghost"
            style={{ marginTop: "0.7rem" }}
          >
            ← Back to portfolio
          </a>
        </div>
      )}
    </>
  );
}
