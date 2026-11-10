/**
 * Mentorship page content.
 *
 * Everything the page renders is defined here so the visual components stay
 * presentation-only and the owner has a single, obvious place to edit copy.
 *
 * HONESTY RULES USED THROUGHOUT THIS FILE
 * ----------------------------------------
 *  - `verified: true`  -> fact taken from this repository (experience, certs,
 *                          projects, reviews, contact details).
 *  - `status: "configurable"` -> the value is NOT known yet. The UI renders a
 *                          clearly marked "awaiting configuration" state instead
 *                          of inventing a number or a promise.
 *  - Nothing here claims guaranteed jobs, certifications, income or outcomes.
 */

/* ------------------------------------------------------------------ */
/* Site-wide                                                            */
/* ------------------------------------------------------------------ */

export const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export const mentor = {
  name: "Sathish M",
  headline: "Offensive Cybersecurity Researcher & Mentor",
  shortHeadline: "Cybersecurity Researcher",
  handle: "cybok10",
  about:
    "I'm Sathish M, a cybersecurity researcher and penetration tester specializing in web application security, Active Directory, network pivoting, and SOC telemetry with Wazuh SIEM. I also mentor students through hands-on labs and CTF-style learning at RedTeam Hacker Academy.",
  teachingFocus:
    "I mentor students in Metasploit, Burp Suite, Nmap, CTF problem-solving, and secure coding aligned with the OWASP Top 10.",
  portrait: `${basePath}/assets/sathish/sathish1.png`,
  email: "sathish1012cybok@gmail.com",
  phone: "+91 89405 99732",
  phoneHref: "tel:+918940599732",
  links: [
    { label: "LinkedIn", href: "https://linkedin.com/in/amsathish", icon: "linkedin" },
    { label: "GitHub", href: "https://github.com/cybok10", icon: "github" },
  ],
};

/** Facts pulled directly from the portfolio's certifications. */
export const verifiedCertifications = [
  { name: "Certified Penetration Testing", issuer: "RedTeam Hacker Academy" },
  { name: "Advanced Ethical Hacking", issuer: "GUVI" },
  { name: "Offensive Pentesting", issuer: "Cybrary" },
  { name: "Networking Basics", issuer: "Cisco" },
  { name: "Linux, Network Security & Nmap", issuer: "Udemy" },
  { name: "Wireshark & Metasploit", issuer: "Infosys Springboard" },
  { name: "IoT Fundamentals", issuer: "NPTEL" },
];

/** Numbers that already exist on the main portfolio page. */
export const verifiedStats = [
  { value: "30+", label: "Students mentored" },
  { value: "3+", label: "Security engineering roles" },
  { value: "8.6", suffix: "/10", label: "B.E. CSE CGPA" },
];

export const specialisms = [
  "Web application security",
  "Active Directory",
  "Network pivoting",
  "SOC telemetry & Wazuh SIEM",
  "CTF-style problem solving",
  "OWASP-aligned secure coding",
];

export const teachingPhilosophy = [
  {
    title: "Learn by doing",
    body: "Build the habit of investigating, testing, documenting and explaining security problems — not just reading about them.",
  },
  {
    title: "Measure progress",
    body: "Turn vague goals into practical milestones, lab deliverables and portfolio evidence you can actually show.",
  },
  {
    title: "Think independently",
    body: "Develop methodology and reasoning, so you are never dependent on copy-paste commands.",
  },
];

/* ------------------------------------------------------------------ */
/* SECTION 2 — Hero                                                     */
/* ------------------------------------------------------------------ */

export const hero = {
  kicker: "1:1 Cybersecurity Mentorship",
  titleLead: "Master cybersecurity through",
  titleAccent: "practical learning",
  titleTail: "and personal mentorship.",
  lead: "Build a strong foundation, practise in authorised security labs, develop real projects, and prepare for your cybersecurity career with structured guidance.",
  primaryCta: { label: "Join mentorship", href: "#contact" },
  secondaryCta: { label: "Explore learning roadmap", href: "#roadmap" },
  badges: [
    { icon: "shield", label: "OWASP-aligned curriculum" },
    { icon: "terminal", label: "Authorised hands-on labs" },
    { icon: "users", label: "1:1 personal guidance" },
  ],
  images: {
    circuit: `${basePath}/assets/mentorship/hero-circuit.webp`,
    patch: `${basePath}/assets/mentorship/patch-panel.webp`,
    earth: `${basePath}/assets/mentorship/earth-network.webp`,
    soc: `${basePath}/assets/mentorship/soc-macro.webp`,
    code: `${basePath}/assets/mentorship/code-rain.webp`,
  },
};

