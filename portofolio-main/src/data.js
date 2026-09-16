const securityAsset = (path) => `/portofolio/assets/sathish/images/${path}`;

export const listTools = [
  { id: 1, gambar: securityAsset("icons/shield.png"), nama: "Application & Web Security", ket: "Threat modelling · OWASP Top 10 · API security", dad: "100" },
  { id: 2, gambar: securityAsset("icons/target.png"), nama: "Penetration Testing & VAPT", ket: "Exploitation · PoC development · fuzzing", dad: "200" },
  { id: 3, gambar: securityAsset("icons/key.png"), nama: "Active Directory Security", ket: "Kerberos · NTLM relay · network pivoting", dad: "300" },
  { id: 4, gambar: securityAsset("icons/lock.png"), nama: "Security Monitoring & SIEM", ket: "Splunk · IOC analysis · threat detection", dad: "400" },
  { id: 5, gambar: securityAsset("icons/computer.png"), nama: "Python & Bash Automation", ket: "Recon workflows · reporting · hardening", dad: "500" },
  { id: 6, gambar: securityAsset("icons/setting.png"), nama: "Burp Suite Pro", ket: "Application security testing", dad: "600" },
  { id: 7, gambar: securityAsset("icons/target.png"), nama: "Metasploit & Nmap", ket: "Offensive operations & enumeration", dad: "700" },
  { id: 8, gambar: securityAsset("icons/computer.png"), nama: "Wireshark & Snort", ket: "Packet inspection & IDS analysis", dad: "800" },
  { id: 9, gambar: securityAsset("icons/lock.png"), nama: "Wazuh SIEM", ket: "Log ingestion & anomaly detection", dad: "900" },
  { id: 10, gambar: securityAsset("icons/rocket.png"), nama: "FastAPI & SQLite", ket: "Secure platform engineering", dad: "1000" },
  { id: 11, gambar: securityAsset("icons/setting.png"), nama: "C/C++ · JavaScript · SQL", ket: "Programming & version control", dad: "1100" },
  { id: 12, gambar: securityAsset("icons/shield.png"), nama: "PortSwigger Labs", ket: "Practical web-security research", dad: "1200" },
];

export const listProyek = [
  {
    id: 1, image: securityAsset("3d/exploit_target_3d.jpg"), title: "VulnLab — Vulnerable Web App for Pentesters", subtitle: "CTF training target with automated scoring",
    fullDescription: "Deliberately vulnerable web application covering SQL injection, XSS, IDOR, CSRF, command injection, and file upload in an isolated Docker environment with automated CTF-style scoring.",
    borderColor: "#8B5CF6", gradient: "linear-gradient(145deg, #8B5CF6, #000)", url: "#contact", dad: "100",
  },
  {
    id: 2, image: securityAsset("3d/radar_telemetry_3d.jpg"), title: "AI-Driven Network Intrusion Detection System", subtitle: "Deep packet anomaly classifier & alert harness",
    fullDescription: "Machine learning-based IDS using Scikit-learn and TensorFlow on network traffic captures, integrated with Snort and Wireshark for packet inspection and automated alerts.",
    borderColor: "#10B981", gradient: "linear-gradient(180deg, #10B981, #000)", url: "#contact", dad: "200",
  },
  {
    id: 3, image: securityAsset("3d/network_cube_3d.jpg"), title: "Centralized Log Monitoring — GCP & Wazuh", subtitle: "Enterprise SOC pipeline with Python alert workflows",
    fullDescription: "Enterprise SIEM architecture ingesting Apache and system logs into Wazuh on Google Cloud Platform, featuring dashboards, anomaly detection, and automated incident-triage scripts.",
    borderColor: "#3B82F6", gradient: "linear-gradient(145deg, #3B82F6, #000)", url: "#contact", dad: "300",
  },
  {
    id: 4, image: securityAsset("3d/cyber_shield_3d.jpg"), title: "SkillPath AI — Cybersecurity Roadmap Engine", subtitle: "Personalized adversarial learning paths",
    fullDescription: "Secure AI platform built with FastAPI and SQLite that delivers personalized cybersecurity roadmaps guided by OWASP secure-coding principles, role requirements, and interactive assessments.",
    borderColor: "#F59E0B", gradient: "linear-gradient(180deg, #F59E0B, #000)", url: "#contact", dad: "400",
  },
];
