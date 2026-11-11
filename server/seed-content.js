/**
 * First-run content. This is seed data for the database only – the public
 * frontend always reads from the API/DB, never from this file.
 */

export const seedAuthors = [
  {
    name: "Sathish M",
    slug: "sathish-m",
    role: "Cybersecurity Researcher & Mentor",
    bio: "Offensive security researcher and penetration tester focused on web application security, Active Directory, network pivoting, and SOC telemetry. I mentor students through hands-on labs and CTF-style learning at RedTeam Hacker Academy.",
    avatar_url: "/assets/sathish/sathish1.png",
    email: "sathish1012cybok@gmail.com",
    github: "https://github.com/cybok10",
    linkedin: "https://linkedin.com/in/amsathish",
    twitter: "",
  },
];

export const seedCategories = [
  {
    name: "Offensive Security",
    slug: "offensive-security",
    description: "Reconnaissance, exploitation, Active Directory, and adversary tradecraft from a practitioner's point of view.",
  },
  {
    name: "Application Security",
    slug: "application-security",
    description: "Threat modelling, secure code review, OWASP Top 10, and defending modern web applications.",
  },
  {
    name: "Detection Engineering",
    slug: "detection-engineering",
    description: "SIEM pipelines, log analysis, alert tuning, and building telemetry that actually catches attackers.",
  },
  {
    name: "Career & Mentorship",
    slug: "career-mentorship",
    description: "Learning paths, CTF habits, reporting, and the human side of becoming a security engineer.",
  },
];

export const seedTags = [
  "recon", "nmap", "osint", "web-security", "xss", "owasp", "wazuh",
  "siem", "python", "active-directory", "kerberos", "reporting",
  "career", "ctf", "react", "vite", "hardening",
];

const A = (id) => id;

