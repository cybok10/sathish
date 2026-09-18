import { useEffect, useState } from "react";
import ProfileCard from "./components/ProfileCard/ProfileCard";
import ShinyText from "./components/ShinyText/ShinyText";
import BlurText from "./components/BlurText/BlurText";
import Lanyard from "./components/Lanyard/Lanyard";
import { listTools, listProyek } from "./data";
import ChromaGrid from "./components/ChromaGrid/ChromaGrid";
import ProjectModal from "./components/ProjectModal/ProjectModal";
import Aurora from "./components/Aurora/Aurora";
import reviews from "../testimonials.json";

const experienceItems = [
  {
    date: "JUN 2026 — PRESENT",
    role: "Cybersecurity Researcher & Mentor",
    company: "RedTeam Hacker Academy",
    detail:
      "Conduct offensive security research and build hands-on web and network pentesting labs. Mentor students in Metasploit, Burp Suite, Nmap, CTF problem-solving, and secure coding aligned with OWASP Top 10.",
  },
  {
    date: "AUG 2025 — OCT 2025",
    role: "Penetration Testing Intern",
    company: "Cyber Nerd",
    detail:
      "Conducted full-cycle web and network penetration tests with Metasploit, Nmap, and Burp Suite Pro; created Python tooling for vulnerability scanning, report generation, and system hardening.",
  },
  {
    date: "JUN 2024 — AUG 2024",
    role: "Ethical Hacking Intern",
    company: "Internship Studio",
    detail:
      "Performed OSINT reconnaissance, digital footprinting, and vulnerability assessments; delivered CVSS-rated remediation reports and built Python automation for reconnaissance workflows.",
  },
  {
    date: "2022 — 2026",
    role: "B.E. Computer Science & Engineering",
    company: "Dhanalakshmi Srinivasan Engineering College",
    detail:
      "Computer Science and Engineering graduate from Perambalur, Tamil Nadu, with additional security labs, CTF practice, and applied cybersecurity projects.",
  },
];

const certifications = [
  ["Certified Penetration Testing", "RedTeam Hacker Academy"],
  ["Advanced Ethical Hacking", "GUVI"],
  ["Offensive Pentesting", "Cybrary"],
  ["Networking Basics", "Cisco"],
  ["Linux, Network Security & Nmap", "Udemy"],
  ["Wireshark & Metasploit", "Infosys Springboard"],
  ["IoT Fundamentals", "NPTEL"],
];

const approvedReviews = reviews.filter((review) => review.approved);