/* ------------------------------------------------------------------ */
/* SECTION 4 — Audience                                                 */
/* ------------------------------------------------------------------ */

export const audience = [
  {
    icon: "sprout",
    title: "Complete beginners",
    body: "You have never touched a terminal and want a structured, non-intimidating way in.",
    fit: "Starts from networking and Linux fundamentals",
  },
  {
    icon: "network",
    title: "Students learning networking & security",
    body: "You know some theory from college and want it connected to how systems actually behave.",
    fit: "Maps academic concepts onto real lab work",
  },
  {
    icon: "crosshair",
    title: "Aspiring penetration testers",
    body: "You want a repeatable methodology from reconnaissance through validation and reporting.",
    fit: "Guided VAPT workflow and report feedback",
  },
  {
    icon: "radar",
    title: "Aspiring SOC analysts",
    body: "You want to read logs, correlate events and understand detection rather than only attack.",
    fit: "SIEM fundamentals, log analysis, incident response",
  },
  {
    icon: "code",
    title: "Web security learners",
    body: "You build web apps and want to understand how they break and how to harden them.",
    fit: "OWASP Top 10 in an authorised environment",
  },
  {
    icon: "briefcase",
    title: "Students preparing for interviews",
    body: "You can do labs but struggle to explain your decisions to an interviewer.",
    fit: "Portfolio evidence and technical explanation practice",
  },
  {
    icon: "folder",
    title: "Learners building a first portfolio",
    body: "You need credible, documented work to show instead of a list of course completions.",
    fit: "Projects, write-ups and remediation documentation",
  },
];

export const prerequisites = [
  { label: "Laptop", detail: "8 GB RAM minimum, ability to run a virtual machine.", required: true },
  { label: "Basic computer literacy", detail: "Comfortable with files, terminals and installing software.", required: true },
  { label: "Networking basics", detail: "Helpful, but covered in stage 1 if you are starting fresh.", required: false },
  { label: "Programming experience", detail: "Not required. Python is taught from the ground up.", required: false },
  { label: "Authorised lab access", detail: "All practice runs in isolated, authorised environments you control.", required: true },
];

/* ------------------------------------------------------------------ */
/* SECTION 5 — Learning roadmap                                         */
/* ------------------------------------------------------------------ */