export const seedPosts = [
  {
    title: "Mapping the Modern Attack Surface: A Practical Recon Playbook",
    slug: "modern-attack-surface-recon-playbook",
    excerpt:
      "A repeatable reconnaissance workflow that moves from passive OSINT to verified exposure, with the exact commands and decision points I use on real engagements.",
    category: "offensive-security",
    tags: ["recon", "nmap", "osint"],
    is_featured: 1,
    views: 2841,
    published_at: "2026-10-18T07:30:00.000Z",
    cover_image: "/assets/sathish/images/3d/radar_telemetry_3d.jpg",
    content: `Reconnaissance is not a checklist you run once. It is a feedback loop: every new host, certificate, and JavaScript bundle changes the questions you should ask next. On a recent assessment the entire initial foothold came from a forgotten staging host discovered through a certificate transparency entry, not from the main application.

This playbook is the loop I use to keep that discovery process honest.

## 1. Define the boundary before touching a tool

Write down what is in scope, who owns the asset, and what "stop" looks like. Recon without a boundary is just noise, and noise creates legal risk.

- Confirm the signed scope and testing window.
- Identify third-party hosting and cloud tenancy boundaries.
- Agree on how to handle a critical finding discovered out of hours.

## 2. Start passive, then get specific

Passive sources cost nothing and leave no trace on the target.

\`\`\`bash
# Certificate transparency, no traffic to the target
curl -s "https://crt.sh/?q=%25.example.com&output=json" \\
  | jq -r '.[].name_value' | sort -u

# Subdomain candidates from multiple passive sources
for src in crtsh virustotal otx; do
  amass enum -passive -d example.com -src "$src" -o "subs-$src.txt"
done
\`\`\`

Consolidate the output, de-duplicate it, and resolve only what survives. A list with 4,000 candidates is not useful until you can explain why each host might matter.

## 3. Verify exposure with minimal traffic

Once you have a shortlist, move to low-volume active checks. Rate-limit yourself even when the scope does not require it — production teams notice spikes before they notice the finding.

\`\`\`bash
nmap -sS -Pn -T2 --top-ports 200 -iL shortlist.txt -oA verified
httpx -l shortlist.txt -status-code -title -tech-detect -o live.txt
\`\`\`

> If a check could interrupt a service, it belongs in a scheduled window with the client watching — not in an exploratory pass.

## 4. Turn evidence into a story

A screenshot of an open port is not a finding. The finding is the business consequence of that exposure. For each verified asset record:

| Field | What to capture |
| --- | --- |
| Asset | Hostname, IP, owning team |
| Evidence | Request/response, timestamp, tool output |
| Impact | What an attacker could reach from here |
| Fix | Specific, testable remediation |

## 5. Feed the loop

Every verified asset becomes a new seed: an exposed API suggests documentation endpoints, which suggest older API versions, which suggest a changelog. That is the loop. Stop when new branches stop producing new evidence, not when the clock runs out.

The most valuable skill in recon is knowing which signal deserves the next hour.`,
  },
  {
    title: "Stored XSS Is Not Dead: A Modern Exploitation and Defense Guide",
    slug: "stored-xss-exploitation-and-defense",
    excerpt:
      "Why content sanitisation still fails in 2026, how to prove impact without breaking production, and the defense-in-depth controls that actually hold.",
    category: "application-security",
    tags: ["web-security", "xss", "owasp"],
    is_featured: 1,
    views: 1976,
    published_at: "2026-09-22T10:00:00.000Z",
    cover_image: "/assets/sathish/images/3d/exploit_target_3d.jpg",
    content: `Stored cross-site scripting keeps appearing in mature applications for the same reason: the input is validated at the edge, then re-interpreted somewhere else. A rich-text field stores HTML, a report renderer trusts it, an admin panel displays it, and the trust boundary disappears.

## The failure pattern

Most mitigations fail at one of three points:

1. **Validation is applied to the wrong representation.** The request is checked as JSON, but the stored value is rendered as HTML.
2. **Sanitisation is not context-aware.** HTML sanitisation does not protect a value inserted into a JavaScript string or an attribute.
3. **The dangerous sink is added later.** A new PDF export or email template reintroduces the sink after the original review.

## Proving impact safely

Use a benign payload that demonstrates execution without touching user data:

\`\`\`html
<img src=x onerror="document.body.dataset.xss='confirmed'">
\`\`\`

Then verify in a browser with the same role as the victim. Document the privilege of the account that triggered the payload and the privilege of every account that renders it. A self-XSS that only fires for the author is usually low severity; the same payload firing in an administrator queue is a different conversation.

## Defense that holds

- Sanitise on **output**, using a maintained, allow-list based library for the exact context.
- Prefer frameworks that escape by default, and treat \`dangerouslySetInnerHTML\` as a code-review red flag.
- Apply a strict Content Security Policy and remove \`unsafe-inline\` where possible.
- Set \`HttpOnly\`, \`Secure\`, and \`SameSite\` cookies so script execution cannot simply read the session.
- Add server-side authorisation checks on every mutation; XSS should not also be privilege escalation.

\`\`\`http
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'
\`\`\`

## A review checklist

| Question | Why it matters |
| --- | --- |
| Where is the value stored? | Determines every future sink |
| Who can read the stored value? | Defines the real blast radius |
| Is the sink HTML, attribute, URL, or JS? | Context decides the encoding |
| Can the payload survive a re-save? | Tests the sanitisation loop, not one request |

The fix is rarely one line. It is a consistent rule about which layer owns encoding — and a test that fails when someone breaks that rule.`,
  },
  {
    title: "Building a Detection Pipeline with Wazuh and Python",
    slug: "wazuh-python-detection-pipeline",
    excerpt:
      "How I wired Apache and system logs into Wazuh, added Python enrichment, and tuned alerts until the SOC queue contained signal instead of noise.",
    category: "detection-engineering",
    tags: ["wazuh", "siem", "python"],
    is_featured: 0,
    views: 1432,
    published_at: "2026-08-30T06:45:00.000Z",
    cover_image: "/assets/sathish/images/3d/network_cube_3d.jpg",
    content: `A SIEM that forwards everything is a log archive. A SIEM that answers a question is a detection pipeline. The difference is the enrichment and tuning layer between ingestion and the alert queue.

## Architecture

\`\`\`text
Apache / auth.log / auditd
        │
        ▼
   Wazuh agent  ──►  Wazuh manager  ──►  Indexer
                              │
                              ▼
                    Python enrichment
                              │
                              ▼
                    Alert + ticket queue
\`\`\`

## Ingestion rules that stay readable

Keep custom rules in their own file and give every rule an explicit tag. Future-you needs to know why a rule exists.

\`\`\`xml
<group name="web,apache,">
  <rule id="100210" level="8">
    <if_sid>31100</if_sid>
    <match>\\.env</match>
    <description>Probe for exposed environment file</description>
    <mitre><id>T1595</id></mitre>
  </rule>
</group>
\`\`\`

## Enrichment: add context, not volume

The enrichment script does three things: resolves the source IP to an ASN, attaches the request path, and tags known scanner user-agents. It deliberately does **not** call a reputation API on every event — that turns a cheap pipeline into a rate-limit problem.

\`\`\`python
def enrich(event: dict) -> dict:
    event["asset"] = event.get("agent", {}).get("name", "unknown")
    event["path"] = parse_path(event.get("full_log", ""))
    event["scanner"] = classify_scanner(event.get("full_log", ""))
    return event
\`\`\`

## Tune with a feedback loop

Every alert reviewed by an analyst should produce one of three outcomes: close, escalate, or change the rule. If a week goes by without a rule change, the queue is probably being ignored.

- Track false-positive rate per rule, not overall.
- Cap noisy rules at a lower level and aggregate in a dashboard.
- Delete rules nobody can explain.

## What good looks like

The queue should be small enough to read, specific enough to act on, and boring enough that a real intrusion stands out. Detection engineering is mostly the discipline of removing things, not adding them.`,
  },
  {
    title: "Active Directory Attack Paths: From Kerberoasting to Domain Admin",
    slug: "active-directory-kerberoasting-to-domain-admin",
    excerpt:
      "A lab walkthrough of the identity misconfigurations that chain together into domain compromise — and the controls that break each link.",
    category: "offensive-security",
    tags: ["active-directory", "kerberos"],
    is_featured: 0,
    views: 3208,
    published_at: "2026-07-14T09:15:00.000Z",
    cover_image: "/assets/sathish/images/3d/cyber_shield_3d.jpg",
    content: `Active Directory assessments are rarely about a single exploit. They are about a chain of small trust decisions: a service account with an old password, a workstation where a privileged user signed in, a share that exposes a script with credentials.

## The chain in a lab

I use a three-host lab: a domain controller, a member server, and a workstation. No defensive tooling at first, then Defender and auditing enabled for the second pass.

\`\`\`powershell
# Enumerate accounts with a service principal name
Get-ADUser -Filter { ServicePrincipalName -ne "$null" } \\
  -Properties ServicePrincipalName, PasswordLastSet |
  Select-Object Name, ServicePrincipalName, PasswordLastSet
\`\`\`

Kerberoasting targets the weaker half of that list: accounts with an SPN and a password that has not rotated in years. The ticket is requested as a normal authenticated user; cracking happens offline. Nothing alerts because nothing failed.

## Where the path usually continues

1. **Local admin reuse.** The same local administrator password on every workstation turns one host into a credential-harvesting platform.
2. **Unconstrained delegation.** A compromised host trusted for delegation can impersonate users who authenticate to it.
3. **Writable ACLs.** \`GenericWrite\` on a user object allows a targeted kerberoast; \`WriteDACL\` on a group allows membership changes.

## Break the links

| Link | Control |
| --- | --- |
| Weak service passwords | 25+ character managed service accounts, rotation |
| Local admin reuse | LAPS or a password solution with unique per-host values |
| Unconstrained delegation | Remove it; use constrained or resource-based delegation |
| Over-permissive ACLs | Quarterly access review with attack-path tooling |
| Credential exposure on hosts | Credential Guard, tiered admin model |

## Report the chain, not the trick

A finding that says "Kerberoastable account" invites a password reset and nothing else. A finding that shows the path from an unprivileged user to domain admin, with each hop evidenced, forces a design conversation. That is the difference between a checklist and an assessment.`,
  },
  {
    title: "From CTF to Client Report: Writing Findings That Actually Get Fixed",
    slug: "ctf-to-client-report-writing-findings",
    excerpt:
      "Technical accuracy is table stakes. The reports that change engineering behaviour share five habits — and none of them are about prettier screenshots.",
    category: "career-mentorship",
    tags: ["reporting", "career", "ctf"],
    is_featured: 0,
    views: 987,
    published_at: "2026-06-08T11:20:00.000Z",
    cover_image: "/assets/sathish/images/3d/terminal_chip_3d.jpg",
    content: `The first report I wrote as a junior was 42 pages long. The client fixed two findings. The second report was nine pages and everything was remediated within a sprint. The difference was not the depth of testing — it was the shape of the argument.

## 1. Lead with the decision

Every finding should answer: what can an attacker do, who is affected, and what is the smallest change that removes the capability? Put that in the first three lines.

## 2. Separate severity from effort

A critical finding with a one-line fix belongs at the top of the backlog. A low finding that requires an architecture change should not be smuggled into the same list. Use a consistent rating method and show your reasoning.

## 3. Reproduce without ambiguity

\`\`\`text
Preconditions: authenticated user, standard role
Steps:
  1. Open /account/settings
  2. Change the email field to victim@example.com
  3. Submit; observe 200 OK and the victim address stored
Expected: ownership verification required
Actual: change accepted immediately
\`\`\`

If a developer cannot reproduce it in five minutes, they will not fix it.

## 4. Respect the reader

Short sentences. No tool-output dumps in the body. Put raw evidence in an appendix and link to it. Define acronyms once.

## 5. Close the loop

Offer a retest window and a short remediation call. The goal is not to be right in public; it is to leave the system harder to break.

> A finding is not a trophy. It is a request for a change in behaviour, backed by evidence.

## Mentorship takeaway

When I teach students, I ask them to rewrite one finding for three audiences: an engineer, a manager, and a non-technical executive. If the same vulnerability sounds like three different problems, the understanding is not there yet.`,
  },
  {
    title: "Securing a React + Vite Portfolio: Lessons from Shipping a Blog",
    slug: "securing-react-vite-portfolio-blog",
    excerpt:
      "Adding a database-backed blog to a static portfolio forced a series of security decisions. Here are the ones that mattered and the trade-offs behind them.",
    category: "application-security",
    tags: ["react", "vite", "hardening", "web-security"],
    is_featured: 0,
    views: 654,
    published_at: "2026-11-02T08:05:00.000Z",
    cover_image: "/assets/sathish/images/3d/radar_telemetry_3d.jpg",
    content: `A static portfolio is a low-risk target: no database, no session, nothing to write to. Adding a blog changes that. Suddenly there is an editor, an upload path, and content that other people read. These are the decisions I made while extending the existing site.

## Keep the public surface read-only

The public API only reads published content. Creating, editing, and deleting live behind an authenticated admin surface with server-side checks. Hiding a button is not authorisation.

## Treat uploaded files as hostile

\`\`\`js
// Validate the bytes, not just the extension
const magic = { png: "89504e47", jpeg: "ffd8ff", gif: "47494638" };
const head = buffer.subarray(0, 4).toString("hex");
if (!head.startsWith(magic.png)) throw new Error("Not a PNG");
\`\`\`

Files are renamed, served with \`X-Content-Type-Options: nosniff\`, and never executed. A rejected upload produces a clear error instead of silently storing something unexpected.

## Render Markdown without trusting it

Markdown can contain raw HTML. The renderer here escapes HTML first and then applies a small, explicit set of formatting rules. No \`innerHTML\` for user content, no remote script, no event handlers.

## Sessions that expire

- \`HttpOnly\` cookie, \`SameSite=Strict\`, \`Secure\` in production.
- Random 256-bit token, only its SHA-256 hash stored server-side.
- A CSRF token required for every state-changing request.
- Rate limits on login and writes.

## Be honest about the deployment

The portfolio is hosted on GitHub Pages, which serves static files. The API needs a Node host. Setting \`VITE_API_BASE_URL\` lets the same frontend talk to a separately deployed API, while local development mounts the API directly into Vite. That trade-off is documented rather than hidden.

## What I would do next

Add structured audit logs for every admin action, and move the static sitemap/RSS export into the publish pipeline. Security work is never finished; it is just visible enough to be reviewed.`,
  },
];
