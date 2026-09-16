import { useEffect, useState } from 'react';
import initialReviews from '../testimonials.json';

const projects = [
  {
    id: '01',
    num: '01 / 04',
    category: 'SECURITY LAB',
    title: 'VulnLab — Vulnerable Web App for Pentesters',
    tagline: 'CTF training target with automated scoring',
    description: 'Deliberately vulnerable web application covering SQLi, XSS, IDOR, CSRF, Command Injection, and File Upload in an isolated Docker environment with automated CTF-style scoring.',
    metrics: '6 Attack Vectors · Isolated Docker CTF',
    tags: ['Docker', 'CTF Scoring', 'Web Security', 'OWASP'],
    accent: 'var(--lime)',
    icon: '/images/icons/target.png',
    linkText: 'Explore Lab ↗',
    href: '#contact',
  },
  {
    id: '02',
    num: '02 / 04',
    category: 'NETWORK DEFENSE',
    title: 'AI-Driven Network Intrusion Detection System',
    tagline: 'Deep packet anomaly classifier & alert harness',
    description: 'Machine learning-based IDS utilizing Scikit-learn and TensorFlow on live network traffic captures, tightly integrated with Snort and Wireshark for deep packet inspection and automated alerting.',
    metrics: 'TensorFlow ML · Snort Rule Engine',
    tags: ['Python', 'TensorFlow', 'Snort', 'Wireshark'],
    accent: 'var(--purple)',
    icon: '/images/icons/setting.png',
    linkText: 'View Pipeline ↗',
    href: '#contact',
  },
  {
    id: '03',
    num: '03 / 04',
    category: 'CLOUD SECURITY',
    title: 'Centralized Log Monitoring — GCP & Wazuh',
    tagline: 'Enterprise SOC pipeline with Python alert workflows',
    description: 'Enterprise SIEM architecture ingesting Apache and system logs into Wazuh deployed on Google Cloud Platform. Features real-time dashboards, anomaly detection, and automated incident triage scripts.',
    metrics: 'Wazuh SIEM · Real-time GCP Dashboards',
    tags: ['GCP', 'Wazuh SIEM', 'Apache', 'Python'],
    accent: 'var(--cyan)',
    icon: '/images/icons/computer.png',
    linkText: 'View Telemetry ↗',
    href: '#contact',
  },
  {
    id: '04',
    num: '04 / 04',
    category: 'SECURE PLATFORM',
    title: 'SkillPath AI — Cybersecurity Roadmap Engine',
    tagline: 'Personalized adversarial learning paths',
    description: 'Secure AI platform built with FastAPI and SQLite that delivers personalized cybersecurity roadmaps guided by OWASP secure coding principles, role requirements, and interactive assessments.',
    metrics: 'FastAPI Backend · OWASP Secure Architecture',
    tags: ['FastAPI', 'SQLite', 'OWASP', 'REST API'],
    accent: 'var(--gold)',
    icon: '/images/icons/rocket.png',
    linkText: 'Inspect Platform ↗',
    href: '#contact',
  },
];

