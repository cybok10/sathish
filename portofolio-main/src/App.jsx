import { useEffect, useState } from "react";
import ProfileCard from "./components/ProfileCard/ProfileCard";
import BlurText from "./components/BlurText/BlurText";
import Lanyard from "./components/Lanyard/Lanyard";
import { listTools, listProyek } from "./data";
import ChromaGrid from "./components/ChromaGrid/ChromaGrid";
import ProjectModal from "./components/ProjectModal/ProjectModal";
import reviews from "../testimonials.json";

const experienceItems = [
  { date: "JUN 2026 — PRESENT", role: "Cybersecurity Researcher & Mentor", company: "RedTeam Hacker Academy", detail: "Offensive security research, hands-on web and network pentesting labs, and practical cybersecurity mentoring." },
  { date: "AUG 2025 — OCT 2025", role: "Penetration Testing Intern", company: "Cyber Nerd", detail: "Web and network penetration testing with Metasploit, Nmap and Burp Suite, plus Python automation for security workflows." },
  { date: "JUN 2024 — AUG 2024", role: "Ethical Hacking Intern", company: "Internship Studio", detail: "OSINT reconnaissance, vulnerability assessment and CVSS-based security reporting." },
  { date: "2022 — 2026", role: "B.E. Computer Science & Engineering", company: "Dhanalakshmi Srinivasan Engineering College", detail: "Computer Science graduate with a focus on security labs, CTF practice and applied cybersecurity projects." },
];

const certifications = [
  ["Certified Penetration Testing", "RedTeam Hacker Academy"],
  ["Advanced Ethical Hacking", "GUVI"],
  ["Offensive Pentesting", "Cybrary"],
  ["Networking Basics", "Cisco"],
  ["Linux, Network Security & Nmap", "Udemy"],
  ["Wireshark & Metasploit", "Infosys Springboard"],
];

