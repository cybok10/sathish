import { useMemo, useState } from "react";

const tracks = [
  {
    id: "foundation",
    number: "01",
    level: "BEGINNER",
    title: "Cybersecurity Foundations",
    summary: "Start from zero and understand the building blocks before touching advanced tools.",
    topics: ["Linux & networking basics", "Web & application security", "OWASP fundamentals", "Reconnaissance mindset", "Safe hands-on labs"],
  },
  {
    id: "pentest",
    number: "02",
    level: "INTERMEDIATE",
    title: "Penetration Testing",
    summary: "Learn a repeatable workflow for finding, validating, documenting, and fixing security weaknesses.",
    topics: ["Nmap & enumeration", "Burp Suite workflow", "Web & network testing", "Vulnerability validation", "Professional reporting"],
  },
  {
    id: "career",
    number: "03",
    level: "CAREER",
    title: "Cybersecurity Career",
    summary: "Turn your learning into projects, portfolio evidence, interview preparation, and a practical roadmap.",
    topics: ["Skill-gap assessment", "Portfolio projects", "Resume & LinkedIn", "Interview preparation", "Role-based roadmap"],
  },
];

const reviews = [
  { name: "King Nelson", role: "Cybersecurity & Penetration Testing", image: "Screenshot From 2026-09-14 13-03-33.png", text: "I had a great learning experience with Mr. Sathish. He explains the concepts clearly and makes even difficult topics easy to understand. His practical approach and real-world examples helped me understand the subjects better." },
  { name: "Natarajan Ramasamy", role: "Penetration Testing", image: "Screenshot From 2026-09-14 13-03-39.png", text: "I had a great learning experience at RedTeam Hacker Academy. The training is practical and focuses on understanding concepts rather than just memorizing theory. Sathish explained topics clearly and helped build strong fundamentals." },
  { name: "Vandu Yuvan", role: "Ethical Hacking & Practical Labs", image: "Screenshot From 2026-09-14 13-03-48.png", text: "Best teaching from trainer Sathish, well experienced, and more knowledge gained. 5/5." },
  { name: "Rathish Aathi", role: "CPT V4", image: "Screenshot From 2026-09-14 13-03-54.png", text: "Sathish Sir explains everything with great clarity and real-world scenarios. The academy has a very good structure and a comfortable, professional environment." },
  { name: "Kabilash K N", role: "Certified Penetration Tester", image: "Screenshot From 2026-09-14 13-04-00.png", text: "The practical sessions and hands-on approach helped me understand penetration testing and different cybersecurity tools better. Whenever I had doubts, Sir was supportive and patient." },
  { name: "S Ranjith Kumar", role: "CPT Foundation & Offensive Security", image: "Screenshot From 2026-09-14 13-04-17.png", text: "The curriculum is well-structured, covering everything from reconnaissance to exploitation with a strong practical focus. Sathish explained complex concepts in a clear and simple manner." },
];

const faqs = [
  ["Do I need cybersecurity experience?", "No. The beginner track starts with Linux, networking, web basics, and security fundamentals before moving into tools."],
  ["Is this only theory?", "No. The approach combines concepts with controlled labs, investigation exercises, projects, review, and feedback."],
  ["Which tools will I learn?", "Depending on your track, you may work with tools such as Nmap, Burp Suite, Wireshark, Linux security utilities, and other lab-safe tooling."],
  ["Can you help me choose a career path?", "Yes. We can map your current skills to practical next steps for roles such as SOC, penetration testing, security engineering, or security training."],
];