const skillDomains = [
  {
    id: 'pentest',
    title: 'Offensive Operations',
    subtitle: 'RED TEAM & EXPLOITATION',
    icon: '/images/icons/target.png',
    iconAccent: '#7c3aed',
    glow: 'rgba(124, 58, 237, 0.3)',
    skills: [
      { name: 'Penetration Testing', pct: 92 },
      { name: 'Metasploit / Exploit Dev', pct: 88 },
      { name: 'Burp Suite Pro', pct: 90 },
      { name: 'Nmap & Recon', pct: 95 },
      { name: 'Privilege Escalation', pct: 85 },
      { name: 'Fuzzing & CVE Research', pct: 78 },
    ],
  },
  {
    id: 'web',
    title: 'Web & API Defense',
    subtitle: 'OWASP & APPLICATION SECURITY',
    icon: '/images/icons/shield.png',
    iconAccent: '#0ea5e9',
    glow: 'rgba(14, 165, 233, 0.3)',
    skills: [
      { name: 'OWASP Top 10 Flaws', pct: 95 },
      { name: 'SQLi, XSS, SSRF & CSRF', pct: 90 },
      { name: 'JWT / OAuth 2.0 Audits', pct: 85 },
      { name: 'API Security Testing', pct: 88 },
      { name: 'OWASP ZAP / Postman', pct: 82 },
      { name: 'Threat Modeling', pct: 80 },
    ],
  },
  {
    id: 'directory',
    title: 'Active Directory & Net',
    subtitle: 'DOMAIN ATTACKS & NETWORK PIVOTING',
    icon: '/images/icons/key.png',
    iconAccent: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.3)',
    skills: [
      { name: 'AD Pentesting', pct: 88 },
      { name: 'Kerberos Attacks', pct: 82 },
      { name: 'NTLM Relay / Pass-Hash', pct: 85 },
      { name: 'BloodHound / Impacket', pct: 80 },
      { name: 'Network Pivoting', pct: 87 },
      { name: 'DNS & SMB Enumeration', pct: 90 },
    ],
  },
  {
    id: 'siem',
    title: 'Detection & SIEM',
    subtitle: 'SOC TELEMETRY & MONITORING',
    icon: '/images/icons/lock.png',
    iconAccent: '#10b981',
    glow: 'rgba(16, 185, 129, 0.3)',
    skills: [
      { name: 'Wazuh SIEM', pct: 92 },
      { name: 'Log Ingestion & IOC Hunt', pct: 85 },
      { name: 'Snort IDS Rules', pct: 80 },
      { name: 'GCP Cloud Logging', pct: 78 },
      { name: 'Incident Triage', pct: 88 },
      { name: 'Splunk Basics', pct: 72 },
    ],
  },
  {
    id: 'code',
    title: 'Security Engineering',
    subtitle: 'AUTOMATION & TOOLING',
    icon: '/images/icons/computer.png',
    iconAccent: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.3)',
    skills: [
      { name: 'Python 3', pct: 93 },
      { name: 'Bash Scripting', pct: 90 },
      { name: 'FastAPI / REST APIs', pct: 85 },
      { name: 'Custom PoC Tools', pct: 88 },
      { name: 'React / Frontend', pct: 80 },
      { name: 'Linux & Git', pct: 95 },
    ],
  },
];