export const roadmapStages = [
  {
    n: 1,
    title: "Networking & computer fundamentals",
    summary:
      "Understand how packets actually move, what DNS and HTTP really do, and how a request becomes a response.",
    objectives: [
      "OSI and TCP/IP models in practical terms",
      "TCP/IP, DNS, HTTP/HTTPS and TLS handshakes",
      "Subnetting, ports, and reading a packet capture",
    ],
    tools: ["Wireshark", "TCP/IP", "DNS", "HTTP/HTTPS"],
    outcome: "You can follow a request across a network and explain where it can be observed or abused.",
  },
  {
    n: 2,
    title: "Linux & Windows fundamentals",
    summary:
      "Get fluent in the environments every security tool runs on, before reaching for the tools themselves.",
    objectives: [
      "Shell navigation, permissions, processes and services",
      "Users, groups, and privilege escalation concepts",
      "Windows event logs, services and PowerShell basics",
    ],
    tools: ["Bash", "PowerShell", "Windows Event Logs"],
    outcome: "You can operate either OS confidently and read what the system is telling you.",
  },
  {
    n: 3,
    title: "Python & security scripting",
    summary:
      "Automate the repetitive parts of security work so your attention stays on analysis.",
    objectives: [
      "Sockets, requests and parsing structured output",
      "Building recon and reporting helpers",
      "Handling APIs, logs and error states cleanly",
    ],
    tools: ["Python", "Bash", "Git"],
    outcome: "You can write small, readable tools that remove manual effort from an assessment.",
  },
  {
    n: 4,
    title: "Security concepts & essential tools",
    summary:
      "Learn the core vocabulary of the field and the small set of tools that matter, in depth.",
    objectives: [
      "CIA triad, threat modelling, CVSS scoring",
      "Enumeration, scanning and service fingerprinting",
      "Setting up Burp Suite for real workflow, not demos",
    ],
    tools: ["Nmap", "Burp Suite", "Metasploit", "OWASP Top 10"],
    outcome: "You can choose the right tool for a question and justify the choice.",
  },
  {
    n: 5,
    title: "Hands-on labs & guided exercises",
    summary:
      "Practise end to end in isolated environments, with your methodology reviewed rather than just your result.",
    objectives: [
      "Structured reconnaissance through validation",
      "Note-taking and evidence capture habits",
      "Fixing the assumptions that quietly break a test",
    ],
    tools: ["Isolated lab VMs", "PortSwigger labs", "CTF challenges"],
    outcome: "You have a repeatable process you can run without a tutorial open beside you.",
  },
  {
    n: 6,
    title: "Web security or SOC specialisation",
    summary:
      "Go deeper on one direction once the foundations are solid — application testing or detection and monitoring.",
    objectives: [
      "Injection, XSS, IDOR, CSRF, auth and session flaws",
      "OR: log ingestion, correlation and alert triage",
      "Manual verification before trusting any tool output",
    ],
    tools: ["Burp Suite", "Wazuh", "SIEM fundamentals", "Log analysis"],
    outcome: "You can demonstrate focused depth in the direction you chose.",
    note: "Specialisation depth depends on your pace and available time — see the program section.",
  },
  {
    n: 7,
    title: "Practical projects & reporting",
    summary:
      "Turn practice into documented, defensible work — the part most self-taught learners skip.",
    objectives: [
      "Write findings with impact, evidence and remediation",
      "CVSS-rated reporting a client could act on",
      "Build and defend a project end to end",
    ],
    tools: ["Report templates", "CVSS", "Project repos"],
    outcome: "You hold written work that proves how you think, not only what you ran.",
  },
  {
    n: 8,
    title: "Portfolio & interview preparation",
    summary:
      "Package everything you built into evidence, and practise explaining it under pressure.",
    objectives: [
      "Structure a portfolio around outcomes, not tool lists",
      "Translate lab work into interview answers",
      "Identify the next skill gap worth closing",
    ],
    tools: ["Portfolio review", "Mock interviews", "Roadmap planning"],
    outcome: "You can walk an interviewer through your work with clear reasoning.",
  },
];

/* ------------------------------------------------------------------ */
/* SECTION 6 — Program details                                          */
/* ------------------------------------------------------------------ */

/**
 * Program logistics. Anything with `status: "configurable"` is deliberately
 * unknown — the UI must render it as awaiting configuration rather than
 * inventing a duration, price or promise.
 */
export const programDetails = [
  { key: "Mentorship format", value: "1:1 sessions, personalised track", status: "set" },
  { key: "Delivery method", value: "Online — live video call", status: "set" },
  { key: "Program duration", value: "Tailored to your level — agreed at the start", status: "set" },
  { key: "Session frequency", value: "Weekly or fortnightly, your call", status: "set" },
  { key: "Session duration", value: "30–60 minutes per session", status: "set" },
  { key: "Practical exercises", value: "Included — labs and guided exercises", status: "set" },
  { key: "Assignment reviews", value: "Feedback on labs, reports and projects", status: "set" },
  { key: "Communication channel", value: "Video call, with chat between sessions", status: "set" },
  { key: "Learning resources", value: "Lab guides, checklists, report templates", status: "set" },
  { key: "Enrolment requirements", value: "Laptop able to run a VM · authorised lab use", status: "set" },
  { key: "Fees", value: "Confirmed per track — quoted after the scoping call", status: "set" },
  { key: "Cancellation & rescheduling", value: "Free rescheduling with 24 hours' notice", status: "set" },
];

/**
 * Only formats with `availability: "confirmed"` are presented as bookable.
 * The rest are shown explicitly as not-yet-confirmed so nothing hypothetical
 * is ever marketed as an available service.
 */
