import { useMemo, useState } from "react";
import reviews from "../../testimonials.json";

const programs = [
	{
		id: "student",
		audience: "Students & beginners",
		title: "Security Foundations Track",
		detail: "A guided path from Linux basics and networking to web testing, recon, and structured lab practice that builds confidence fast.",
		topics: ["Linux & networking fundamentals", "OWASP Top 10", "Recon and web app testing", "CTF-style problem solving"],
	},
	{
		id: "career",
		audience: "Aspiring professionals",
		title: "Pentesting Career Accelerator",
		detail: "Turn your curiosity into a repeatable security workflow with portfolio-worthy labs, reporting practice, and strategic career guidance.",
		topics: ["VAPT methodology", "AD & internal network basics", "Professional reporting", "Interview + portfolio review"],
	},
	{
		id: "professional",
		audience: "Working professionals",
		title: "Security Skill Deep-Dive",
		detail: "Focused mentoring for appsec, offensive testing, automation, or detection engineering depending on your real-world objectives.",
		topics: ["Threat modelling", "API security", "Python automation", "SIEM and incident triage"],
	},
];

const benefits = [
	{
		title: "Actionable roadmap",
		text: "No random tutorials. You get a structured learning path based on your goal, current level, and time availability.",
	},
	{
		title: "Hands-on feedback",
		text: "Every lab, note, or report is reviewed with practical guidance so you improve faster and retain what matters.",
	},
	{
		title: "Career clarity",
		text: "From first break into cyber to becoming more effective on real assignments, mentorship is tailored to outcomes.",
	},
];

const steps = [
	["1", "Apply", "Tell me about your current skill level, your goal, and the type of learning support you need."],
	["2", "Map", "I recommend the right track and define the practical roadmap for your next milestones."],
	["3", "Grow", "You learn through guided labs, feedback loops, and realistic security problem solving."],
];