const css = `
.mentorship-page{--m-bg:#030712;--m-panel:rgba(10,20,38,.72);--m-panel2:rgba(14,29,52,.9);--m-line:rgba(110,190,255,.18);--m-blue:#38bdf8;--m-cyan:#22d3ee;--m-purple:#8b5cf6;--m-text:#f8fafc;--m-muted:#94a3b8;position:relative;isolation:isolate;color:var(--m-text);padding-bottom:90px;overflow:hidden;background:radial-gradient(circle at 75% 4%,rgba(56,189,248,.12),transparent 28%),radial-gradient(circle at 15% 38%,rgba(139,92,246,.08),transparent 26%),linear-gradient(180deg,#020617 0%,#030712 48%,#020617 100%);border-radius:28px}
.mentorship-page *{box-sizing:border-box}.mentorship-page a{text-decoration:none}.m-shell{width:min(1180px,calc(100% - 32px));margin:auto}.m-nav{display:flex;justify-content:space-between;align-items:center;padding:24px 0 8px}.m-back{color:#a5dfff;font-size:13px;font-weight:700;letter-spacing:.04em}.m-chip{border:1px solid var(--m-line);background:rgba(15,23,42,.62);padding:8px 13px;border-radius:999px;color:#bae6fd;font-size:11px;letter-spacing:.1em;text-transform:uppercase}.m-hero{display:grid;grid-template-columns:1.02fr .98fr;gap:28px;align-items:center;min-height:680px;padding:54px 0 70px}.m-eyebrow,.m-section-label{color:#67e8f9;font-size:11px;font-weight:800;letter-spacing:.2em}.m-hero h1{font-size:clamp(44px,6vw,76px);line-height:.98;letter-spacing:-.055em;margin:18px 0 22px;max-width:720px}.m-hero h1 span{background:linear-gradient(90deg,#38bdf8,#a78bfa);-webkit-background-clip:text;background-clip:text;color:transparent}.m-lead{font-size:17px;line-height:1.75;color:#a9b8cc;max-width:640px}.m-actions{display:flex;gap:12px;flex-wrap:wrap;margin:30px 0}.m-primary,.m-secondary{padding:13px 19px;border-radius:13px;font-weight:800;font-size:14px;transition:.2s ease}.m-primary{color:#00111c;background:linear-gradient(100deg,#38bdf8,#818cf8);box-shadow:0 10px 35px rgba(56,189,248,.2)}.m-secondary{color:#dbeafe;border:1px solid var(--m-line);background:rgba(15,23,42,.45)}.m-primary:hover,.m-secondary:hover{transform:translateY(-2px)}.m-quick{display:flex;gap:10px;flex-wrap:wrap}.m-quick span{border-left:2px solid #38bdf8;padding:4px 14px;color:#94a3b8;font-size:12px}.m-quick b{display:block;color:#f8fafc;font-size:18px}.m-portrait-wrap{position:relative;min-height:570px;border:1px solid rgba(56,189,248,.2);border-radius:30px;background:radial-gradient(circle at 50% 35%,rgba(56,189,248,.16),transparent 48%),linear-gradient(145deg,rgba(15,23,42,.9),rgba(3,7,18,.4));overflow:hidden;box-shadow:0 0 80px rgba(37,99,235,.12)}.m-portrait-wrap:before{content:"";position:absolute;inset:18px;border:1px solid rgba(139,92,246,.18);border-radius:23px;pointer-events:none}.m-portrait{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 15%;filter:saturate(.98) contrast(1.03);mix-blend-mode:normal}.m-portrait-glow{position:absolute;width:240px;height:240px;border-radius:50%;background:rgba(34,211,238,.12);filter:blur(70px);left:50%;top:25%;transform:translate(-50%,-50%)}.m-portrait-tag{position:absolute;left:22px;bottom:22px;right:22px;display:flex;justify-content:space-between;gap:14px;align-items:end;padding:17px;border:1px solid var(--m-line);background:rgba(2,6,23,.78);backdrop-filter:blur(14px);border-radius:17px}.m-portrait-tag strong{font-size:18px}.m-portrait-tag span{display:block;color:#8fa5bc;font-size:11px;margin-top:4px}.m-mentor-mark{font-size:11px;color:#67e8f9;letter-spacing:.14em;text-align:right}.m-section{padding:86px 0}.m-section-head{max-width:720px;margin-bottom:30px}.m-section-head h2{font-size:clamp(32px,4vw,50px);letter-spacing:-.04em;margin:10px 0 12px}.m-section-head p{color:#91a3b9;line-height:1.7;margin:0}.m-track-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.m-track{border:1px solid var(--m-line);border-radius:22px;padding:25px;background:linear-gradient(160deg,rgba(15,30,52,.8),rgba(5,12,24,.7));text-align:left;color:inherit;cursor:pointer;transition:.25s ease}.m-track:hover,.m-track.active{transform:translateY(-5px);border-color:rgba(56,189,248,.6);box-shadow:0 18px 55px rgba(37,99,235,.12)}.m-track-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:25px}.m-track-num{font-size:31px;font-weight:900;color:rgba(103,232,249,.7)}.m-level{font-size:10px;letter-spacing:.14em;color:#c4b5fd;border:1px solid rgba(139,92,246,.35);padding:6px 8px;border-radius:999px}.m-track h3{font-size:22px;margin:0 0 10px}.m-track p{color:#91a3b9;line-height:1.65;font-size:14px;min-height:72px}.m-track ul{padding:0;margin:20px 0;list-style:none}.m-track li{color:#cbd5e1;font-size:13px;padding:7px 0;border-top:1px solid rgba(148,163,184,.1)}.m-track li:before{content:"✓";color:#22d3ee;margin-right:8px;font-weight:900}.m-track-cta{color:#67e8f9;font-size:12px;font-weight:800}.m-roadmap{border:1px solid var(--m-line);border-radius:24px;padding:30px;background:rgba(7,15,29,.62)}.m-roadmap-row{display:grid;grid-template-columns:100px 1fr;gap:24px;padding:23px 0;border-bottom:1px solid rgba(148,163,184,.1)}.m-roadmap-row:last-child{border-bottom:0}.m-roadmap-num{font-size:28px;font-weight:900;color:#818cf8}.m-roadmap-row h3{margin:0 0 7px}.m-roadmap-row p{margin:0;color:#91a3b9;line-height:1.65}.m-benefits{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.m-benefit{padding:23px;border-radius:19px;background:linear-gradient(150deg,rgba(15,23,42,.78),rgba(2,6,23,.65));border:1px solid rgba(148,163,184,.12)}.m-icon{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.2);color:#67e8f9;font-weight:900}.m-benefit h3{margin:18px 0 8px}.m-benefit p{color:#91a3b9;line-height:1.65;font-size:14px}.m-proof{display:grid;grid-template-columns:.75fr 1.25fr;gap:25px;align-items:stretch}.m-proof-intro{padding:28px;border:1px solid var(--m-line);border-radius:22px;background:linear-gradient(145deg,rgba(15,23,42,.8),rgba(8,15,28,.5))}.m-proof-intro h3{font-size:27px;margin:12px 0}.m-proof-intro p{color:#91a3b9;line-height:1.7}.m-proof-score{font-size:42px;font-weight:900;background:linear-gradient(90deg,#38bdf8,#a78bfa);-webkit-background-clip:text;background-clip:text;color:transparent}.m-review-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.m-review{border:1px solid rgba(148,163,184,.13);background:rgba(10,20,38,.7);border-radius:19px;padding:20px}.m-review-top{display:flex;gap:12px;align-items:center}.m-review img{width:46px;height:46px;border-radius:50%;object-fit:cover;border:1px solid rgba(56,189,248,.25)}.m-review strong{display:block;font-size:14px}.m-review small{color:#71839a}.m-stars{color:#fbbf24;letter-spacing:2px;margin:16px 0 8px}.m-review blockquote{margin:0;color:#c5d0df;line-height:1.6;font-size:13px}.m-apply{display:grid;grid-template-columns:.8fr 1.2fr;gap:25px}.m-apply-copy{padding:25px}.m-apply-copy ul{list-style:none;padding:0;margin:22px 0}.m-apply-copy li{padding:10px 0;color:#a5b4c7}.m-apply-copy li:before{content:"→";color:#22d3ee;margin-right:10px}.m-form{border:1px solid rgba(56,189,248,.28);border-radius:24px;padding:25px;background:linear-gradient(145deg,rgba(10,25,45,.9),rgba(5,11,22,.85));box-shadow:0 20px 70px rgba(2,132,199,.08)}.m-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.m-form label{display:block;color:#a7b7c9;font-size:12px;font-weight:700}.m-form input,.m-form select,.m-form textarea{width:100%;margin-top:7px;background:#071323;border:1px solid rgba(148,163,184,.18);color:#f8fafc;border-radius:11px;padding:12px 13px;outline:none;font:inherit}.m-form textarea{resize:vertical;min-height:130px}.m-form input:focus,.m-form select:focus,.m-form textarea:focus{border-color:#38bdf8;box-shadow:0 0 0 3px rgba(56,189,248,.08)}.m-wide{grid-column:1/-1}.m-submit{border:0;width:100%;margin-top:15px;padding:14px;border-radius:12px;font-weight:900;cursor:pointer;color:#00111c;background:linear-gradient(100deg,#38bdf8,#8b5cf6)}.m-success{padding:28px;border:1px solid rgba(34,197,94,.3);border-radius:20px;background:rgba(20,83,45,.12);color:#bbf7d0}.m-faq{display:grid;grid-template-columns:1fr 1fr;gap:12px}.m-faq-item{border:1px solid rgba(148,163,184,.12);border-radius:15px;background:rgba(10,20,38,.65);overflow:hidden}.m-faq-item button{width:100%;padding:18px;text-align:left;border:0;background:transparent;color:#e2e8f0;font-weight:800;cursor:pointer;display:flex;justify-content:space-between}.m-faq-answer{padding:0 18px 18px;color:#8fa1b6;line-height:1.6;font-size:13px}.m-bottom{border-top:1px solid rgba(148,163,184,.1);padding-top:30px;display:flex;justify-content:space-between;gap:20px;color:#71839a;font-size:12px}.m-bottom strong{color:#cbd5e1}.m-disclaimer{margin-top:18px;color:#64748b;font-size:11px;line-height:1.6}.m-apply-link{display:inline-block;margin-top:16px;color:#67e8f9;font-size:13px;font-weight:800}
@media(max-width:900px){.m-hero,.m-proof,.m-apply{grid-template-columns:1fr}.m-portrait-wrap{min-height:520px}.m-track-grid,.m-benefits{grid-template-columns:1fr}.m-review-grid,.m-faq{grid-template-columns:1fr}.m-hero{padding-top:35px}.m-hero h1{font-size:48px}}
@media(max-width:600px){.mentorship-page{border-radius:18px}.m-shell{width:min(100% - 22px,1180px)}.m-nav{padding-top:16px}.m-chip{display:none}.m-hero{padding:35px 0 50px;min-height:auto}.m-hero h1{font-size:40px}.m-lead{font-size:15px}.m-quick span{padding-left:9px}.m-portrait-wrap{min-height:460px}.m-portrait-tag{left:12px;right:12px;bottom:12px}.m-section{padding:60px 0}.m-section-head h2{font-size:34px}.m-roadmap-row{grid-template-columns:55px 1fr;gap:12px}.m-form-grid{grid-template-columns:1fr}.m-wide{grid-column:auto}.m-bottom{display:block}.m-bottom span{display:block;margin-top:10px}}
`;