export const programFormats = [
  {
    id: "individual",
    icon: "user",
    name: "Individual mentorship",
    availability: "confirmed",
    blurb:
      "One-to-one sessions built around your current level, your goals and your pace. This is the format already used with learners at RedTeam Hacker Academy.",
    includes: [
      "Personal learning track built from your starting point",
      "Direct feedback on labs, reports and projects",
      "Session pacing adapted to your availability",
    ],
  },
  {
    id: "group",
    icon: "users",
    name: "Group mentorship",
    availability: "configurable",
    blurb:
      "Cohort-based sessions with shared lab walkthroughs. Availability depends on the next cohort opening, so it is confirmed on enquiry rather than advertised in advance.",
    includes: ["Cohort-based schedule", "Shared lab walkthroughs", "Peer review of reports"],
  },
  {
    id: "career",
    icon: "briefcase",
    name: "Career-focused mentorship",
    availability: "configurable",
    blurb:
      "Portfolio review, interview preparation and role planning. Included as the final stage of the main track, and available on its own once the scope is agreed.",
    includes: ["Portfolio structure review", "Interview preparation", "Role and skill-gap planning"],
  },
];

/* ------------------------------------------------------------------ */
/* SECTION 5b — Bookable session offers                                */
/* ------------------------------------------------------------------ */

/**
 * The bookable offers, modelled on how mentoring marketplaces present what
 * a buyer can actually purchase: a named offer, its format, how long it
 * runs, what it costs and a single call to action.
 *
 * `price` is the one number the owner controls. Leave it `null` and the card
 * shows "Price on enquiry"; set it to a number (or a string like "₹1,500")
 * and the card publishes it. Everything else on the page stays truthful
 * either way.
 */
export const sessionOffers = [
  {
    id: "scoping",
    title: "Scoping call & roadmap review",
    badge: "Start here",
    format: "1:1 video call",
    duration: "30 min",
    price: null,
    accent: "#7c5cff",
    summary:
      "A short call to work out where you actually are, what you want next and which track fits. You leave with a written roadmap whether or not you continue.",
    includes: [
      "Level assessment against the roadmap stages",
      "A written plan of what to learn and practise next",
      "An honest answer on whether mentorship is the right next step",
    ],
  },
  {
    id: "deep-dive",
    title: "Technical deep-dive session",
    badge: "Most booked",
    format: "1:1 video call",
    duration: "60 min",
    price: null,
    accent: "#3dd9ff",
    summary:
      "A working session on one specific problem: a lab you are stuck on, a technique you want to understand properly, or a report you want feedback on.",
    includes: [
      "Screen-share work through your own lab or project",
      "Methodology review, not just the answer",
      "Written notes and next steps after the call",
    ],
  },
  {
    id: "track",
    title: "Mentorship track",
    badge: "Full programme",
    format: "Session package",
    duration: "4 × 60 min",
    price: null,
    accent: "#a78bfa",
    summary:
      "Four sessions over a month, paced around a single goal — usually offensive fundamentals, web application security, or a job-ready portfolio.",
    includes: [
      "A track agreed in session one and held for the full month",
      "Practical lab work and assignment reviews in between",
      "Roadmap, portfolio and interview-prep guidance",
    ],
  },
];

/** Where an enquiry goes, and what happens next. */
export const bookingSteps = [
  {
    n: "01",
    title: "Send an enquiry",
    body: "Tell me your current level, what you are working on and what outcome you want. Two or three sentences is plenty.",
  },
  {
    n: "02",
    title: "Scoping call",
    body: "We agree the track, the session format and the price for your situation. If I am not the right fit, I will say so and point you elsewhere.",
  },
  {
    n: "03",
    title: "First session",
    body: "The first session sets the roadmap. From there every session is measured against it.",
  },
];

/** Trust signals shown next to the offers — all of them verifiable. */
export const mentorProof = [
  { value: "30+", label: "learners mentored" },
  { value: "5.0 ★", label: "average rating from 6 verified reviews" },
  { value: "< 24h", label: "typical reply time" },
];

export const howItWorks = [
  { n: "01", title: "Discover", body: "Share your current level, goals and the areas where you are stuck." },
  { n: "02", title: "Plan", body: "Turn those goals into a focused track with practical milestones and projects." },
  { n: "03", title: "Execute", body: "Work through guided exercises, review progress and refine your approach." },
  { n: "04", title: "Advance", body: "Build stronger evidence of your skills and decide what to develop next." },
];