function SectionHeading({ eyebrow, title, description, centered = false }) {
  return (
    <div className={`section-heading ${centered ? "section-heading--centered" : ""}`}>
      {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
      <h2>{title}</h2>
      {description && <p className="section-description">{description}</p>}
    </div>
  );
}

function App() {
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    document.title = "Sathish M | Cybersecurity Researcher";
  }, []);

  return (
    <>
      <div className="hero-aura" aria-hidden="true">
        <Aurora
          colorStops={["#7dff52", "#1c5961", "#071522"]}
          blend={0.22}
          amplitude={0.75}
          speed={0.22}
        />
      </div>

      <main className="portfolio-shell">
        <section className="hero" id="home">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span className="status-dot" />
              <span>CYBERSECURITY · PENTESTING · MENTORSHIP</span>
            </div>

            <p className="hero-label">OFFENSIVE SECURITY / SECURITY ENGINEERING</p>

            <h1>
              Hi, I’m <span>Sathish M</span>.
              <br />
              I find weaknesses
              <br />
              <span className="hero-accent">before attackers do.</span>
            </h1>

            <BlurText
              text="Cybersecurity researcher and mentor focused on web application security, penetration testing, security monitoring, and practical security education."
              delay={70}
              animateBy="words"
              direction="top"
              className="hero-description"
            />

            <div className="hero-actions">
              <a href="/portofolio/assets/sathish/resume.pdf" download="Sathish_M_Resume.pdf" className="button button-primary">
                Download CV
              </a>
              <a href="#project" className="button button-secondary">
                View projects <span>↗</span>
              </a>
            </div>

            <div className="hero-meta">
              <span><strong>Web</strong> Security</span>
              <span><strong>Network</strong> Pentesting</span>
              <span><strong>SOC</strong> Telemetry</span>
            </div>
          </div>

          <div className="hero-profile">
            <div className="hero-profile-glow" aria-hidden="true" />
            <ProfileCard
              name="Sathish M"
              title="Cybersecurity Researcher"
              handle="cybok10"
              status="Available for security work"
              contactText="Contact Me"
              avatarUrl="/portofolio/assets/sathish/profile.png"
              showUserInfo
              enableTilt
              enableMobileTilt={false}
              onContactClick={() => {
                window.location.hash = "contact";
              }}
            />
          </div>
        </section>

        <section className="about-section section-card" id="about">
          <div className="about-copy">
            <SectionHeading
              eyebrow="01 / PROFILE"
              title="Security mindset. Practical execution."
              description="I’m Sathish M, a cybersecurity researcher and penetration tester specializing in web application security, Active Directory, network pivoting, and SOC telemetry with Wazuh SIEM. I also mentor students through hands-on labs and CTF-style learning."
            />

            <div className="stats-grid">
              <div><strong>30+</strong><span>Students mentored</span></div>
              <div><strong>4+</strong><span>Years of security learning</span></div>
              <div><strong>8.6</strong><span>B.E. CSE CGPA</span></div>
            </div>

            <div className="quote-line">
              <span />
              <ShinyText text="Think like an attacker. Build stronger defenses." disabled={false} speed={4} />
            </div>
          </div>

          <div className="about-visual">
            <Lanyard position={[0, 0, 15]} gravity={[0, -40, 0]} />
          </div>
        </section>

        <section className="section-block" id="skills">
          <SectionHeading
            eyebrow="02 / SECURITY ARSENAL"
            title="Tools are useful. Methodology is the skill."
            description="A practical stack spanning offensive security, detection engineering, automation, and secure development."
          />

          <div className="tools-grid">
            {listTools.map((tool) => (
              <article className="tool-card" key={tool.id} data-aos="fade-up" data-aos-once="true">
                <div className="tool-icon">
                  <img src={tool.gambar} alt="" loading="lazy" />
                </div>
                <div>
                  <h3>{tool.nama}</h3>
                  <p>{tool.ket}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section-block" id="project">
          <SectionHeading
            eyebrow="03 / SELECTED WORK"
            title="Projects built around real security problems."
            description="Labs, detection pipelines, and security-focused products designed to demonstrate practical problem-solving."
            centered
          />

          <ChromaGrid
            items={listProyek}
            onItemClick={setSelectedProject}
            radius={420}
            damping={0.45}
            fadeOut={0.6}
            ease="power3.out"
          />
        </section>

        <section className="section-block" id="experience">
          <SectionHeading
            eyebrow="04 / EXPERIENCE"
            title="Hands-on from labs to mentoring."
            description="A concise timeline of security work, internships, mentoring, and academic foundations."
            centered
          />

          <div className="experience-timeline">
            {experienceItems.map((item) => (
              <article className="timeline-entry" key={item.role}>
                <div className="timeline-marker" aria-hidden="true" />
                <div className="timeline-card">
                  <p className="timeline-date">{item.date}</p>
                  <h3>{item.role}</h3>
                  <p className="timeline-company">{item.company}</p>
                  <p className="timeline-detail">{item.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section-block" id="certifications">
          <SectionHeading
            eyebrow="05 / LEARNING"
            title="Certifications & training."
            description="Selected training completed across offensive security, networking, Linux, and security tooling."
            centered
          />

          <div className="cert-grid">
            {certifications.map(([certificate, issuer]) => (
              <article className="cert-card" key={certificate}>
                <span className="cert-index">CERT /</span>
                <h3>{certificate}</h3>
                <p>{issuer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-block" id="mentorship">
          <SectionHeading
            eyebrow="06 / MENTORSHIP"
            title="Learn security by doing."
            description="I use practical labs, clear explanations, and real-world scenarios to help learners build confidence."
            centered
          />

          <div className="mentorship-media">
            <img src="/portofolio/assets/sathish/images/students/classroom-session.jpeg" alt="Sathish leading a cybersecurity training session" loading="lazy" />
            <img src="/portofolio/assets/sathish/images/students/group-photo.jpeg" alt="Students at RedTeam Hacker Academy" loading="lazy" />
          </div>

          <div className="reviews-marquee" aria-label="Student reviews">
            <div className="reviews-track">
              {[...approvedReviews, ...approvedReviews].map((review, index) => (
                <article
                  key={`${review.id}-${index}`}
                  className="review-float-card"
                  aria-hidden={index >= approvedReviews.length}
                >
                  <p className="review-stars">{"★".repeat(review.rating)}</p>
                  <p className="review-quote">“{review.quote}”</p>
                  <p className="review-name">{review.name}</p>
                  <p className="review-track">{review.track}</p>
                </article>
              ))}
            </div>
          </div>

          <a href="/portofolio/mentorship" className="mentorship-cta">
            Explore mentorship <span>↗</span>
          </a>
        </section>

        <section className="contact-section section-card" id="contact">
          <div className="contact-copy">
            <SectionHeading
              eyebrow="07 / CONTACT"
              title="Let’s make systems harder to break."
              description="Looking for a penetration tester, application-security researcher, or hands-on cybersecurity trainer? Let’s collaborate."
            />

            <div className="contact-links">
              <a href="mailto:sathish1012cybok@gmail.com">sathish1012cybok@gmail.com</a>
              <a href="tel:+918940599732">+91 89405 99732</a>
              <a href="https://linkedin.com/in/amsathish" target="_blank" rel="noreferrer">LinkedIn ↗</a>
              <a href="https://github.com/cybok10" target="_blank" rel="noreferrer">GitHub ↗</a>
            </div>
          </div>

          <form action="https://formsubmit.co/sathish1012cybok@gmail.com" method="POST" className="contact-form" autoComplete="off">
            <label>
              Full name
              <input type="text" name="Name" placeholder="Your name" required />
            </label>
            <label>
              Email
              <input type="email" name="Email" placeholder="you@example.com" required />
            </label>
            <label className="contact-form-wide">
              Message
              <textarea name="message" rows="6" placeholder="Tell me what you’re working on..." required />
            </label>
            <button type="submit" className="button button-primary contact-submit">
              Send message <span>↗</span>
            </button>
          </form>
        </section>
      </main>

      <ProjectModal
        isOpen={Boolean(selectedProject)}
        onClose={() => setSelectedProject(null)}
        project={selectedProject}
      />
    </>
  );
}

export default App;
