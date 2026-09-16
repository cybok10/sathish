import { useState } from "react";
import ProfileCard from "./components/ProfileCard/ProfileCard";
import ShinyText from "./components/ShinyText/ShinyText";
import BlurText from "./components/BlurText/BlurText";
import Lanyard from "./components/Lanyard/Lanyard";
import { listTools, listProyek } from "./data";
import ChromaGrid from "./components/ChromaGrid/ChromaGrid";
import ProjectModal from "./components/ProjectModal/ProjectModal";
import Aurora from "./components/Aurora/Aurora";
import reviews from "./data/testimonials.json";

const asset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

function App() {
  const [selectedProject, setSelectedProject] = useState(null);

  const handleProjectClick = (project) => setSelectedProject(project);
  const handleCloseModal = () => setSelectedProject(null);

  return (
    <>
      <div className="absolute top-0 left-0 w-full h-full -z-10">
        <Aurora
          colorStops={["#577870", "#1F97A6", "#127B99"]}
          blend={0.5}
          amplitude={1.0}
          speed={0.5}
        />
      </div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="hero grid md:grid-cols-2 items-center pt-10 xl:gap-0 gap-6 grid-cols-1">
          <div className="animate__animated animate__fadeInUp animate__delay-3s">
            <div className="flex items-center gap-3 mb-6 bg-zinc-800 w-fit p-4 rounded-2xl">
              <img src={asset("assets/sathish/images/icons/shield.png")} className="w-10 rounded-md" alt="Cybersecurity shield" />
              <q>Security is not an afterthought.</q>
            </div>
            <h1 className="text-5xl font-bold mb-6">
              <ShinyText text="Hi, I'm Sathish M" disabled={false} speed={3} className="custom-class" />
            </h1>
            <BlurText
              text="Offensive cybersecurity researcher and mentor focused on discovering high-impact vulnerabilities before they become critical breaches."
              delay={150}
              animateBy="words"
              direction="top"
              className="mb-6"
            />
            <div className="flex items-center sm:gap-4 gap-2">
              <a
                href={asset("assets/sathish/resume.pdf")}
                download="Sathish_M_Resume.pdf"
                className="font-semibold bg-[#1a1a1a] p-4 px-6 rounded-full border border-gray-700 hover:bg-[#222] transition-colors"
              >
                <ShinyText text="Download CV" disabled={false} speed={3} className="custom-class" />
              </a>
              <a href="#project" className="font-semibold bg-[#1a1a1a] p-4 px-6 rounded-full border border-gray-700 hover:bg-[#222] transition-colors">
                <ShinyText text="Explore My Projects" disabled={false} speed={3} className="custom-class" />
              </a>
            </div>
          </div>
          <div className="md:ml-auto animate__animated animate__fadeInUp animate__delay-4s">
            <ProfileCard
              name="Sathish M"
              title="Cybersecurity Researcher"
              handle="cybok10"
              status="Online"
              contactText="Contact Me"
              avatarUrl={asset("assets/sathish/profile.png")}
              showUserInfo={true}
              enableTilt={true}
              enableMobileTilt={false}
              onContactClick={() => window.location.hash = "contact"}
            />
          </div>
        </div>

        <section className="mt-15 mx-auto w-full max-w-[1600px] rounded-3xl border-[5px] border-violet-500/40 shadow-[0_0_30px_rgba(168,85,247,0.4)] bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#1a1a1a] p-6" id="about">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10 pt-0 px-8" data-aos="fade-up" data-aos-duration="1000" data-aos-once="true">
            <div className="basis-full md:basis-7/12 pr-0 md:pr-8 border-b md:border-b-0 md:border-r border-violet-500/30">
              <div className="flex-1 text-left">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-5">About Me</h2>
                <BlurText
                  text="I’m Sathish M, a cybersecurity researcher and penetration tester specializing in web application security, Active Directory, network pivoting, and SOC telemetry with Wazuh SIEM. I also mentor students through hands-on labs and CTF-style learning at RedTeam Hacker Academy."
                  delay={150}
                  animateBy="words"
                  direction="top"
                  className="text-base md:text-lg leading-relaxed mb-10 text-gray-300"
                />
                <div className="flex flex-col sm:flex-row items-center sm:justify-between text-center sm:text-left gap-y-8 sm:gap-y-0 mb-4 w-full">
                  <div><h3 className="text-3xl md:text-4xl mb-1">30<span className="text-violet-500">+</span></h3><p>Students Mentored</p></div>
                  <div><h3 className="text-3xl md:text-4xl mb-1">3<span className="text-violet-500">+</span></h3><p>Security Engineering Roles</p></div>
                  <div><h3 className="text-3xl md:text-4xl mb-1">8.6<span className="text-violet-500">/10</span></h3><p>B.E. CSE CGPA</p></div>
                </div>
                <ShinyText text="Think like an attacker. Build stronger defenses." disabled={false} speed={3} className="text-sm md:text-base text-violet-400" />
              </div>
            </div>
            <div className="basis-full md:basis-5/12 pl-0 md:pl-8 overflow-hidden max-w-full flex justify-center">
              <Lanyard position={[0, 0, 15]} gravity={[0, -40, 0]} />
            </div>
          </div>
        </section>

        <section className="tools mt-32" aria-labelledby="tools-title">
          <h2 id="tools-title" className="text-4xl/snug font-bold mb-4" data-aos="fade-up" data-aos-duration="1000" data-aos-once="true">Security Arsenal</h2>
          <p className="w-full md:w-2/5 text-base/loose opacity-50" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="300" data-aos-once="true">Offensive security, detection engineering, and secure development tools.</p>
          <div className="tools-box mt-14 grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-4">
            {listTools.map((tool) => (
              <div key={tool.id} data-aos="fade-up" data-aos-duration="1000" data-aos-delay={tool.dad} data-aos-once="true" className="flex items-center gap-4 p-4 border border-zinc-700 rounded-xl bg-zinc-900/60 backdrop-blur-md hover:bg-zinc-800/80 transition-all duration-300 group shadow-lg">
                <img src={tool.gambar} alt={`${tool.nama} tool`} className="w-16 h-16 object-contain bg-zinc-800 p-2 rounded-lg group-hover:bg-zinc-900 transition-all duration-300" loading="lazy" />
                <div className="flex flex-col overflow-hidden">
                  <div className="truncate"><ShinyText text={tool.nama} disabled={false} speed={3} className="text-lg font-semibold block" /></div>
                  <p className="text-sm text-zinc-400 truncate">{tool.ket}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="proyek mt-32 py-10" id="project" data-aos="fade-up" data-aos-duration="1000" data-aos-once="true">
          <h2 className="text-center text-4xl font-bold mb-2">Projects</h2>
          <p className="text-base/loose text-center opacity-50">Practical security labs, detection pipelines, and secure engineering projects.</p>
          <div className="proyek-box mt-14">
            <div style={{ height: "auto", position: "relative" }} data-aos="fade-up" data-aos-duration="1000" data-aos-delay="400" data-aos-once="true">
              <ChromaGrid items={listProyek} onItemClick={handleProjectClick} radius={500} damping={0.45} fadeOut={0.6} ease="power3.out" />
            </div>
          </div>
        </section>

        <section className="mt-32" id="experience">
          <h2 className="text-center text-4xl font-bold mb-2" data-aos="fade-up" data-aos-once="true">Experience</h2>
          <p className="text-base/loose text-center opacity-50 mb-10">A hands-on path through offensive research, mentoring, and secure engineering.</p>
          <div className="experience-timeline">
            {[
              ["JUN 2026 — PRESENT", "Cybersecurity Researcher & Mentor", "RedTeam Hacker Academy", "Conduct offensive security research and build hands-on web and network pentesting labs. Mentor students in Metasploit, Burp Suite, Nmap, CTF problem-solving, and secure coding aligned with OWASP Top 10."],
              ["AUG 2025 — OCT 2025", "Penetration Testing Intern", "Cyber Nerd", "Conducted full-cycle web and network penetration tests with Metasploit, Nmap, and Burp Suite Pro; created Python tooling for vulnerability scanning, report generation, and system hardening."],
              ["JUN 2024 — AUG 2024", "Ethical Hacking Intern", "Internship Studio", "Performed OSINT reconnaissance, digital footprinting, and vulnerability assessments; delivered CVSS-rated remediation reports and built Python automation for reconnaissance workflows."],
              ["2022 — PRESENT", "B.E. Computer Science & Engineering", "Dhanalakshmi Srinivasan Engineering College", "CGPA: 8.6 · Perambalur, Tamil Nadu. Complemented academic study with security labs, CTF practice, and applied research."],
            ].map(([date, role, company, detail]) => (
              <article key={role} className="timeline-entry" data-aos="fade-up" data-aos-once="true">
                <div className="timeline-marker" aria-hidden="true" />
                <div className="timeline-card">
                  <p className="text-violet-400 text-sm mb-2">{date}</p>
                  <h3 className="text-xl font-bold mb-1">{role}</h3>
                  <p className="text-zinc-300 mb-3">{company}</p>
                  <p className="text-zinc-400 leading-relaxed">{detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-32" id="certifications">
          <h2 className="text-center text-4xl font-bold mb-2" data-aos="fade-up" data-aos-once="true">Certifications & Training</h2>
          <p className="text-base/loose text-center opacity-50 mb-10">Verified learning across offensive security, networking, and defensive monitoring.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              ["Certified Penetration Testing", "RedTeam Hacker Academy"],
              ["Advanced Ethical Hacking", "GUVI"],
              ["Offensive Pentesting", "Cybrary"],
              ["Networking Basics", "Cisco"],
              ["Linux, Network Security & Nmap", "Udemy"],
              ["Wireshark & Metasploit", "Infosys Springboard"],
              ["IoT Fundamentals", "NPTEL"],
            ].map(([certificate, issuer]) => (
              <article key={certificate} className="bg-zinc-900/60 border border-zinc-700 rounded-xl p-6" data-aos="fade-up" data-aos-once="true">
                <p className="text-violet-400 text-sm mb-2">CERTIFICATION</p>
                <h3 className="text-lg font-bold mb-2">{certificate}</h3>
                <p className="text-zinc-400">{issuer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-32" id="mentorship">
          <h2 className="text-center text-4xl font-bold mb-2" data-aos="fade-up" data-aos-once="true">Mentorship & Impact</h2>
          <p className="text-base/loose text-center opacity-50 mb-10">Training the next generation of ethical hackers through hands-on labs and practical security education.</p>
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <img src={asset("assets/sathish/images/students/classroom-session.jpeg")} alt="Sathish leading a cybersecurity training session" className="w-full h-72 object-cover rounded-xl border border-zinc-700" loading="lazy" />
            <img src={asset("assets/sathish/images/students/group-photo.jpeg")} alt="Students at a cybersecurity training session" className="w-full h-72 object-cover rounded-xl border border-zinc-700" loading="lazy" />
          </div>
          <div className="reviews-marquee" aria-label="Student reviews">
            <div className="reviews-track">
              {[...reviews.filter((review) => review.approved), ...reviews.filter((review) => review.approved)].map((review, index) => (
                <article key={`${review.id}-${index}`} className="review-float-card" aria-hidden={index >= reviews.filter((item) => item.approved).length}>
                  <p className="text-yellow-400 mb-3" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}</p>
                  <p className="text-zinc-300 leading-relaxed mb-4">“{review.quote}”</p>
                  <p className="font-semibold">{review.name}</p>
                  <p className="text-sm text-zinc-500">{review.track}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="kontak mt-32 sm:p-10 p-0" id="contact">
          <h2 className="text-4xl mb-2 font-bold text-center" data-aos="fade-up" data-aos-duration="1000" data-aos-once="true">Let’s Make Systems Harder to Break</h2>
          <p className="text-base/loose text-center mb-10 opacity-50" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="300" data-aos-once="true">Looking for a penetration tester, application-security researcher, or hands-on cybersecurity trainer? Let’s collaborate.</p>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 bg-zinc-800 p-6 rounded-md" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="400" data-aos-once="true">
              <h3 className="text-2xl font-bold mb-5">Connect with Sathish</h3>
              <p className="text-zinc-400 mb-6 leading-relaxed">Available for security engineering, penetration testing, application-security research, and cybersecurity training.</p>
              <div className="flex flex-col gap-4">
                <a className="text-violet-400 hover:text-violet-300" href="mailto:sathish1012cybok@gmail.com">sathish1012cybok@gmail.com</a>
                <a className="text-violet-400 hover:text-violet-300" href="tel:+918940599732">+91 89405 99732</a>
                <a className="text-violet-400 hover:text-violet-300" href="https://linkedin.com/in/amsathish" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
                <a className="text-violet-400 hover:text-violet-300" href="https://github.com/cybok10" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
              </div>
            </div>
            <div className="flex-1">
              <form action="https://formsubmit.co/sathish1012cybok@gmail.com" method="POST" className="bg-zinc-800 p-10 w-full rounded-md" autoComplete="off" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="500" data-aos-once="true">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2"><label htmlFor="contact-name" className="font-semibold">Full Name</label><input id="contact-name" type="text" name="Name" placeholder="Input Name..." className="border border-zinc-500 p-2 rounded-md" required /></div>
                  <div className="flex flex-col gap-2"><label htmlFor="contact-email" className="font-semibold">Email</label><input id="contact-email" type="email" name="Email" placeholder="Input Email..." className="border border-zinc-500 p-2 rounded-md" required /></div>
                  <div className="flex flex-col gap-2"><label htmlFor="message" className="font-semibold">Message</label><textarea name="message" id="message" rows="7" placeholder="Message..." className="border border-zinc-500 p-2 rounded-md" required /></div>
                  <div className="text-center"><button type="submit" className="font-semibold bg-[#1a1a1a] p-4 px-6 rounded-full w-full cursor-pointer border border-gray-700 hover:bg-[#222] transition-colors"><ShinyText text="Send" disabled={false} speed={3} className="custom-class" /></button></div>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>

      <ProjectModal isOpen={!!selectedProject} onClose={handleCloseModal} project={selectedProject} />
    </>
  );
}

export default App;