export default function MentorshipPage() {
	const [program, setProgram] = useState("student");
	const [submitted, setSubmitted] = useState(false);
	const selectedProgram = useMemo(() => programs.find((item) => item.id === program), [program]);

	const handleSubmit = (event) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const name = formData.get("name");
		const email = formData.get("email");
		const profile = formData.get("profile");
		const format = formData.get("format");
		const goal = formData.get("goal");
		const subject = `Mentorship enquiry — ${selectedProgram.title}`;
		const body = `Name: ${name}\nEmail: ${email}\nProfile: ${profile}\nTrack: ${selectedProgram.title}\nPreferred format: ${format}\n\nGoal:\n${goal}`;
		setSubmitted(true);
		window.location.href = `mailto:sathish1012cybok@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
	};

	return (
		<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mentorship-page">
			<div className="mentorship-topbar">
				<a className="mentorship-back" href="/portofolio/">← Back to home</a>
				<span className="mentorship-badge">1:1 coaching • practical labs</span>
			</div>

			<section className="mentorship-hero">
				<div className="mentorship-hero-copy">
					<p className="mentorship-kicker">CYBERSECURITY MENTORSHIP</p>
					<h1>
						Turn curiosity into <span>real-world security skill</span>.
					</h1>
					<p className="mentorship-lead">
						Guided learning for students, beginners, and professionals who want to build stronger offensive security fundamentals, sharper technical thinking, and a clearer career path in cybersecurity.
					</p>
					<div className="mentorship-hero-actions">
						<a className="mentorship-primary" href="#apply">Apply for mentorship</a>
						<a className="mentorship-secondary" href="#programs">Explore tracks</a>
					</div>
					<div className="mentorship-stat-row">
						<span><strong>30+</strong> learners mentored</span>
						<span><strong>1:1</strong> guided support</span>
						<span><strong>100%</strong> hands-on learning</span>
					</div>
				</div>

				<aside className="mentorship-hero-panel">
					<p className="mentorship-panel-label">WHAT YOU WILL GET</p>
					<ul>
						<li>Structured roadmap customized to your level</li>
						<li>Feedback on labs, reports, and real skills</li>
						<li>Clarity on what to learn next in cyber</li>
					</ul>
					<p className="mentorship-panel-note">
						The goal is simple: help you move from learning in fragments to building consistent, practical security capability.
					</p>
				</aside>
			</section>

			<section className="mentorship-section" id="programs">
				<div className="mentorship-heading">
					<p>CHOOSE YOUR PATH</p>
					<h2>Pick a track that matches where you are now.</h2>
					<span>Every mentorship plan is tailored around your experience, your goals, and the pace you want to grow at.</span>
				</div>
				<div className="mentorship-program-grid">
					{programs.map((item) => (
						<button
							key={item.id}
							type="button"
							className={`mentorship-program ${program === item.id ? "selected" : ""}`}
							onClick={() => setProgram(item.id)}
						>
							<span>{item.audience}</span>
							<h3>{item.title}</h3>
							<p>{item.detail}</p>
							<ul>
								{item.topics.map((topic) => (
									<li key={topic}>✓ {topic}</li>
								))}
							</ul>
							<strong>{program === item.id ? "Selected track" : "Select track"}</strong>
						</button>
					))}
				</div>
			</section>

			<section className="mentorship-section mentorship-why">
				<div className="mentorship-heading">
					<p>WHY THIS WORKS</p>
					<h2>Focused mentorship with practical outcomes.</h2>
				</div>
				<div className="mentorship-feature-grid">
					{benefits.map((benefit) => (
						<article key={benefit.title} className="mentorship-feature-card">
							<span className="mentorship-feature-icon">✦</span>
							<h3>{benefit.title}</h3>
							<p>{benefit.text}</p>
						</article>
					))}
				</div>
			</section>

			<section className="mentorship-section mentorship-process">
				<div className="mentorship-heading">
					<p>THE PROCESS</p>
					<h2>Simple, structured, and outcome-driven.</h2>
				</div>
				<div className="mentorship-steps">
					{steps.map(([number, title, detail]) => (
						<article key={number}>
							<span>{number}</span>
							<h3>{title}</h3>
							<p>{detail}</p>
						</article>
					))}
				</div>
			</section>

			<section className="mentorship-section mentorship-proof">
				<div className="mentorship-heading">
					<p>STUDENT FEEDBACK</p>
					<h2>Practical learning that actually sticks.</h2>
				</div>
				<div className="mentorship-proof-grid">
					{reviews.filter((review) => review.approved).slice(0, 3).map((review) => (
						<article key={review.id}>
							<p className="mentorship-stars">{'★'.repeat(review.rating)}</p>
							<blockquote>“{review.quote}”</blockquote>
							<strong>{review.name}</strong>
							<span>{review.track}</span>
						</article>
					))}
				</div>
			</section>

			<section className="mentorship-section mentorship-application" id="apply">
				<div className="mentorship-heading">
					<p>START HERE</p>
					<h2>Apply for mentorship.</h2>
					<span>Share your goal and I’ll help recommend the right path for your next step.</span>
				</div>

				{submitted ? (
					<div className="mentorship-success">
						<h3>Thanks — your mentorship interest is on the way.</h3>
						<p>
							Your email app has been opened with the selected track, <strong>{selectedProgram.title}</strong>, and your details already filled in. Send the message to complete your enquiry.
						</p>
						<button type="button" onClick={() => setSubmitted(false)}>Submit another response</button>
					</div>
				) : (
					<form className="mentorship-form" onSubmit={handleSubmit}>
						<label>Full name<input name="name" required placeholder="Your name" /></label>
						<label>Email address<input name="email" required type="email" placeholder="you@example.com" /></label>
						<label>Who are you?<select name="profile" required defaultValue=""><option value="" disabled>Select one</option><option>Student</option><option>Aspiring cybersecurity professional</option><option>Working security / IT professional</option><option>Team or organisation representative</option></select></label>
						<label>Mentorship track<select name="track" value={program} onChange={(event) => setProgram(event.target.value)}>{programs.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
						<label className="mentorship-form-wide">Your goal<textarea name="goal" required rows="5" placeholder="What would you like to achieve through mentorship? Include your current experience, skills, and the outcomes you want." /></label>
						<label className="mentorship-form-wide">Preferred format<select name="format" required defaultValue=""><option value="" disabled>Select a preference</option><option>One-to-one mentorship</option><option>Small group mentorship</option><option>Professional skill deep-dive</option><option>Not sure — recommend a format</option></select></label>
						<div className="mentorship-form-wide mentorship-form-footer">
							<p>Selected: <strong>{selectedProgram.title}</strong></p>
							<button type="submit">Request mentorship ↗</button>
						</div>
					</form>
				)}
			</section>
		</main>
	);
}