const navItems = [
  ['Home', 'home'],
  ['About', 'about'],
  ['Skills', 'skills'],
  ['Work', 'work'],
  ['Certs', 'certifications'],
  ['Mentorship', 'mentorship'],
  ['Contact', 'contact'],
];

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('sathish-theme') || 'dark';
  });
  const [filter, setFilter] = useState('all');
  const [menuOpen, setMenuOpen] = useState(false);
  const [reviewTab, setReviewTab] = useState('cards'); // 'cards' or 'screenshots'
  const [reviews, setReviews] = useState(initialReviews);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sathish-theme', theme);
  }, [theme]);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_TESTIMONIALS_URL || 'http://localhost:8001/api/testimonials';
    fetch(apiUrl)
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setReviews(data.filter(item => item.approved));
        }
      })
      .catch(() => {
        // Fallback already preloaded from initialReviews
      });
  }, []);

  const toggleTheme = () => {
    setTheme(curr => (curr === 'dark' ? 'light' : 'dark'));
  };

  const visibleDomains =
    filter === 'all' ? skillDomains : skillDomains.filter(d => d.id === filter);

  return (
    <>
      <div className="cyber-grid" aria-hidden="true" />
      <div className="noise" aria-hidden="true" />

      {/* Header */}
      <header className="site-header">
        <a className="brand" href="#home" aria-label="Sathish M, home">
          <span className="brand-mark">S</span>
          <span className="brand-text">
            Sathish<span className="brand-accent">.m</span>
          </span>
          <span className="status-badge" title="Active in offensive research">
            <span className="pulse-dot" /> RED TEAM
          </span>
        </a>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(open => !open)}
          aria-controls="site-nav"
          aria-expanded={menuOpen}
          aria-label="Toggle navigation"
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={menuOpen ? 'open' : ''} id="site-nav" aria-label="Main navigation">
          {navItems.map(([label, id]) => (
            <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>
              {label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Toggle ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? '☼ Light' : '☾ Dark'}
          </button>
          <a className="header-contact" href="#contact">
            Let’s Talk <span>↗</span>
          </a>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero section" id="home">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="pulse" />
              <span>OFFENSIVE SECURITY RESEARCHER & MENTOR</span>
            </div>
            <h1>
              Security is not<br />
              <em>an afterthought.</em>
            </h1>
            <p className="hero-text">
              I identify and dismantle vulnerabilities before they become critical breaches — across web, Active Directory, network, and cloud ecosystems.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#work">
                Explore Projects <span>↓</span>
              </a>
              <a className="button secondary" href="/resume.pdf" download="Sathish_M_Resume.pdf">
                Download Résumé <span>↓</span>
              </a>
            </div>
            <div className="hero-meta">
              <span className="meta-item">
                <i className="status-indicator" /> Tamil Nadu, India
              </span>
              <span className="meta-separator" />
              <span className="meta-item">Available for Security Eng & Pentest Roles</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="Cyber threat matrix and offensive telemetry HUD">
            <div className="radar-grid" />
            <div className="radar-sweep" />
            <div className="orbital orbital-one" />
            <div className="orbital orbital-two" />
            
            <div className="core">
              <div className="core-inner">
                <img src="/images/icons/shield.png" alt="Cybersecurity Shield" className="hero-shield-icon" />
                <small>RED TEAM / OFFENSIVE</small>
              </div>
            </div>

            <div className="node node-a">
              <i /> WEB VAPT
            </div>
            <div className="node node-b">
              <i /> ACTIVE DIR
            </div>
            <div className="node node-c">
              <i /> CLOUD SIEM
            </div>

            <div className="tech-pod pod-react">
              <span className="pod-icon">⚡</span> BURP SUITE
            </div>
            <div className="tech-pod pod-tailwind">
              <span className="pod-icon">🛡</span> WAZUH SIEM
            </div>
            <div className="tech-pod pod-python">
              <span className="pod-icon">🐍</span> PYTHON
            </div>

            <p className="visual-caption">THREAT SURFACE // LIVE SCAN</p>
          </div>
        </section>

        {/* Signal Strip */}
        <section className="signal-strip" aria-label="Core competencies ticker">
          <span>WEB APPLICATION PENTESTING</span>
          <i />
          <span>OFFENSIVE RESEARCH & POC</span>
          <i />
          <span>ACTIVE DIRECTORY ATTACKS</span>
          <i />
          <span>WAZUH & CLOUD SOC</span>
          <i />
          <span>PYTHON AUTOMATION</span>
          <i />
          <span>CYBERSECURITY MENTORSHIP</span>
        </section>

        {/* About Section */}
        <section className="section about" id="about">
          <div className="section-label">
            <span>01</span>
            <p>About Me</p>
          </div>
          <div className="about-content">
            <h2>
              I think like an attacker<br />
              to build <em>unbreakable defenses.</em>
            </h2>
            <div className="about-right">
              <p>
                I’m a cybersecurity researcher and penetration tester specializing in discovering high-impact flaws before threat actors do. My expertise covers web application security (OWASP Top 10, business logic flaws), internal network pivoting, and SOC-based telemetry with Wazuh SIEM.
              </p>
              <p>
                Alongside security auditing, I have mentored over 30 students at RedTeam Hacker Academy, converting complex security concepts into hands-on lab environments and CTF-style mastery.
              </p>
              <a className="arrow-link" href="#contact">
                Initiate Conversation <span>↘</span>
              </a>
            </div>
          </div>

          <div className="facts">
            <div>
              <span className="fact-number">30+</span>
              <span className="fact-label">Students Mentored</span>
            </div>
            <div>
              <span className="fact-number">3+</span>
              <span className="fact-label">Security Eng Roles</span>
            </div>
            <div>
              <span className="fact-number">8.6</span>
              <span className="fact-label">B.E. CSE CGPA</span>
            </div>
            <div>
              <span className="fact-number">100%</span>
              <span className="fact-label">Hands-on Practical</span>
            </div>
          </div>
        </section>

        {/* Skills Section — Progress Bar Design */}
        <section className="section skills" id="skills">
          <SectionHeading
            number="02"
            label="Skills &amp; Arsenal"
            note={<>Domain expertise<br />mapped to real attack surfaces.</>}
          />
          <div className="skill-bars-grid">
            {skillDomains.map(domain => (
              <article
                className="skill-bar-card"
                key={domain.id}
                style={{ '--card-glow': domain.glow, '--icon-accent': domain.iconAccent }}
              >
                <div className="sbc-header">
                  <div className="sbc-icon-wrap" style={{ background: domain.iconAccent + '22', borderColor: domain.iconAccent + '44' }}>
                    <img src={domain.icon} alt={domain.title} className="sbc-icon" loading="lazy" />
                  </div>
                  <div className="sbc-title-block">
                    <h3 className="sbc-title">{domain.title}</h3>
                    <span className="sbc-subtitle">{domain.subtitle}</span>
                  </div>
                </div>
                <div className="sbc-skills">
                  {domain.skills.map(skill => (
                    <div className="sbc-skill-row" key={skill.name}>
                      <div className="sbc-skill-meta">
                        <span className="sbc-skill-name">{skill.name}</span>
                        <span className="sbc-skill-pct" style={{ color: domain.iconAccent }}>{skill.pct}%</span>
                      </div>
                      <div className="sbc-bar-track">
                        <div className="sbc-bar-fill" style={{ width: `${skill.pct}%`, background: domain.iconAccent }} />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Work / Projects Section — Minimal Cards */}
        <section className="section work" id="work">
          <SectionHeading
            number="03"
            label="Selected Work"
            note={<>Practical security environments,<br />defensive pipelines & custom tooling.</>}
          />
          <div className="projects-grid">
            {projects.map(project => (
              <article
                className="project-card"
                key={project.id}
                style={{ '--project-accent': project.accent }}
              >
              <div className="project-card-top">
                  <div className="project-badge-wrap">
                    <span className="project-num">{project.num}</span>
                    <span className="project-cat">{project.category}</span>
                  </div>
                  <img
                    src={project.icon}
                    alt={`${project.category} 3D icon`}
                    className="project-card-icon"
                    loading="lazy"
                  />
                  <a href={project.href} className="project-link-btn" title="Discuss or explore project">
                    {project.linkText}
                  </a>
                </div>

                <div className="project-card-body">
                  <h3 className="project-title">{project.title}</h3>
                  <p className="project-tagline">{project.tagline}</p>
                  <p className="project-desc">{project.description}</p>
                </div>

                <div className="project-card-footer">
                  <div className="project-metric-pill">
                    <i className="metric-dot" />
                    <span>{project.metrics}</span>
                  </div>
                  <div className="project-tags">
                    {project.tags.map(tag => (
                      <span className="project-tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Skills Section — Redesigned Minimal & 3D */}
        <section className="section skills" id="skills">
          <SectionHeading
            number="03"
            label="Skills & Arsenal"
            note={<>Refined domain clusters,<br />core competencies & tactical tooling.</>}
          />
          <div className="skill-tabs" role="tablist" aria-label="Skill categories">
            {[
              ['all', 'All Domains'],
              ['pentest', 'Offensive & VAPT'],
              ['web', 'Web & API'],
              ['directory', 'Active Directory'],
              ['siem', 'SIEM & SOC'],
              ['code', 'Engineering & Code'],
            ].map(([key, label]) => (
              <button
                key={key}
                className={filter === key ? 'selected' : ''}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="skills-domain-grid">
            {visibleDomains.map(domain => (
              <article
                className="domain-card"
                key={domain.id}
                style={{ '--glow-color': domain.glow }}
              >
                <div className="domain-visual-wrap">
                  <img
                    src={domain.image3d}
                    alt={`${domain.title} 3D element`}
                    className="domain-3d-img"
                    loading="lazy"
                  />
                  <div className="domain-glow" />
                </div>

                <div className="domain-content">
                  <div className="domain-header">
                    <div className="domain-header-top">
                      <span className="domain-vector">{domain.vector}</span>
                      <img
                        src={domain.icon}
                        alt={`${domain.title} icon`}
                        className="domain-icon-sm"
                        loading="lazy"
                      />
                    </div>
                    <h3 className="domain-title">{domain.title}</h3>
                  </div>
                  <p className="domain-desc">{domain.description}</p>

                  <div className="domain-tools-section">
                    <span className="section-micro-label">PRIMARY ARSENAL</span>
                    <div className="tools-pills">
                      {domain.tools.map(tool => (
                        <span className="tool-pill" key={tool}>
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="domain-comp-section">
                    <span className="section-micro-label">CORE CAPABILITIES</span>
                    <div className="comp-list">
                      {domain.competencies.map(comp => (
                        <span className="comp-item" key={comp}>
                          <i className="comp-dot" />
                          {comp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Experience Section */}
        <section className="section experience">
          <div className="section-label">
            <span>04</span>
            <p>Experience & Journey</p>
          </div>
          <div className="timeline">
            <Experience
              date="JUN 2026 — PRESENT"
              role={<>Cybersecurity Researcher <span>& Technical Mentor</span></>}
              company="RedTeam Hacker Academy"
              detail="Conducted offensive research, built simulated vulnerable lab targets, and instructed students in web pentesting, CTF problem solving, Active Directory concepts, and OWASP Top 10 remediation."
            />
            <Experience
              date="AUG — OCT 2025"
              role="Penetration Testing Intern"
              company="Cyber Nerd"
              detail="Conducted comprehensive web and network penetration tests, automated reconnaissance workflows with custom Python scripts, and delivered CVSS v3 remediation advisories."
            />
            <Experience
              date="JUN — AUG 2024"
              role="Ethical Hacking Intern"
              company="Internship Studio"
              detail="Performed OSINT reconnaissance, digital footprint analysis, automated vulnerability assessments, and generated client-ready executive security reports."
            />
          </div>

          <div className="education">
            <span className="edu-icon">ENG</span>
            <div>
              <p className="project-type">ACADEMIC BACKGROUND // 2022 — PRESENT</p>
              <h3>B.E. Computer Science and Engineering</h3>
              <p>Dhanalakshmi Srinivasan Engineering College (Autonomous), Perambalur, Tamil Nadu · <strong>CGPA: 8.6</strong></p>
            </div>
          </div>

          <div className="credentials">
            <p className="project-type">CERTIFICATIONS & TRAINING</p>
            <p>
              <strong>Certified Penetration Testing (CPT)</strong> — RedTeam Hacker Academy · <strong>Advanced Ethical Hacking</strong> — GUVI · <strong>Offensive Pentesting</strong> — Cybrary · <strong>Networking Basics</strong> — Cisco · <strong>Linux, Network Security, Nmap</strong> — Udemy · <strong>Wireshark & Metasploit</strong> — Infosys Springboard · <strong>IoT Fundamentals</strong> — NPTEL
            </p>
          </div>
        </section>

        {/* Mentorship & Student Reviews Section */}
        <section className="section mentorship" id="mentorship">
          <SectionHeading
            number="05"
            label="Mentorship & Impact"
            note={<>Training the next generation<br />of ethical hackers and defenders.</>}
          />

          <div className="mentor-grid">
            <div className="mentor-intro">
              <p className="big-number">
                30<span>+</span>
              </p>
              <p className="mentor-copy">
                Students mentored through hands-on labs, CTF challenges, and real-world ethical hacking at RedTeam Hacker Academy.
              </p>
              <div className="workshop-line">
                <span>WORKSHOPS</span>
                <p>
                  OWASP Community Meetup Coimbatore · Ethical Hacking Workshop, NIT · Python Workshop, IIT Madras
                </p>
              </div>
            </div>
            <StudentGallery />
          </div>

          {/* Testimonials Header & Tabs */}
          <div className="testimonials-heading">
            <div>
              <p className="eyebrow">STUDENT TESTIMONIALS & PROOF</p>
              <h3>Verified Student Feedback</h3>
            </div>
            <div className="review-tab-buttons" role="tablist">
              <button
                className={reviewTab === 'cards' ? 'selected' : ''}
                onClick={() => setReviewTab('cards')}
              >
                ★ Student Stories ({reviews.length})
              </button>
              <button
                className={reviewTab === 'screenshots' ? 'selected' : ''}
                onClick={() => setReviewTab('screenshots')}
              >
                ✓ Google Review Proofs (8)
              </button>
            </div>
          </div>

          {/* Reviews Content */}
          {reviewTab === 'cards' ? (
            <div className="testimonials-grid" aria-live="polite">
              {reviews.map(review => (
                <article className="testimonial-card" key={review.id}>
                  <div className="testimonial-header">
                    <div className="stars" aria-label={`${review.rating} out of 5 stars`}>
                      {'★'.repeat(review.rating || 5)}
                    </div>
                    <span className="verified-badge">✓ {review.date || 'Google Verified'}</span>
                  </div>
                  <p className="testimonial-quote">“{review.quote}”</p>
                  <footer className="testimonial-footer">
                    <div className="avatar-letter">{review.name.charAt(0)}</div>
                    <div>
                      <span className="reviewer-name">{review.name}</span>
                      <small className="reviewer-track">{review.track}</small>
                    </div>
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <ReviewGallery />
          )}
        </section>

        {/* Contact Section */}
        <section className="contact" id="contact">
          <div>
            <div className="eyebrow">
              <span className="pulse" />
              <span>GET IN TOUCH</span>
            </div>
            <h2>
              Let’s make systems<br />
              <em>harder to break.</em>
            </h2>
          </div>
          <div className="contact-side">
            <p>
              Looking for a penetration tester, application security researcher, or hands-on cybersecurity trainer? Let’s collaborate.
            </p>
            <a href="mailto:sathish1012cybok@gmail.com" className="email-link">
              sathish1012cybok@gmail.com <span>↗</span>
            </a>
            <div className="contact-details">
              <div className="socials">
                <a href="https://linkedin.com/in/amsathish" target="_blank" rel="noreferrer">
                  LinkedIn ↗
                </a>
                <a href="https://github.com/cybok10" target="_blank" rel="noreferrer">
                  GitHub ↗
                </a>
                <a href="tel:8940599732">
                  Call: +91 89405 99732
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer>
        <a className="brand" href="#home">
          <span className="brand-mark">S</span>
          <span className="brand-text">
            Sathish<span className="brand-accent">.m</span>
          </span>
        </a>
        <p>© {new Date().getFullYear()} Sathish M. Offensive Cybersecurity Researcher & Mentor.</p>
        <a href="#home" className="back-to-top">
          Back to top ↑
        </a>
      </footer>
    </>
  );
}

function SectionHeading({ number, label, note }) {
  return (
    <div className="section-heading">
      <div className="section-label">
        <span>{number}</span>
        <p>{label}</p>
      </div>
      <p className="section-note">{note}</p>
    </div>
  );
}

function Experience({ date, role, company, detail }) {
  return (
    <article className="timeline-item">
      <div className="timeline-date">{date}</div>
      <div className="timeline-dot" />
      <div className="timeline-body">
        <p className="role">{role}</p>
        <p className="company">{company}</p>
        <p className="role-detail">{detail}</p>
      </div>
    </article>
  );
}


function StudentGallery() {
  return (
    <div className="student-gallery">
      <figure className="gallery-main">
        <img
          src="/images/students/classroom-session.jpeg"
          alt="Sathish M leading an offensive cybersecurity training session"
          loading="lazy"
        />
        <figcaption>Hands-on Classroom Security Labs · Velachery</figcaption>
      </figure>
      <figure className="gallery-side">
        <img
          src="/images/students/group-photo.jpeg"
          alt="Students gathered at RedTeam Hacker Academy"
          loading="lazy"
        />
        <figcaption>RedTeam Hacker Academy Student Cohort</figcaption>
      </figure>
    </div>
  );
}

function ReviewGallery() {
  const reviews = [
    '13-03-33',
    '13-03-39',
    '13-03-48',
    '13-03-54',
    '13-04-00',
    '13-04-08',
    '13-04-17',
    '13-04-27',
  ];
  return (
    <div className="review-gallery">
      {reviews.map(time => (
        <a
          key={time}
          href={`/images/reviews/Screenshot%20From%202026-09-14%20${time}.png`}
          target="_blank"
          rel="noreferrer"
          title="Click to view verified review in full size"
        >
          <img
            src={`/images/reviews/Screenshot%20From%202026-09-14%20${time}.png`}
            alt="Google Review screenshot for Sathish M"
            loading="lazy"
          />
          <span className="proof-overlay">View Screenshot ↗</span>
        </a>
      ))}
    </div>
  );
}

export default App;