export default function MentorshipPage() {
  const [selected, setSelected] = useState("foundation");
  const [faqOpen, setFaqOpen] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const selectedTrack = useMemo(() => tracks.find((track) => track.id === selected) ?? tracks[0], [selected]);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const asset = (path) => `${basePath}/assets/sathish/${path}`;
  const reviewAsset = (name) => `${basePath}/assets/sathish/images/reviews/${encodeURIComponent(name)}`;

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const subject = `Mentorship enquiry — ${selectedTrack.title}`;
    const body = [`Name: ${form.get("name")}`, `Email: ${form.get("email")}`, `Experience: ${form.get("experience")}`, `Track: ${selectedTrack.title}`, "", `Goal: ${form.get("goal")}`].join("\n");
    setSubmitted(true);
    window.location.href = `mailto:sathish1012cybok@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <main className="mentorship-page">
      <style>{css}</style>
      <div className="m-shell">
        <nav className="m-nav"><a className="m-back" href={`${basePath}/`}>← Back to portfolio</a><span className="m-chip">1:1 Mentorship • Learn by doing</span></nav>

        <section className="m-hero">
          <div>
            <p className="m-eyebrow">CYBERSECURITY MENTORSHIP / 01</p>
            <h1>Learn security.<br/><span>Build confidence.</span><br/>Create your path.</h1>
            <p className="m-lead">A beginner-friendly, practical mentorship experience for people who want to understand cybersecurity clearly, practise safely, build real projects, and move toward a security career.</p>
            <div className="m-actions"><a className="m-primary" href="#apply">Start your journey ↗</a><a className="m-secondary" href="#tracks">Explore tracks</a></div>
            <div className="m-quick"><span><b>30+</b>Learners guided</span><span><b>1:1</b>Focused support</span><span><b>Hands-on</b>Lab-first</span></div>
          </div>
          <div className="m-portrait-wrap"><div className="m-portrait-glow"/><img className="m-portrait" src={asset("profile.png")} alt="Sathish M — Cybersecurity Mentor"/><div className="m-portrait-tag"><div><strong>Sathish M</strong><span>Cybersecurity Mentor • Trainer • Builder</span></div><div className="m-mentor-mark">LEARN<br/>PRACTICE<br/>BUILD</div></div></div>
        </section>

        <section className="m-section" id="tracks">
          <div className="m-section-head"><p className="m-section-label">CHOOSE YOUR STARTING POINT</p><h2>Three clear paths. One practical approach.</h2><p>You do not need to know everything before you begin. Pick the path closest to your goal and the plan can be adjusted as you progress.</p></div>
          <div className="m-track-grid">{tracks.map((track) => <button type="button" key={track.id} className={`m-track ${selected === track.id ? "active" : ""}`} onClick={() => setSelected(track.id)} aria-pressed={selected === track.id}><div className="m-track-top"><span className="m-track-num">{track.number}</span><span className="m-level">{track.level}</span></div><h3>{track.title}</h3><p>{track.summary}</p><ul>{track.topics.map((topic) => <li key={topic}>{topic}</li>)}</ul><span className="m-track-cta">{selected === track.id ? "Selected path ✓" : "Choose this path →"}</span></button>)}</div>
        </section>

        <section className="m-section">
          <div className="m-section-head"><p className="m-section-label">YOUR LEARNING JOURNEY</p><h2>From beginner to capable.</h2><p>Cybersecurity becomes easier when the learning order makes sense. This is the basic progression we use to turn theory into confidence.</p></div>
          <div className="m-roadmap"><div className="m-roadmap-row"><span className="m-roadmap-num">01</span><div><h3>Understand</h3><p>Learn how computers, networks, operating systems, web applications, authentication, and common security weaknesses work.</p></div></div><div className="m-roadmap-row"><span className="m-roadmap-num">02</span><div><h3>Practise</h3><p>Use controlled labs to investigate security problems. Learn why a technique works instead of simply copying a command.</p></div></div><div className="m-roadmap-row"><span className="m-roadmap-num">03</span><div><h3>Build</h3><p>Create projects, document findings, write reports, and develop evidence that demonstrates what you can actually do.</p></div></div><div className="m-roadmap-row"><span className="m-roadmap-num">04</span><div><h3>Advance</h3><p>Review your skill gaps, prepare for interviews, and choose the next security capability that matches your target role.</p></div></div></div>
        </section>

        <section className="m-section">
          <div className="m-section-head"><p className="m-section-label">WHAT YOU GET</p><h2>Mentorship that explains the “why”.</h2></div>
          <div className="m-benefits"><article className="m-benefit"><div className="m-icon">01</div><h3>Simple explanations</h3><p>Complex security concepts are broken into understandable steps, with examples before advanced terminology.</p></article><article className="m-benefit"><div className="m-icon">02</div><h3>Practical feedback</h3><p>Get feedback on labs, methodology, projects, reports, and the decisions you make while solving problems.</p></article><article className="m-benefit"><div className="m-icon">03</div><h3>Career direction</h3><p>Connect your learning to portfolio work, interviews, role expectations, and a realistic next-step roadmap.</p></article></div>
        </section>

        <section className="m-section">
          <div className="m-section-head"><p className="m-section-label">LEARNER FEEDBACK</p><h2>Real feedback from the learning journey.</h2><p>The review screenshots below are the same review assets already present in your portfolio.</p></div>
          <div className="m-proof"><div className="m-proof-intro"><div className="m-proof-score">5/5</div><h3>Practical. Clear. Supportive.</h3><p>Feedback commonly highlights clear explanations, practical sessions, real-world examples, and support while working through cybersecurity concepts.</p><a className="m-apply-link" href="#apply">Want to start learning? →</a></div><div className="m-review-grid">{reviews.map((review) => <article className="m-review" key={review.name}><div className="m-review-top"><img src={reviewAsset(review.image)} alt=""/><div><strong>{review.name}</strong><small>{review.role}</small></div></div><div className="m-stars" aria-label="5 out of 5 stars">★★★★★</div><blockquote>“{review.text}”</blockquote></article>)}</div></div>
        </section>

        <section className="m-section">
          <div className="m-section-head"><p className="m-section-label">FAQ</p><h2>Questions beginners usually ask.</h2></div>
          <div className="m-faq">{faqs.map(([question, answer], index) => <article className="m-faq-item" key={question}><button type="button" onClick={() => setFaqOpen(faqOpen === index ? -1 : index)} aria-expanded={faqOpen === index}><span>{question}</span><span>{faqOpen === index ? "−" : "+"}</span></button>{faqOpen === index && <div className="m-faq-answer">{answer}</div>}</article>)}</div>
        </section>

        <section className="m-section" id="apply">
          <div className="m-apply"><div className="m-apply-copy"><p className="m-section-label">START A CONVERSATION</p><h2>Not sure where to begin?</h2><p className="m-lead">Tell me what you know today, what you want to learn, and where you want to go. We can start from your current level instead of forcing you into a fixed syllabus.</p><ul><li>✓ Beginner-friendly guidance</li><li>✓ Practical learning plan</li><li>✓ Project and portfolio direction</li><li>✓ Interview and career preparation</li></ul><p className="m-disclaimer">Mentorship focuses on authorized, ethical, and controlled security learning. No testing of systems you do not own or have permission to assess.</p></div>
            {submitted ? <div className="m-success"><h3>Your enquiry is prepared.</h3><p>Your email client should have opened with the mentorship details. Send it to complete your enquiry.</p><button className="m-submit" type="button" onClick={() => setSubmitted(false)}>Send another enquiry</button></div> : <form className="m-form" onSubmit={handleSubmit}><div className="m-form-grid"><label>Name<input name="name" autoComplete="name" required placeholder="Your name"/></label><label>Email<input name="email" type="email" autoComplete="email" required placeholder="you@example.com"/></label><label>Current level<select name="experience" required defaultValue=""><option value="" disabled>Select your level</option><option>Complete beginner</option><option>Student / fresher</option><option>Learning cybersecurity</option><option>Working in IT / security</option></select></label><label>Mentorship track<select name="track" value={selected} onChange={(event) => setSelected(event.target.value)}>{tracks.map((track) => <option key={track.id} value={track.id}>{track.title}</option>)}</select></label><label className="m-wide">What do you want to achieve?<textarea name="goal" required placeholder="Example: I know Linux and networking basics and want to start penetration testing."/></label></div><button className="m-submit" type="submit">Send mentorship enquiry ↗</button></form>}
          </div>
        </section>

        <footer className="m-bottom"><span>© {new Date().getFullYear()} <strong>Sathish M</strong> • Cybersecurity Mentor</span><span>Learn • Practice • Build • Secure</span></footer>
      </div>
    </main>
  );
}
