import { useState, useEffect } from "react";

const Navbar = ({ hidden = false }) => {
  // ⛔ Saat hidden, jangan render apa pun
  if (hidden) return null;

  const [active, setActive] = useState(false);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const isMentorshipPage = window.location.pathname.replace(/\/$/, '') === `${basePath}/mentorship`;

  useEffect(() => {
    const handleScroll = () => setActive(window.scrollY > 150);
    handleScroll(); // init posisi saat mount
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className="navbar relative z-50 py-7 flex items-center justify-between px-6 md:px-12">
      {/* Logo */}
      <div className="logo">
        <h1 className="text-3xl font-bold text-white p-1 md:bg-transparent md:text-white">
          Sathish M
        </h1>
      </div>

      {/* Menu */}
      <ul
        className={`flex items-center sm:gap-10 gap-4 
          md:static fixed left-1/2 -translate-x-1/2 md:translate-x-0 
          md:opacity-100 bg-white/10 backdrop-blur-md 
          md:bg-transparent md:backdrop-blur-none
          p-4 rounded-br-2xl rounded-bl-2xl 
          transition-all md:transition-none
          ${active ? "top-0 opacity-100" : "-top-10 opacity-0"}`}
      >
        <li><a href={isMentorshipPage ? `${basePath}/` : "#home"} className="sm:text-lg text-base font-medium">Home</a></li>
        <li><a href="#about" className="sm:text-lg text-base font-medium">About</a></li>
        <li><a href="#project" className="sm:text-lg text-base font-medium">Projects</a></li>
        <li><a href="#experience" className="sm:text-lg text-base font-medium">Experience</a></li>
        <li><a href="/portofolio/mentorship" className="sm:text-lg text-base font-medium">Mentorship</a></li>
        <li><a href="#contact" className="sm:text-lg text-base font-medium">Contact</a></li>
      </ul>
    </nav>
  );
};

export default Navbar;