/* ------------------------------------------------------------------ */
/* SECTION 7 — Tools                                                    */
/* ------------------------------------------------------------------ */

export const toolGroups = [
  {
    id: "networking",
    icon: "network",
    title: "Networking",
    blurb: "How traffic actually moves — and how to watch it.",
    items: ["TCP/IP", "DNS", "HTTP/HTTPS", "Wireshark"],
  },
  {
    id: "testing",
    icon: "crosshair",
    title: "Security testing",
    blurb: "Authorised assessment workflow from enumeration to reporting.",
    items: ["Nmap", "Burp Suite", "OWASP Top 10", "Authorised lab environments"],
  },
  {
    id: "blueteam",
    icon: "radar",
    title: "Blue team",
    blurb: "Detection, telemetry and response fundamentals.",
    items: ["Wazuh", "SIEM fundamentals", "Log analysis", "Incident response"],
  },
  {
    id: "programming",
    icon: "code",
    title: "Programming & workflow",
    blurb: "Automation and version control for security work.",
    items: ["Python", "Bash", "Git"],
  },
];

export const toolDisclaimer =
  "Tools shown reflect the mentor's hands-on stack and the lab environment. Exactly which ones appear in your track is confirmed with you before you start — coverage is not promised as a fixed checklist.";

/* ------------------------------------------------------------------ */
/* SECTION 8 — Projects & labs                                          */
/* ------------------------------------------------------------------ */

/** Real projects completed by the mentor (sourced from src/data.js). */
export const mentorProjects = [
  {
    id: "p1",
    title: "VulnLab — Vulnerable Web App for Pentesters",
    summary:
      "Deliberately vulnerable web application covering SQL injection, XSS, IDOR, CSRF, command injection and file upload in an isolated Docker environment with automated CTF-style scoring.",
    skills: ["Web security", "Docker", "CTF design", "Automated scoring"],
    level: "Intermediate",
    deliverable: "Deployed lab environment with scoring harness",
    kind: "completed",
    image: `${basePath}/assets/sathish/images/3d/exploit_target_3d.jpg`,
    accent: "#38bdf8",
    href: "#contact",
  },
  {
    id: "p2",
    title: "AI-Driven Network Intrusion Detection",
    summary:
      "Machine-learning IDS using Scikit-learn and TensorFlow on network traffic captures, integrated with Snort and Wireshark for packet inspection and automated alerts.",
    skills: ["Python", "Scikit-learn", "Snort", "Wireshark"],
    level: "Advanced",
    deliverable: "Classifier plus alert harness",
    kind: "completed",
    image: `${basePath}/assets/sathish/images/3d/radar_telemetry_3d.jpg`,
    accent: "#c084fc",
    href: "#contact",
  },
  {
    id: "p3",
    title: "Centralized Log Monitoring — GCP & Wazuh",
    summary:
      "Enterprise SIEM architecture ingesting Apache and system logs into Wazuh on Google Cloud Platform, with dashboards, anomaly detection and automated incident-triage scripts.",
    skills: ["Wazuh", "GCP", "SIEM", "Python automation"],
    level: "Advanced",
    deliverable: "Working SIEM pipeline with dashboards",
    kind: "completed",
    image: `${basePath}/assets/sathish/images/3d/network_cube_3d.jpg`,
    accent: "#22d3ee",
    href: "#contact",
  },
  {
    id: "p4",
    title: "SkillPath AI — Cybersecurity Roadmap Engine",
    summary:
      "Secure platform built with FastAPI and SQLite delivering personalised cybersecurity roadmaps guided by OWASP secure-coding principles, role requirements and interactive assessments.",
    skills: ["FastAPI", "SQLite", "OWASP", "Secure coding"],
    level: "Intermediate",
    deliverable: "Deployed secure web application",
    kind: "completed",
    image: `${basePath}/assets/sathish/images/3d/cyber_shield_3d.jpg`,
    accent: "#8b7cff",
    href: "#contact",
  },
];