function SectionTitle({ number, eyebrow, title, text }) {
  return (
    <div className="section-title">
      <div className="section-title-top"><span>{number}</span><span>{eyebrow}</span></div>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}

function App() {
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    document.title = "Sathish M — Cybersecurity";
  }, []);

  return (
    <>
      <div className="site-noise" aria-hidden="true" />
      <main className="site">
        <section className="hero-v3" id="home">
          <div className="hero-v3-grid" aria-hidden="true" />
          <div className="hero-v3-copy">
            <div className="availability"><i /> AVAILABLE FOR SECURITY WORK</div>
            <p className="hero-overline">CYBERSECURITY RESEARCHER / PENTESTER / MENTOR</p>
            <h1>Security is<br /><em>finding what<br />others miss.</em></h1>
            <BlurText
              text="I build, break and explain digital systems — from web applications and networks to security monitoring and hands-on labs."
              delay={45}
              animateBy="words"
              direction="top"
              className="hero-v3-description"
            />
            <div className="hero-v3-actions">
              <a className="v3-button v3-button-primary" href="/portofolio/assets/sathish/resume.pdf" download="Sathish_M_Resume.pdf">Download résumé <span>↗</span></a>
              <a className="v3-button v3-button-ghost" href="#project">Explore work <span>↓</span></a>
            </div>
            <div className="hero-v3-proof"><span>WEB SECURITY</span><span>NETWORK PENTESTING</span><span>SOC / SIEM</span></div>
          </div>
          <div className="hero-v3-card">
            <div className="card-orbit orbit-one" /><div className="card-orbit orbit-two" />
            <ProfileCard
              name="Sathish M"
              title="Cybersecurity Researcher"
              handle="cybok10"
              status="Available for security work"
              contactText="Contact"
              avatarUrl="/portofolio/assets/sathish/profile.png"
              showUserInfo
              enableTilt
              enableMobileTilt={false}
              onContactClick={() => { window.location.hash = "contact"; }}
            />
            <div className="hero-card-note"><span>01</span><span>OFFENSIVE SECURITY<br />WITH A DEFENSIVE MINDSET</span></div>
          </div>
          <div className="hero-scroll">SCROLL TO EXPLORE <span>↓</span></div>
        </section>

        <section className="intro-v3" id="about">
          <div className="intro-v3-statement">
            <SectionTitle number="01" eyebrow="PROFILE" title={<>Not just a toolset.<br /><strong>A security mindset.</strong></>} text="My work sits between offensive security, engineering and education. I like understanding how systems fail, proving it safely, and turning that knowledge into something useful." />
            <div className="intro-metrics">
              <div><strong>30+</strong><span>STUDENTS<br />MENTORED</span></div>
              <div><strong>4+</strong><span>YEARS OF<br />SECURITY LEARNING</span></div>
              <div><strong>8.6</strong><span>B.E. CSE<br />CGPA</span></div>
            </div>
          </div>
          <div className="intro-v3-object"><Lanyard position={[0, 0, 15]} gravity={[0, -40, 0]} /></div>
        </section>

        <section className="work-v3" id="skills">
          <SectionTitle number="02" eyebrow="CAPABILITIES" title={<>The areas I<br /><strong>work across.</strong></>} text="A practical security stack built through labs, projects, internships and teaching." />
          <div className="capability-grid">
            {listTools.map((tool, i) => (
              <article className="capability" key={tool.id}>
                <span className="cap-number">{String(i + 1).padStart(2, "0")}</span>
                <div className="cap-icon"><img src={tool.gambar} alt="" loading="lazy" /></div>
                <div><h3>{tool.nama}</h3><p>{tool.ket}</p></div>
              </article>
            ))}
          </div>
        </section>

        <section className="projects-v3" id="project">
          <div className="projects-heading">
            <SectionTitle number="03" eyebrow="SELECTED WORK" title={<>Built to<br /><strong>break things safely.</strong></>} text="Security projects, research ideas and deliberately vulnerable environments built for learning and experimentation." />
            <span className="project-count">04 / PROJECTS</span>
          </div>
          <ChromaGrid items={listProyek} onItemClick={setSelectedProject} radius={500} damping={0.5} fadeOut={0.7} ease="power3.out" />
        </section>

        <section className="experience-v3" id="experience">
          <SectionTitle number="04" eyebrow="EXPERIENCE" title={<>Where curiosity<br /><strong>became practice.</strong></>} />
          <div className="experience-list">
            {experienceItems.map((item, i) => (
              <article className="experience-row" key={item.role}>
                <span className="experience-index">0{i + 1}</span>
                <div className="experience-date">{item.date}</div>
                <div className="experience-main"><h3>{item.role}</h3><p className="experience-company">{item.company}</p><p>{item.detail}</p></div>
                <span className="experience-arrow">↗</span>
              </article>
            ))}
          </div>
        </section>

        <section className="learning-v3" id="certifications">
          <SectionTitle number="05" eyebrow="CERTIFICATIONS" title={<>Proof of<br /><strong>continuous learning.</strong></>} />
          <div className="cert-list">
            {certifications.map(([name, issuer], i) => (
              <article key={name} className="cert-row"><span>0{i + 1}</span><h3>{name}</h3><p>{issuer}</p><b>↗</b></article>
            ))}
          </div>
        </section>

        <section className="mentorship-v3" id="mentorship">
          <div className="mentorship-top">
            <SectionTitle number="06" eyebrow="MENTORSHIP" title={<>Security becomes<br /><strong>real when you do it.</strong></>} text="I teach through practical labs, realistic attack scenarios and the habit of asking why — not just which command to run." />
            <a href="/portofolio/mentorship" className="v3-button v3-button-ghost">Explore mentorship ↗</a>
          </div>
          <div className="mentorship-images">
            <img src="/portofolio/assets/sathish/images/students/classroom-session.jpeg" alt="Cybersecurity training session" loading="lazy" />
            <img src="/portofolio/assets/sathish/images/students/group-photo.jpeg" alt="Students at RedTeam Hacker Academy" loading="lazy" />
          </div>
          <div className="review-strip">
            {reviews.filter(r => r.approved).slice(0, 3).map(r => <blockquote key={r.id}>“{r.quote}”<cite>{r.name} · {r.track}</cite></blockquote>)}
          </div>
        </section>

        <section className="contact-v3" id="contact">
          <div className="contact-v3-head">
            <span>07 / CONTACT</span>
            <h2>Have a system<br /><em>worth breaking?</em></h2>
            <p>Let's talk about security research, penetration testing, training or your next project.</p>
            <a href="mailto:sathish1012cybok@gmail.com">sathish1012cybok@gmail.com ↗</a>
          </div>
          <form action="https://formsubmit.co/sathish1012cybok@gmail.com" method="POST" className="contact-v3-form" autoComplete="off">
            <label>Name<input type="text" name="Name" placeholder="Your name" required /></label>
            <label>Email<input type="email" name="Email" placeholder="you@example.com" required /></label>
            <label className="wide">Message<textarea name="message" rows="5" placeholder="Tell me what you're working on..." required /></label>
            <button type="submit">Send message <span>↗</span></button>
          </form>
        </section>

        <footer className="v3-footer">
          <span>© {new Date().getFullYear()} SATHISH M</span>
          <span>CYBERSECURITY / PENTESTING / MENTORSHIP</span>
          <div><a href="https://github.com/cybok10" target="_blank" rel="noreferrer">GitHub ↗</a><a href="https://linkedin.com/in/amsathish" target="_blank" rel="noreferrer">LinkedIn ↗</a></div>
        </footer>
      </main>
      <ProjectModal isOpen={Boolean(selectedProject)} onClose={() => setSelectedProject(null)} project={selectedProject} />
    </>
  );
}

export default App;
