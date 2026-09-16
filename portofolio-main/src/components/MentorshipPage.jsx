import { useMemo, useState } from "react";
import reviews from "../../testimonials.json";

const tracks = [
  { id: "foundations", label: "FOUNDATIONS", title: "Cybersecurity Foundations", description: "Build the technical foundation needed to understand how systems, networks, and web applications fail—and how to assess them responsibly.", topics: ["Linux & networking", "Web security & OWASP", "Recon methodology", "Hands-on lab workflow"] },
  { id: "offensive", label: "OFFENSIVE SECURITY", title: "Penetration Testing Accelerator", description: "Develop a repeatable penetration-testing workflow from reconnaissance and enumeration through validation, exploitation, and professional reporting.", topics: ["VAPT methodology", "Burp Suite & Nmap", "Active Directory basics", "Reporting & remediation"] },
  { id: "career", label: "CAREER", title: "Cybersecurity Career Mentorship", description: "Turn scattered learning into a practical career plan with portfolio projects, interview preparation, technical direction, and measurable milestones.", topics: ["Personal roadmap", "Portfolio projects", "Interview preparation", "Skill-gap planning"] },
];

const outcomes = [
  ["01", "A clear roadmap", "Know what to learn, what to practise, and what to build next instead of jumping between unrelated tutorials."],
  ["02", "Practical feedback", "Get guidance on labs, methodology, reports, projects, and the technical decisions behind your work."],
  ["03", "Career direction", "Connect technical learning with realistic roles, portfolio evidence, interview preparation, and long-term growth."],
];

const process = [
  ["Discover", "Share your current level, goals, experience, and the areas where you are stuck."],
  ["Plan", "Choose a focused track and turn your goals into practical milestones and projects."],
  ["Execute", "Work through guided exercises, review your progress, and continuously refine your approach."],
  ["Advance", "Build stronger evidence of your skills and identify the next capability to develop."],
];

export default function MentorshipPage() {
  const [track, setTrack] = useState("foundations");
  const [submitted, setSubmitted] = useState(false);
  const selectedTrack = useMemo(() => tracks.find((item) => item.id === track) ?? tracks[0], [track]);
  const approvedReviews = reviews.filter((review) => review.approved).slice(0, 3);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const subject = `Mentorship enquiry — ${selectedTrack.title}`;
    const body = [`Name: ${form.get("name")}`, `Email: ${form.get("email")}`, `Experience: ${form.get("experience")}`, `Track: ${selectedTrack.title}`, "", `Goal:\n${form.get("goal")}`].join("\n");
    setSubmitted(true);
    window.location.href = `mailto:sathish1012cybok@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <main className="mentorship-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mentorship-topbar"><a className="mentorship-back" href={`${basePath}/`}>← Back to portfolio</a><span className="mentorship-badge">1:1 coaching • practical labs</span></div>
      <section className="mentorship-hero">
        <div className="mentorship-hero-copy">
          <p className="mentorship-kicker">1:1 CYBERSECURITY MENTORSHIP</p>
          <h1>Build security skills that <span>translate to real work.</span></h1>
          <p className="mentorship-lead">Structured, hands-on mentorship for people who want to move beyond tutorials and develop practical cybersecurity capability—with a clear roadmap, technical feedback, and career direction.</p>
          <div className="mentorship-hero-actions"><a className="mentorship-primary" href="#apply">Start a mentorship enquiry ↗</a><a className="mentorship-secondary" href="#tracks">View learning tracks</a></div>
          <div className="mentorship-stat-row"><span><strong>30+</strong> learners mentored</span><span><strong>1:1</strong> focused guidance</span><span><strong>Hands-on</strong> practical learning</span></div>
        </div>
        <aside className="mentorship-hero-panel"><p className="mentorship-panel-label">MENTORSHIP PRINCIPLES</p><div><strong>Learn by doing.</strong><span>Build the habit of investigating, testing, documenting, and explaining security problems.</span></div><div><strong>Measure progress.</strong><span>Turn vague goals into practical milestones and portfolio evidence.</span></div><div><strong>Think independently.</strong><span>Develop methodology and reasoning—not dependency on copy-paste commands.</span></div></aside>
      </section>

      <section className="mentorship-section" id="tracks"><div className="mentorship-heading"><p>LEARNING TRACKS</p><h2>Choose the direction that matches your next milestone.</h2><span>Every track can be adapted to your current experience, goals, and available time.</span></div><div className="mentorship-program-grid">{tracks.map((item) => <button type="button" key={item.id} className={`mentorship-program ${track === item.id ? "selected" : ""}`} onClick={() => setTrack(item.id)} aria-pressed={track === item.id}><span>{item.label}</span><h3>{item.title}</h3><p>{item.description}</p><ul>{item.topics.map((topic) => <li key={topic}>✓ {topic}</li>)}</ul><strong>{track === item.id ? "Current selection" : "Select this track"}</strong></button>)}</div></section>

      <section className="mentorship-section"><div className="mentorship-heading"><p>WHAT YOU GET</p><h2>Guidance designed around outcomes.</h2></div><div className="mentorship-feature-grid">{outcomes.map(([number, title, text]) => <article className="mentorship-feature-card" key={number}><span className="mentorship-feature-icon">{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>

      <section className="mentorship-section mentorship-process"><div className="mentorship-heading"><p>HOW IT WORKS</p><h2>A simple process. Serious practical work.</h2></div><div className="mentorship-steps">{process.map(([title, detail], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{detail}</p></article>)}</div></section>

      {approvedReviews.length > 0 && <section className="mentorship-section mentorship-proof"><div className="mentorship-heading"><p>LEARNER FEEDBACK</p><h2>What learners say about the experience.</h2></div><div className="mentorship-proof-grid">{approvedReviews.map((review) => <article key={review.id}><p className="mentorship-stars" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}</p><blockquote>“{review.quote}”</blockquote><strong>{review.name}</strong><span>{review.track}</span></article>)}</div></section>}

      <section className="mentorship-section mentorship-application" id="apply"><div className="mentorship-heading"><p>START A CONVERSATION</p><h2>Tell me where you want to go next.</h2><span>No generic course pitch. Share your current situation and I’ll understand the problem before recommending a direction.</span></div>{submitted ? <div className="mentorship-success" role="status"><h3>Your enquiry is ready.</h3><p>Your email client has been opened with the selected mentorship track and your details. Send the email to complete the enquiry.</p><button type="button" onClick={() => setSubmitted(false)}>Send another enquiry</button></div> : <form className="mentorship-form" onSubmit={handleSubmit}><label>Full name<input name="name" autoComplete="name" required placeholder="Your name" /></label><label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label><label>Current experience<select name="experience" required defaultValue=""><option value="" disabled>Select your level</option><option>Beginner</option><option>Student / fresher</option><option>1–2 years in IT / security</option><option>Experienced security professional</option></select></label><label>Preferred track<select name="track" value={track} onChange={(event) => setTrack(event.target.value)}>{tracks.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="mentorship-form-wide">What do you want to achieve?<textarea name="goal" required rows="6" placeholder="Tell me what you are learning now, where you are stuck, and what outcome you want." /></label><div className="mentorship-form-wide mentorship-form-footer"><p>Selected track: <strong>{selectedTrack.title}</strong></p><button type="submit">Send mentorship enquiry ↗</button></div></form>}</section>
    </main>
  );
}