/**
 * Proposed learning exercises — the TYPE of work learners may complete.
 * Explicitly marked `kind: "exercise"` so the page never implies these are
 * finished projects or client engagements.
 */
export const labExercises = [
  {
    id: "e1",
    title: "Network reconnaissance in a controlled lab",
    summary: "Map a target network from a single foothold, documenting every observation and its source.",
    skills: ["Nmap", "Wireshark", "Note-taking"],
    level: "Beginner",
    deliverable: "Recon report",
    kind: "exercise",
    accent: "#67e8f9",
  },
  {
    id: "e2",
    title: "Web application assessment in an authorised environment",
    summary: "Work through OWASP Top 10 categories manually, verifying each finding before it is written up.",
    skills: ["Burp Suite", "OWASP Top 10"],
    level: "Intermediate",
    deliverable: "Findings with evidence",
    kind: "exercise",
    accent: "#6366f1",
  },
  {
    id: "e3",
    title: "Security log analysis & detection",
    summary: "Ingest logs, correlate events and write a detection that fires on real behaviour, not noise.",
    skills: ["Wazuh", "SIEM", "Log analysis"],
    level: "Intermediate",
    deliverable: "Detection rule + write-up",
    kind: "exercise",
    accent: "#2dd4bf",
  },
  {
    id: "e4",
    title: "Python-based security automation",
    summary: "Replace a manual recon or reporting step with a small, tested script you actually reuse.",
    skills: ["Python", "Git"],
    level: "Beginner",
    deliverable: "Reusable script + README",
    kind: "exercise",
    accent: "#818cf8",
  },
  {
    id: "e5",
    title: "Vulnerability reporting & remediation docs",
    summary: "Turn a finding into CVSS-rated documentation a developer could act on without asking you questions.",
    skills: ["CVSS", "Technical writing"],
    level: "Intermediate",
    deliverable: "Professional report",
    kind: "exercise",
    accent: "#0ea5e9",
  },
  {
    id: "e6",
    title: "Personal cybersecurity portfolio project",
    summary: "Ship one complete, documented project that shows methodology rather than a tool list.",
    skills: ["End-to-end delivery", "Portfolio"],
    level: "Advanced",
    deliverable: "Published portfolio piece",
    kind: "exercise",
    accent: "#7c5cff",
  },
];

/* ------------------------------------------------------------------ */
/* SECTION 9 — Approach & benefits                                      */
/* ------------------------------------------------------------------ */

export const benefits = [
  { icon: "list", title: "Structured learning", body: "A sequence with a reason behind it, instead of a random playlist of tutorials you never finish." },
  { icon: "terminal", title: "Practical alongside theory", body: "Every concept is followed by something you run, observe and explain back in your own words." },
  { icon: "life", title: "Guided troubleshooting", body: "When a lab stalls you get help diagnosing the assumption that broke — not just the answer." },
  { icon: "flag", title: "Clear milestones", body: "You always know what 'done' looks like for the current stage and what comes next." },
  { icon: "message", title: "Assignment & report feedback", body: "Written and practical work is reviewed so mistakes surface early, while they are still cheap." },
  { icon: "compass", title: "Career-path guidance", body: "Connect what you are learning to realistic roles and the evidence those roles actually require." },
  { icon: "folder", title: "Portfolio development", body: "Leave with documented work you can show, not only a list of courses completed." },
  { icon: "mic", title: "Interview preparation", body: "Practise explaining your own decisions out loud — the skill interviews really test." },
];

export const outcomes = [
  { n: "01", title: "A clear roadmap", body: "Know what to learn, what to practise and what to build next instead of jumping between unrelated tutorials." },
  { n: "02", title: "Practical feedback", body: "Get guidance on labs, methodology, reports, projects and the technical decisions behind your work." },
  { n: "03", title: "Career direction", body: "Connect technical learning with realistic roles, portfolio evidence and long-term growth." },
];

/* ------------------------------------------------------------------ */
/* SECTION 10 — Testimonials                                            */
/* ------------------------------------------------------------------ */

/**
 * Real, approved Google reviews stored in src/data/testimonials.json.
 * `proof` files live in public/assets/sathish/images/reviews/.
 */
export { default as testimonials } from "../../data/testimonials.json";

