import { useEffect, useState } from "react";

const Navbar = ({ hidden = false }) => {
  const [scrolled, setScrolled] = useState(false);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const isMentorship = window.location.pathname.replace(/\/$/, "") === `${basePath}/mentorship`;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (hidden) return null;

  const link = (hash) => isMentorship ? `${basePath}/${hash}` : hash;

  return (
    <nav className={`nav-v3 ${scrolled ? "nav-v3-scrolled" : ""}`}>
      <a className="nav-v3-logo" href={isMentorship ? `${basePath}/` : "#home"}><span>S</span><strong>SATHISH M</strong></a>
      <div className="nav-v3-links">
        <a href={link("#about")}>About</a><a href={link("#project")}>Work</a><a href={link("#experience")}>Experience</a><a href={`${basePath}/mentorship`}>Mentorship</a><a href={link("#contact")}>Contact</a>
      </div>
      <a className="nav-v3-status" href={link("#contact")}><i /> LET'S TALK</a>
    </nav>
  );
};

export default Navbar;