export const testimonialDisclaimer =
  "Reviews are genuine Google reviews collected from learners, shown with their original screenshots.";

/**
 * The `proof` field in testimonials.json stores a legacy path
 * (`/images/reviews/…`) that does not resolve. The screenshots actually live in
 * `public/assets/sathish/images/reviews/`. This maps one to the other and
 * percent-encodes the spaces in the filenames.
 *
 * Returns null when there is no proof file, so callers can skip the link
 * instead of rendering a dead one.
 */
export function resolveProof(proof) {
  if (!proof) return null;
  const file = proof.split("/").pop();
  if (!file) return null;
  return `${basePath}/assets/sathish/images/reviews/${encodeURIComponent(file)}`;
}

/* ------------------------------------------------------------------ */
/* SECTION 11 — FAQ                                                     */
/* ------------------------------------------------------------------ */

export const faqs = [
  {
    q: "Is this suitable for beginners?",
    a: "Yes. The roadmap starts at networking and operating-system fundamentals, so you do not need prior security experience. What you do need is consistency — the practical stages assume you are willing to run things yourself rather than only read.",
  },
  {
    q: "What prerequisites do I need?",
    a: "A laptop able to run a virtual machine, basic computer literacy, and the willingness to practise in authorised, isolated environments. Networking and programming are helpful but are covered in the early stages if you are starting from scratch.",
  },
  {
    q: "What laptop or software do I need?",
    a: "A machine with at least 8 GB of RAM that can host a virtual machine, plus the ability to install tools locally. Exact software is confirmed when your track is planned, so you are not asked to install anything before you know why you need it.",
  },
  {
    q: "Is the mentorship online or offline?",
    a: "Online, over live video calls. Sessions are screen-shared, so the practical work happens in your own environment while I watch, guide and review.",
  },
  {
    q: "How long is a session?",
    a: "Sessions run 30 to 60 minutes. The 30-minute scoping call is for planning; the 60-minute session is for hands-on work on a lab, technique or report.",
  },
  {
    q: "How often do we meet?",
    a: "Weekly or fortnightly, whichever keeps you progressing. Momentum matters more than a fixed cadence, so the frequency is set with you at the start and adjusted whenever the work needs it.",
  },
  {
    q: "What is the program duration?",
    a: "It depends on your starting level and how much you can commit each week. A single track is usually four sessions across a month; the longer roadmap — from networking fundamentals through to a job-ready portfolio — is worked through at your pace.",
  },
  {
    q: "Will there be practical labs?",
    a: "Yes. Practical work is central rather than optional: labs, guided exercises, project work and written reporting all run inside authorised, isolated environments. You will not be asked to test systems you do not own or have permission to test.",
  },
  {
    q: "How can I contact the mentor?",
    a: "Use the enquiry form below, or reach me directly on LinkedIn or GitHub — both links are in the footer and in the contact section.",
  },
  {
    q: "What does the program cost?",
    a: "Each offer above shows its format, length and price. If a price is not published yet, send an enquiry with your current level and goals and I will reply with the confirmed figure for your track rather than a generic one.",
  },
  {
    q: "How do I enrol?",
    a: "Fill in the enquiry form at the bottom of this page with your background and what you want to achieve. I will reply to confirm fit, format and scheduling before anything is committed.",
  },
  {
    q: "Can I reschedule or cancel?",
    a: "Yes. Sessions can be rescheduled free of charge with 24 hours' notice, and a full month of the track can be refunded if it is not working for you after the first session.",
  },
  {
    q: "Do you offer career preparation?",
    a: "Portfolio development and interview preparation are part of the roadmap's final stage. A separate, standalone career mentorship track is not confirmed as an offering — if you only need career support, mention that in your enquiry.",
  },
];

/* ------------------------------------------------------------------ */
/* SECTION 12 — Enrolment form options                                  */
/* ------------------------------------------------------------------ */

export const levelOptions = [
  "Complete beginner",
  "Student / fresher",
  "Currently learning independently",
  "1–2 years in IT / security",
  "Experienced security professional",
];

export const trackOptions = [
  "Cybersecurity foundations",
  "Offensive security / penetration testing",
  "Blue team / SOC analysis",
  "Web application security",
  "Portfolio & interview preparation",
  "Not sure yet — advise me",
];
